import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifySignature, isExpired } from "@/lib/qr";
import { chargeToken } from "@/lib/payfast";

type Params = { params: Promise<{ id: string }> };

const ScanSchema = z.object({
  qrData: z.object({
    oid: z.string(),
    ts: z.number(),
    sig: z.string(),
  }),
});

// Payment split constants (in cents)
const SPLITS: Record<number, { driver: number; platform: number }> = {
  3500: { driver: 2000, platform: 1500 },
  4500: { driver: 2571, platform: 1929 },
};

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "driver") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });

  const { id } = await params;
  const body = await req.json();
  const parsed = ScanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { qrData } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { payment: true },
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.driverId !== driver.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (order.status !== "in_transit") {
    return NextResponse.json({ error: "Order is not in_transit" }, { status: 409 });
  }

  // Validate QR expiry
  if (!order.qrExpiresAt || isExpired(order.qrExpiresAt)) {
    return NextResponse.json({ error: "QR code has expired" }, { status: 400 });
  }

  // Validate QR signature
  const { sig, ...payloadWithoutSig } = qrData;
  if (!verifySignature(payloadWithoutSig, sig)) {
    return NextResponse.json({ error: "Invalid QR code signature" }, { status: 400 });
  }

  // Verify oid matches order
  if (qrData.oid !== order.orderNumber) {
    return NextResponse.json({ error: "QR code does not match this order" }, { status: 400 });
  }

  // Charge payment
  const chargeResult = await chargeToken({
    token: order.paymentToken ?? "",
    amount: order.deliveryFee,
    orderId: order.id,
  });

  const split = SPLITS[order.deliveryFee] ?? { driver: Math.floor(order.deliveryFee * 0.57), platform: Math.ceil(order.deliveryFee * 0.43) };

  if (!chargeResult.success) {
    // Payment failed — move to payment_pending
    await prisma.$transaction(async (tx: typeof prisma) => {
      await tx.order.update({ where: { id }, data: { status: "payment_pending" } });
      if (order.payment) {
        await tx.payment.update({
          where: { id: order.payment.id },
          data: { status: "failed", failureReason: chargeResult.error ?? "Unknown" },
        });
      }
      await tx.orderAudit.create({
        data: {
          orderId: id,
          previousStatus: "in_transit",
          newStatus: "payment_pending",
          actorType: "system",
          metadata: { error: chargeResult.error },
        },
      });
    });
    return NextResponse.json({ error: "Payment failed. Order moved to payment_pending." }, { status: 402 });
  }

  // Success — deliver and record payment
  const result = await prisma.$transaction(async (tx: typeof prisma) => {
    const updatedOrder = await tx.order.update({
      where: { id },
      data: { status: "delivered" },
      select: { id: true, status: true },
    });

    await tx.payment.upsert({
      where: { orderId: id },
      create: {
        orderId: id,
        amount: order.deliveryFee,
        driverAmount: split.driver,
        platformAmount: split.platform,
        status: "captured",
        payfastToken: order.paymentToken,
        payfastPaymentId: chargeResult.paymentId,
      },
      update: {
        status: "captured",
        payfastPaymentId: chargeResult.paymentId,
      },
    });

    await tx.driver.update({ where: { id: driver.id }, data: { status: "available" } });

    await tx.orderAudit.create({
      data: {
        orderId: id,
        previousStatus: "in_transit",
        newStatus: "delivered",
        actorId: session.user.id,
        actorType: "driver",
        metadata: { amountCharged: order.deliveryFee, paymentId: chargeResult.paymentId },
      },
    });

    return updatedOrder;
  });

  return NextResponse.json({
    orderId: result.id,
    status: result.status,
    paymentStatus: "captured",
    amountCharged: order.deliveryFee,
  });
}
