import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyITN } from "@/lib/payfast";
import type { PayFastITNPayload } from "@/lib/payfast";

// PayFast live IP ranges
const PAYFAST_IPS = [
  "197.97.145.144",
  "197.97.145.145",
  "197.97.145.146",
  "197.97.145.147",
  // Allow localhost in sandbox/dev
  "127.0.0.1",
  "::1",
];

export async function POST(req: NextRequest) {
  // 1. IP whitelist check
  const forwarded = req.headers.get("x-forwarded-for");
  const sourceIp = forwarded ? forwarded.split(",")[0].trim() : "unknown";

  if (process.env.PAYFAST_SANDBOX !== "true" && !PAYFAST_IPS.includes(sourceIp)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2. Parse form body
  const rawBody = await req.text();
  const params = new URLSearchParams(rawBody);
  const payload: PayFastITNPayload = {} as PayFastITNPayload;
  for (const [key, value] of params.entries()) {
    payload[key] = value;
  }

  // 3. Verify ITN
  const { valid, error: itnError } = await verifyITN(payload, rawBody, sourceIp);
  if (!valid) {
    console.error("PayFast ITN verification failed:", itnError);
    return NextResponse.json({ error: "Invalid ITN" }, { status: 400 });
  }

  // 4. Process payment status
  const orderId = payload.m_payment_id;
  const payfastPaymentId = payload.pf_payment_id;
  const paymentStatus = payload.payment_status;
  const token = payload.token;

  if (!orderId) {
    return NextResponse.json({ error: "Missing m_payment_id" }, { status: 400 });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (paymentStatus === "COMPLETE") {
      // Store token for future ad-hoc charges
      if (token) {
        await prisma.order.update({
          where: { id: orderId },
          data: { paymentToken: token },
        });
      }

      // Update payment record if exists
      if (order.payment) {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: {
            status: "captured",
            payfastPaymentId,
          },
        });
      }

      await prisma.orderAudit.create({
        data: {
          orderId,
          previousStatus: order.status,
          newStatus: order.status,
          actorType: "system",
          metadata: {
            event: "payfast_itn",
            payfastPaymentId,
            token: token ? "stored" : "none",
          },
        },
      });
    } else if (paymentStatus === "CANCELLED") {
      if (order.payment) {
        await prisma.payment.update({
          where: { id: order.payment.id },
          data: { status: "failed" },
        });
      }
    }

    // PayFast expects a 200 OK with empty body
    return new NextResponse(null, { status: 200 });
  } catch (err) {
    console.error("ITN processing error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
