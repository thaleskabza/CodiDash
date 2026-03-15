import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const QuerySchema = z.object({
  status: z.string().optional(),
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

  const { status, page, pageSize } = parsed.data;
  const where = status ? { status } : {};

  const [total, drivers] = await prisma.$transaction([
    prisma.driver.count({ where }),
    prisma.driver.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, createdAt: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { user: { createdAt: "desc" } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    data: drivers.map((d) => ({
      id: d.id,
      name: d.user.name,
      email: d.user.email,
      status: d.status,
      rating: Number(d.rating),
      cancellationCount: d.cancellationCount,
      deliveryCount: d._count.orders,
      joinedAt: d.user.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
