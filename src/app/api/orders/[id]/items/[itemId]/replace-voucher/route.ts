import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; itemId: string }> };

const Schema = z
  .object({
    voucherCode: z.string().min(1).optional(),
    voucherImageUrl: z.string().url().optional(),
  })
  .refine((d) => !!(d.voucherCode || d.voucherImageUrl), {
    message: "Provide voucherCode or voucherImageUrl",
  });

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "customer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, itemId } = await params;

  const order = await prisma.order.findFirst({
    where: { id, customerId: session.user.id },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const orderItem = await prisma.orderItem.findFirst({
    where: { id: itemId, orderId: id, voucherStatus: "invalid" },
  });
  if (!orderItem) return NextResponse.json({ error: "Item not found or not in invalid state" }, { status: 404 });

  // Check deadline
  if (!orderItem.replacementDeadline || orderItem.replacementDeadline < new Date()) {
    return NextResponse.json({ error: "Replacement deadline has expired" }, { status: 410 });
  }

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten() }, { status: 422 });
  }

  const updated = await prisma.orderItem.update({
    where: { id: itemId },
    data: {
      voucherStatus: "replaced",
      voucherCode: parsed.data.voucherCode ?? orderItem.voucherCode,
      voucherImageUrl: parsed.data.voucherImageUrl ?? orderItem.voucherImageUrl,
    },
    select: { id: true, voucherStatus: true, voucherCode: true, voucherImageUrl: true },
  });

  return NextResponse.json({ item: updated });
}
