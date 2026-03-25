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
  if (order.status !== "collected") {
    return NextResponse.json({ error: "Order must be in collected status" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: { status: "out_for_delivery" },
    });

    await tx.orderAudit.create({
      data: {
        orderId: id,
        previousStatus: "collected",
        newStatus: "out_for_delivery",
        actorId: session.user.id,
        actorType: "driver",
        metadata: { action: "out_for_delivery" },
      },
    });
  });

  return NextResponse.json({ orderId: id, status: "out_for_delivery" });
}
