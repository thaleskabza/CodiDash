import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateQR, signPayload, isExpired } from "@/lib/qr";

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

  // If QR is still valid, return it directly
  if (order.qrPayload && order.qrExpiresAt && !isExpired(order.qrExpiresAt)) {
    const qrImage = await generateQR(order.qrPayload);
    return NextResponse.json({
      qrPayload: qrImage,
      qrData: JSON.parse(order.qrPayload),
      expiresAt: order.qrExpiresAt.toISOString(),
    });
  }

  // Regenerate expired QR
  const qrExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const qrData = { oid: order.orderNumber, ts: Math.floor(Date.now() / 1000) };
  const sig = signPayload(qrData);
  const qrPayloadData = { ...qrData, sig };
  const qrPayloadStr = JSON.stringify(qrPayloadData);
  const qrImage = await generateQR(qrPayloadStr);

  await prisma.order.update({
    where: { id },
    data: { qrPayload: qrPayloadStr, qrExpiresAt },
  });

  return NextResponse.json({
    qrPayload: qrImage,
    qrData: qrPayloadData,
    expiresAt: qrExpiresAt.toISOString(),
  });
}
