import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chargeToken } from "@/lib/payfast";
import type { PayFastChargeParams } from "@/lib/payfast";

// Fee splits in cents
const SPLITS: Record<number, { driverAmount: number; platformAmount: number }> = {
  3500: { driverAmount: 2000, platformAmount: 1500 },
  4500: { driverAmount: 2571, platformAmount: 1929 },
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await req.json() as { orderId: string };
  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Only the customer who placed the order can retry
  if (order.customerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (order.status !== "payment_pending") {
    return NextResponse.json(
      { error: "Order is not in payment_pending state" },
      { status: 422 },
    );
  }

  if (!order.payfastToken) {
    return NextResponse.json({ error: "No payment token stored for this order" }, { status: 422 });
  }

  const chargeParams: PayFastChargeParams = {
    token: order.payfastToken,
    amount: order.deliveryFee,
    orderId: order.id,
    itemName: `CodiDash Delivery - Order ${order.orderNumber}`,
  };

  const chargeResult = await chargeToken(chargeParams);

  if (!chargeResult.success) {
    return NextResponse.json(
      { error: "Payment retry failed. Please try again or contact support." },
      { status: 402 },
    );
  }

  const split = SPLITS[order.deliveryFee] ?? {
    driverAmount: Math.round(order.deliveryFee * 0.571),
    platformAmount: Math.round(order.deliveryFee * 0.429),
  };

  await prisma.$transaction(async (tx: typeof prisma) => {
    // Update or create payment record
    if (order.payment) {
      await tx.payment.update({
        where: { id: order.payment.id },
        data: {
          status: "completed",
          payfastPaymentId: chargeResult.payfastPaymentId,
          amountCharged: order.deliveryFee,
          driverAmount: split.driverAmount,
          platformAmount: split.platformAmount,
        },
      });
    } else {
      await tx.payment.create({
        data: {
          orderId: order.id,
          status: "completed",
          payfastPaymentId: chargeResult.payfastPaymentId,
          amountCharged: order.deliveryFee,
          driverAmount: split.driverAmount,
          platformAmount: split.platformAmount,
        },
      });
    }

    // Update order status to delivered
    await tx.order.update({
      where: { id: order.id },
      data: { status: "delivered" },
    });

    await tx.orderAudit.create({
      data: {
        orderId: order.id,
        previousStatus: "payment_pending",
        newStatus: "delivered",
        actorType: "system",
        metadata: { event: "payment_retry_success", payfastPaymentId: chargeResult.payfastPaymentId },
      },
    });
  });

  return NextResponse.json({ success: true });
}
