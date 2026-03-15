import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      store: { select: { id: true, name: true, address: true, latitude: true, longitude: true } },
      deliveryAddress: { select: { address: true, latitude: true, longitude: true } },
      driver: {
        include: { user: { select: { name: true } } },
      },
      items: true,
      payment: { select: { status: true, amount: true, driverAmount: true, platformAmount: true } },
      auditLogs: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Access control — customers see their own, drivers see assigned, admins see all
  const isOwner = order.customerId === session.user.id;
  const isAssignedDriver =
    session.user.role === "driver" &&
    order.driver?.user &&
    order.driverId !== null;
  const isAdmin = session.user.role === "admin";

  if (!isOwner && !isAssignedDriver && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ order });
}
