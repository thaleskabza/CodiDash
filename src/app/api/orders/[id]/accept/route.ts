import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { broadcastOrderClaimed } from "@/lib/dispatch";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "driver") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driver || driver.status !== "available") {
    return NextResponse.json({ error: "Driver must be available to accept orders" }, { status: 403 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "pending_driver") {
    return NextResponse.json({ error: "Order is no longer available" }, { status: 409 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // Atomic claim — re-check inside transaction
      const fresh = await tx.order.findUnique({ where: { id } });
      if (!fresh || fresh.status !== "pending_driver") {
        throw new Error("ALREADY_CLAIMED");
      }

      const o = await tx.order.update({
        where: { id },
        data: { status: "driver_assigned", driverId: driver.id },
        select: { id: true, status: true, driverId: true },
      });

      await tx.driver.update({ where: { id: driver.id }, data: { status: "busy", currentOrderId: id } });

      await tx.orderAudit.create({
        data: {
          orderId: id,
          previousStatus: "pending_driver",
          newStatus: "driver_assigned",
          actorId: session.user.id,
          actorType: "driver",
        },
      });

      return o;
    });

    // Fire-and-forget: tell all other drivers this order is taken
    broadcastOrderClaimed(updated.id, driver.id).catch((e) =>
      console.error("[dispatch] broadcastOrderClaimed failed:", e),
    );

    return NextResponse.json({ orderId: updated.id, status: updated.status, driverId: updated.driverId });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "ALREADY_CLAIMED") {
      return NextResponse.json({ error: "Order already claimed by another driver" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
