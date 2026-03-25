import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Returns all pending_driver orders for the driver dashboard initial load.
 * Drivers see these on page open so they don't miss orders that were broadcast
 * before they opened the dashboard.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "driver") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const orders = await prisma.order.findMany({
    where: { status: "pending_driver" },
    include: {
      store: { select: { name: true, address: true } },
      items: { select: { smoothieItem: true, voucherCode: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      storeName: o.store.name,
      storeAddress: o.store.address,
      itemName: o.items[0]?.smoothieItem ?? null,
      items: o.items.map((i) => ({ smoothieItem: i.smoothieItem, voucherCode: i.voucherCode })),
      deliveryFee: o.deliveryFee,
      distanceKm: Number(o.distanceKm),
    })),
  });
}
