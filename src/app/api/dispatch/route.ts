import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { calculateDistance } from "@/lib/geo";
import { createClient } from "@supabase/supabase-js";

const BroadcastSchema = z.object({
  orderId: z.string().uuid(),
  storeId: z.string().uuid(),
  tier: z.enum(["ideal", "acceptable"]).default("ideal"),
});

// Tier radius in km
const TIER_RADIUS = { ideal: 3, acceptable: 4 };

export async function POST(req: NextRequest) {
  // Internal endpoint — validate with a shared secret header
  const secret = req.headers.get("x-internal-secret");
  if (secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = BroadcastSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const { orderId, storeId, tier } = parsed.data;

  const [order, store, availableDrivers] = await Promise.all([
    prisma.order.findUnique({ where: { id: orderId }, include: { items: true, store: true } }),
    prisma.store.findUnique({ where: { id: storeId } }),
    prisma.driver.findMany({
      where: { status: "available", latitude: { not: null }, longitude: { not: null } },
      include: { user: { select: { id: true } } },
    }),
  ]);

  if (!order || !store) {
    return NextResponse.json({ error: "Order or store not found" }, { status: 404 });
  }

  const radius = TIER_RADIUS[tier];
  const nearbyDriverIds: string[] = [];

  for (const driver of availableDrivers) {
    if (!driver.latitude || !driver.longitude) continue;
    const dist = calculateDistance(
      { latitude: Number(store.latitude), longitude: Number(store.longitude) },
      { latitude: Number(driver.latitude), longitude: Number(driver.longitude) },
    );
    if (dist <= radius) {
      nearbyDriverIds.push(driver.id);
    }
  }

  if (nearbyDriverIds.length === 0) {
    return NextResponse.json({ broadcasted: 0, tier, message: "No drivers in range" });
  }

  // Broadcast via Supabase Realtime to each driver
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY !== "FILL_IN_LATER"
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseKey);

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

  return NextResponse.json({ broadcasted: nearbyDriverIds.length, tier });
}
