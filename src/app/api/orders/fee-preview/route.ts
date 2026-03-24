import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDistance, getDeliveryTier } from "@/lib/geo";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("storeId");
  const addressId = searchParams.get("addressId");

  if (!storeId || !addressId) {
    return NextResponse.json({ error: "storeId and addressId required" }, { status: 400 });
  }

  const [store, address] = await Promise.all([
    prisma.store.findUnique({ where: { id: storeId, isActive: true } }),
    prisma.deliveryAddress.findFirst({
      where: { id: addressId, userId: session.user.id },
    }),
  ]);

  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });
  if (!address) return NextResponse.json({ error: "Address not found" }, { status: 404 });

  const distanceKm = calculateDistance(
    { latitude: Number(store.latitude), longitude: Number(store.longitude) },
    { latitude: Number(address.latitude), longitude: Number(address.longitude) },
  );

  const tier = getDeliveryTier(distanceKm);
  if (!tier) {
    return NextResponse.json(
      { error: "Address is outside the 10km delivery area." },
      { status: 422 },
    );
  }

  return NextResponse.json({ fee: tier.fee, distanceKm, tier: tier.tier });
}
