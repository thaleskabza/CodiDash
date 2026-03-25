import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "driver") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.driverId !== driver.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (order.status !== "driver_assigned") {
    return NextResponse.json({ error: "Order must be in driver_assigned status" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: { status: "driver_at_store" },
    });

    await tx.orderAudit.create({
      data: {
        orderId: id,
        previousStatus: "driver_assigned",
        newStatus: "driver_at_store",
        actorId: session.user.id,
        actorType: "driver",
        metadata: { action: "driver_arrived_store" },
      },
    });
  });

  return NextResponse.json({ orderId: id, status: "driver_at_store" });
}
