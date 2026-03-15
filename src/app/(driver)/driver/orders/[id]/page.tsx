import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActiveOrderClient } from "./ActiveOrderClient";

interface Props {
  params: { id: string };
}

export default async function ActiveOrderPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/driver/login");

  const driver = await prisma.driver.findUnique({
    where: { userId: session.user.id },
  });
  if (!driver) redirect("/driver/login");

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      store: true,
      address: true,
      items: true,
    },
  });

  if (!order || order.driverId !== driver.id) notFound();

  // Serialise decimals for the client
  const serialised = {
    id: order.id,
    status: order.status,
    storeLatitude: Number(order.store.latitude),
    storeLongitude: Number(order.store.longitude),
    storeName: order.store.name,
    storeAddress: order.store.address,
    deliveryAddress: order.address.formattedAddress,
    items: order.items.map((item) => ({
      id: item.id,
      smoothieItem: item.smoothieItem,
      voucherCode: item.voucherCode,
      voucherStatus: item.voucherStatus,
      replacementDeadline: item.replacementDeadline?.toISOString() ?? null,
    })),
  };

  return <ActiveOrderClient orderId={order.id} order={serialised} />;
}
