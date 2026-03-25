import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifySignature, isExpired } from "@/lib/qr";
import { chargeToken } from "@/lib/payfast";

type Params = { params: Promise<{ id: string }> };

const QRDataSchema = z.object({
  orderId: z.string(),
  timestamp: z.number(),
  nonce: z.string(),
  signature: z.string(),
});

const CompleteDeliverySchema = z.object({
  qrData: QRDataSchema,
});

/** Driver share per delivery fee tier (in cents) */
function driverShare(deliveryFee: number): number {
  if (deliveryFee === 3500) return 2000; // R35 → R20 driver
  if (deliveryFee === 4500) return 2500; // R45 → R25 driver
  return Math.round(deliveryFee * 0.57);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "driver") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });

  const body = await req.json();
  const parsed = CompleteDeliverySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { qrData } = parsed.data;
  const { id } = await params;

  // Validate QR signature
  if (!verifySignature(qrData)) {
    return NextResponse.json({ error: "QR_INVALID", message: "Invalid QR signature" }, { status: 400 });
  }

  // Validate QR expiry
  if (isExpired(qrData.timestamp)) {
    return NextResponse.json({ error: "QR_EXPIRED", message: "QR code has expired" }, { status: 400 });
  }

  // Validate QR belongs to this order
  if (qrData.orderId !== id) {
    return NextResponse.json({ error: "QR_MISMATCH", message: "QR code does not match this order" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { take: 1 } },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.driverId !== driver.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (order.status !== "out_for_delivery") {
    return NextResponse.json({ error: "Order must be in out_for_delivery status" }, { status: 409 });
  }

  const isSandbox = process.env.PAYFAST_SANDBOX === "true";
  const itemName = order.items[0]?.smoothieItem ?? "CodiDash Delivery";
  const earning = driverShare(order.deliveryFee);
  const platformAmount = order.deliveryFee - earning;

  let chargeResult: { success: boolean; payfastPaymentId?: string; error?: string };
  let chargeTokenValue: string | null = null;

  if (isSandbox) {
    // In sandbox mode skip real payment — mock a successful charge
    chargeResult = { success: true, payfastPaymentId: `sandbox-${Date.now()}` };
    chargeTokenValue = "sandbox-mock";
  } else {
    // Get customer's default payment card token
    const defaultCard = await prisma.paymentCard.findFirst({
      where: { userId: order.customerId, isDefault: true },
    });

    // Fall back to order-level token if no card on file
    chargeTokenValue = defaultCard?.token ?? order.paymentToken;
    if (!chargeTokenValue) {
      return NextResponse.json({ error: "NO_PAYMENT_TOKEN", message: "No payment token available for this order" }, { status: 402 });
    }

    // Attempt payment charge
    chargeResult = await chargeToken({
      token: chargeTokenValue,
      amount: order.deliveryFee,
      orderId: order.orderNumber,
      itemName,
    });
  }

  if (!chargeResult.success) {
    // Payment failed — move order to payment_pending, write audit
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id }, data: { status: "payment_pending" } });

      await tx.payment.upsert({
        where: { orderId: id },
        create: {
          orderId: id,
          amount: order.deliveryFee,
          driverAmount: earning,
          platformAmount,
          status: "failed",
          payfastToken: chargeTokenValue!,
          failureReason: chargeResult.error ?? "Payment charge failed",
        },
        update: {
          status: "failed",
          failureReason: chargeResult.error ?? "Payment charge failed",
        },
      });

      await tx.orderAudit.create({
        data: {
          orderId: id,
          previousStatus: "out_for_delivery",
          newStatus: "payment_pending",
          actorId: session.user.id,
          actorType: "driver",
          metadata: { action: "delivery_payment_failed", reason: chargeResult.error },
        },
      });
    });

    return NextResponse.json({ error: "PAYMENT_FAILED", message: chargeResult.error }, { status: 402 });
  }

  // Payment succeeded — atomically complete the delivery
  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id }, data: { status: "delivered" } });

    await tx.driverEarning.create({
      data: {
        driverId: driver.id,
        orderId: id,
        amount: earning,
        status: "accrued",
      },
    });

    await tx.payment.upsert({
      where: { orderId: id },
      create: {
        orderId: id,
        amount: order.deliveryFee,
        driverAmount: earning,
        platformAmount,
        status: "captured",
        payfastToken: chargeTokenValue,
        payfastPaymentId: chargeResult.payfastPaymentId ?? null,
      },
      update: {
        status: "captured",
        payfastPaymentId: chargeResult.payfastPaymentId ?? null,
      },
    });

    await tx.driver.update({
      where: { id: driver.id },
      data: { status: "available", currentOrderId: null },
    });

    await tx.orderAudit.create({
      data: {
        orderId: id,
        previousStatus: "out_for_delivery",
        newStatus: "delivered",
        actorId: session.user.id,
        actorType: "driver",
        metadata: { action: "delivery_completed", payfastPaymentId: chargeResult.payfastPaymentId },
      },
    });
  });

  return NextResponse.json({
    status: "delivered",
    paymentStatus: "captured",
    amountCharged: order.deliveryFee,
    driverEarning: earning,
  });
}
