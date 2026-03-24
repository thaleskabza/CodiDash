import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const QuerySchema = z.object({
  status: z.string().optional(),
  storeId: z.string().optional(),
  driverId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
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

  const { status, storeId, driverId, from, to, page, pageSize } = parsed.data;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (storeId) where.storeId = storeId;
  if (driverId) where.driverId = driverId;
  if (from || to) {
    where.createdAt = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        store: { select: { name: true } },
        driver: { include: { user: { select: { name: true } } } },
        payment: { select: { status: true, amount: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    data: orders.map((o: typeof orders[number]) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      storeName: o.store.name,
      driverName: o.driver?.user.name ?? null,
      itemCount: o._count.items,
      deliveryFee: o.deliveryFee,
      paymentStatus: o.payment?.status ?? null,
      amountCharged: o.payment?.amount ?? null,
      createdAt: o.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
