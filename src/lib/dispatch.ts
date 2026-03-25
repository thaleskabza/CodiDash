import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { calculateDistance } from "@/lib/geo";

const TIER_RADIUS = { ideal: 3, acceptable: 4 } as const;

function getSupabaseAdmin() {
  // Service role key is required for server-side Realtime broadcasts.
  // Falls back to anon key in development if service role key is not configured.
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== "FILL_IN_LATER"
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

/**
 * Broadcast a newly-created order to nearby available drivers.
 * Tries the ideal radius (3 km) first, then falls back to acceptable (4 km).
 * Uses driver.id (not user.id) to match what DriverDashboardClient subscribes to.
 */
export async function dispatchOrder(
  orderId: string,
): Promise<{ broadcasted: number; tier: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, store: true },
  });

  if (!order) throw new Error(`Order ${orderId} not found`);

  const store = order.store;
  console.log(`[dispatch] order ${order.orderNumber} | store: ${store.name} (${store.latitude}, ${store.longitude})`);

  const availableDrivers = await prisma.driver.findMany({
    where: { status: "available", latitude: { not: null }, longitude: { not: null } },
  });
  console.log(`[dispatch] available drivers with location: ${availableDrivers.length}`);

  for (const tier of ["ideal", "acceptable"] as const) {
    const radius = TIER_RADIUS[tier];
    const nearbyDriverIds: string[] = [];

    for (const driver of availableDrivers) {
      if (!driver.latitude || !driver.longitude) continue;
      const dist = calculateDistance(
        { latitude: Number(store.latitude), longitude: Number(store.longitude) },
        { latitude: Number(driver.latitude), longitude: Number(driver.longitude) },
      );
      console.log(`[dispatch]   driver ${driver.id} dist=${dist.toFixed(2)}km (radius=${radius}km)`);
      if (dist <= radius) {
        // Use driver.id — this is what DriverDashboardClient subscribes on
        nearbyDriverIds.push(driver.id);
      }
    }

    console.log(`[dispatch] tier=${tier} nearby=${nearbyDriverIds.length}`);
    if (nearbyDriverIds.length === 0) continue;

    const orderPayload = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      storeName: store.name,
      storeAddress: store.address,
      items: order.items.map((i) => ({
        smoothieItem: i.smoothieItem,
        voucherCode: i.voucherCode,
      })),
      deliveryFee: order.deliveryFee,
      distanceKm: Number(order.distanceKm),
    };

    // Broadcast to all nearby drivers in parallel, each with its own client
    await Promise.all(
      nearbyDriverIds.map(async (driverId) => {
        // Fresh client per driver avoids shared-connection limits
        const client = getSupabaseAdmin();
        const channel = client.channel(`driver-broadcasts:${driverId}`);

        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error(`subscribe timeout for driver ${driverId}`)),
            5_000,
          );
          channel.subscribe((status) => {
            clearTimeout(timer);
            if (status === "SUBSCRIBED") resolve();
            else reject(new Error(`channel status ${status} for driver ${driverId}`));
          });
        });

        await channel.send({
          type: "broadcast",
          event: "new_order",
          payload: orderPayload,
        });

        await client.removeChannel(channel);
        console.log(`[dispatch] ✓ sent to driver ${driverId}`);
      }),
    );

    return { broadcasted: nearbyDriverIds.length, tier };
  }

  // Last-resort fallback: no drivers within acceptable radius — broadcast to ALL
  // available drivers so the order is never silently dropped.
  const allDriverIds = availableDrivers.map((d) => d.id);
  if (allDriverIds.length === 0) {
    console.log("[dispatch] no available drivers at all");
    return { broadcasted: 0, tier: "none" };
  }

  console.log(`[dispatch] fallback — broadcasting to all ${allDriverIds.length} available driver(s)`);

  const orderPayload = {
    orderId: order.id,
    orderNumber: order.orderNumber,
    storeName: store.name,
    storeAddress: store.address,
    items: order.items.map((i) => ({
      smoothieItem: i.smoothieItem,
      voucherCode: i.voucherCode,
    })),
    deliveryFee: order.deliveryFee,
    distanceKm: Number(order.distanceKm),
  };

  await Promise.all(
    allDriverIds.map(async (driverId) => {
      const client = getSupabaseAdmin();
      const channel = client.channel(`driver-broadcasts:${driverId}`);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`subscribe timeout for driver ${driverId}`)),
          5_000,
        );
        channel.subscribe((status) => {
          clearTimeout(timer);
          if (status === "SUBSCRIBED") resolve();
          else reject(new Error(`channel status ${status} for driver ${driverId}`));
        });
      });
      await channel.send({ type: "broadcast", event: "new_order", payload: orderPayload });
      await client.removeChannel(channel);
      console.log(`[dispatch] ✓ fallback sent to driver ${driverId}`);
    }),
  );

  return { broadcasted: allDriverIds.length, tier: "fallback" };
}

/**
 * Broadcast to all drivers who received a specific order that it has been claimed.
 * Called after a driver successfully accepts an order, so other drivers remove it from their UI.
 */
export async function broadcastOrderClaimed(
  orderId: string,
  claimingDriverId: string,
): Promise<void> {
  // Find all available drivers (they may still have the order in their UI)
  // plus any driver who was nearby — we broadcast to everyone with a location.
  const drivers = await prisma.driver.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
      id: { not: claimingDriverId },
    },
    select: { id: true },
  });

  if (drivers.length === 0) return;

  const payload = { orderId };

  await Promise.all(
    drivers.map(async (driver) => {
      const client = getSupabaseAdmin();
      const channel = client.channel(`driver-broadcasts:${driver.id}`);

      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => resolve(), 4_000); // best-effort — don't reject
        channel.subscribe((status) => {
          clearTimeout(timer);
          resolve();
        });
      });

      await channel.send({
        type: "broadcast",
        event: "order_claimed",
        payload,
      });

      await client.removeChannel(channel);
    }),
  );

  console.log(`[dispatch] order_claimed broadcast sent to ${drivers.length} driver(s)`);
}
