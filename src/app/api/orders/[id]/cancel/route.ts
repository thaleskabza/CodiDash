import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const CancelSchema = z.object({ reason: z.string().optional() });

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { reason } = CancelSchema.parse(body);

  const order = await prisma.order.findUnique({
    where: { id },
    include: { driver: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const isCustomer = session.user.role === "customer" && order.customerId === session.user.id;
  const isDriver =
    session.user.role === "driver" &&
    order.driver?.userId === session.user.id;

  if (!isCustomer && !isDriver) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Customer can cancel before driver is assigned
  if (isCustomer && order.status !== "pending_driver") {
    return NextResponse.json({ error: "Cannot cancel after driver is assigned" }, { status: 409 });
  }

  // Driver can cancel before delivery (not after in_transit → delivered)
  if (isDriver && !["driver_assigned", "pickup_confirmed"].includes(order.status)) {
    return NextResponse.json({ error: "Cannot cancel at this order stage" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    const previousStatus = order.status;

    if (isDriver) {
      // Increment cancellation count and re-broadcast
      await tx.driver.update({
        where: { id: order.driver!.id },
        data: {
          cancellationCount: { increment: 1 },
          status: "available",
        },
      });
      await tx.order.update({
        where: { id },
        data: { status: "pending_driver", driverId: null, cancelledReason: reason ?? null },
      });
    } else {
      await tx.order.update({
        where: { id },
        data: { status: "cancelled", cancelledReason: reason ?? null },
      });
    }

    await tx.orderAudit.create({
      data: {
        orderId: id,
        previousStatus,
        newStatus: isDriver ? "pending_driver" : "cancelled",
        actorId: session.user.id,
        actorType: session.user.role as "customer" | "driver",
        metadata: reason ? { reason } : undefined,
      },
    });
  });

  return NextResponse.json({ success: true, rebroadcast: isDriver });
}
