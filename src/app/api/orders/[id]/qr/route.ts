import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateQR, isExpired } from "@/lib/qr";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Only the customer who owns the order can get the QR
  const order = await prisma.order.findFirst({
    where: { id, customerId: session.user.id },
    select: { id: true, orderNumber: true, qrPayload: true, qrExpiresAt: true, status: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // If QR is still valid, return cached payload
  if (order.qrPayload && order.qrExpiresAt && !isExpired(order.qrExpiresAt.getTime())) {
    const { qrDataUrl } = await generateQR(order.id);
    return NextResponse.json({
      qrDataUrl,
      qrData: JSON.parse(order.qrPayload),
      expiresAt: order.qrExpiresAt.toISOString(),
    });
  }

  // Regenerate expired QR
  const { qrDataUrl, payload, expiresAt } = await generateQR(order.id);
  const qrPayloadStr = JSON.stringify(payload);

  await prisma.order.update({
    where: { id },
    data: { qrPayload: qrPayloadStr, qrExpiresAt: expiresAt },
  });

  return NextResponse.json({
    qrDataUrl,
    qrData: payload,
    expiresAt: expiresAt.toISOString(),
  });
}
