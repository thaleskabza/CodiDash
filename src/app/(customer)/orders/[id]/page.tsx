import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderTrackingClient } from "./OrderTrackingClient";

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, customerId: session.user.id },
    include: {
      store: { select: { name: true, address: true } },
      items: true,
      driver: { include: { user: { select: { name: true } } } },
      payment: { select: { status: true, amount: true } },
    },
  });

  if (!order) notFound();

  return (
    <OrderTrackingClient
      order={{
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        deliveryFee: order.deliveryFee,
        distanceKm: Number(order.distanceKm),
        storeName: order.store.name,
        storeAddress: order.store.address,
        driverName: order.driver?.user.name ?? null,
        items: order.items.map((i) => ({
          id: i.id,
          smoothieItem: i.smoothieItem,
          voucherStatus: i.voucherStatus,
        })),
        qrPayload: order.qrPayload ?? null,
        qrExpiresAt: order.qrExpiresAt?.toISOString() ?? null,
        paymentStatus: order.payment?.status ?? null,
        createdAt: order.createdAt.toISOString(),
      }}
    />
  );
}
