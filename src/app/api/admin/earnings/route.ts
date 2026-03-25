import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const driverId = searchParams.get("driverId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (driverId) where.driverId = driverId;
  if (status) where.status = status;

  const [earnings, total, totals] = await prisma.$transaction([
    prisma.driverEarning.findMany({
      where,
      include: {
        driver: { include: { user: { select: { name: true } } } },
        order: { select: { orderNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.driverEarning.count({ where }),
    prisma.driverEarning.groupBy({
      by: ["status"],
      orderBy: { status: "asc" },
      _sum: { amount: true },
    }),
  ]);

  const summaryMap: Record<string, number> = {};
  for (const row of totals) {
    summaryMap[row.status] = row._sum?.amount ?? 0;
  }

  return NextResponse.json({
    data: earnings.map((e) => ({
      id: e.id,
      driverId: e.driverId,
      driverName: e.driver.user.name,
      orderId: e.orderId,
      orderNumber: e.order.orderNumber,
      amount: e.amount,
      status: e.status,
      createdAt: e.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    summary: {
      accrued: summaryMap["accrued"] ?? 0,
      payable: summaryMap["payable"] ?? 0,
      paid: summaryMap["paid"] ?? 0,
    },
  });
}
