import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const QuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = QuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries()),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { from, to } = parsed.data;
  const dateFilter = (from || to)
    ? {
        createdAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }
    : {};

  const payments = await prisma.payment.findMany({
    where: {
      status: "captured",
      order: dateFilter,
    },
    include: {
      order: { select: { createdAt: true } },
    },
  });

  type PaymentRow = typeof payments[number];
  const totalAmountCharged = payments.reduce((sum: number, p: PaymentRow) => sum + p.amount, 0);
  const totalDriverPayouts = payments.reduce((sum: number, p: PaymentRow) => sum + p.driverAmount, 0);
  const totalPlatformEarnings = payments.reduce((sum: number, p: PaymentRow) => sum + p.platformAmount, 0);

  // Group by date
  const byDate = new Map<string, { count: number; total: number }>();
  for (const p of payments) {
    const dateKey = p.order.createdAt.toISOString().slice(0, 10);
    const existing = byDate.get(dateKey) ?? { count: 0, total: 0 };
    byDate.set(dateKey, {
      count: existing.count + 1,
      total: existing.total + p.amount,
    });
  }

  const daily = Array.from(byDate.entries())
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    totalAmountCharged,
    totalDriverPayouts,
    totalPlatformEarnings,
    orderCount: payments.length,
    daily,
  });
}
