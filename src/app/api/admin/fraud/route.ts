import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // 1. Orders delivered without a receipt (receiptImageUrl is null)
  const missingReceipt = await prisma.order.findMany({
    where: { status: "delivered", receiptImageUrl: null },
    include: { store: { select: { name: true } }, driver: { include: { user: { select: { name: true } } } } },
    take: 50,
    orderBy: { updatedAt: "desc" },
  });

  // 2. Orders with QR scan anomalies — check audit logs for expired/invalid sig attempts
  const qrAnomalies = await prisma.orderAudit.findMany({
    where: {
      metadata: {
        path: ["event"],
        equals: "qr_scan_failed",
      },
    },
    include: { order: { select: { id: true, orderNumber: true, status: true } } },
    take: 50,
    orderBy: { createdAt: "desc" },
  });

  // 3. Drivers with high cancellation counts (> 3)
  const highCancellations = await prisma.driver.findMany({
    where: { cancellationCount: { gt: 3 } },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { cancellationCount: "desc" },
    take: 20,
  });

  return NextResponse.json({
    missingReceipt: missingReceipt.map((o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      storeName: o.store.name,
      driverName: o.driver?.user.name ?? "Unknown",
      anomalyType: "missing_receipt",
      createdAt: o.createdAt.toISOString(),
    })),
    qrAnomalies: qrAnomalies.map((a) => ({
      orderId: a.orderId,
      orderNumber: a.order.orderNumber,
      anomalyType: "qr_scan_failed",
      createdAt: a.createdAt.toISOString(),
    })),
    highCancellations: highCancellations.map((d) => ({
      driverId: d.id,
      name: d.user.name,
      email: d.user.email,
      cancellationCount: d.cancellationCount,
      anomalyType: "high_cancellations",
    })),
  });
}
