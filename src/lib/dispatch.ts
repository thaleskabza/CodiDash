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

  const availableDrivers = await prisma.driver.findMany({
    where: { status: "available", latitude: { not: null }, longitude: { not: null } },
  });

  for (const tier of ["ideal", "acceptable"] as const) {
    const radius = TIER_RADIUS[tier];
    const nearbyDriverIds: string[] = [];

    for (const driver of availableDrivers) {
      if (!driver.latitude || !driver.longitude) continue;
      const dist = calculateDistance(
        { latitude: Number(store.latitude), longitude: Number(store.longitude) },
        { latitude: Number(driver.latitude), longitude: Number(driver.longitude) },
      );
      if (dist <= radius) {
        // Use driver.id — this is what DriverDashboardClient subscribes on
        nearbyDriverIds.push(driver.id);
      }
    }

    if (nearbyDriverIds.length === 0) continue;

    const supabase = getSupabaseAdmin();
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

    for (const driverId of nearbyDriverIds) {
      await supabase.channel(`driver-broadcasts:${driverId}`).send({
        type: "broadcast",
        event: "new_order",
        payload: orderPayload,
      });
    }

    return { broadcasted: nearbyDriverIds.length, tier };
  }

  return { broadcasted: 0, tier: "none" };
}
