import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; itemId: string }> };

const Schema = z.object({
  voucherStatus: z.enum(["invalid", "valid"]),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "driver") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });

  const { id, itemId } = await params;

  // Verify driver is assigned to this order
  const order = await prisma.order.findFirst({
    where: { id, driverId: driver.id },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const orderItem = await prisma.orderItem.findFirst({
    where: { id: itemId, orderId: id },
  });
  if (!orderItem) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 422 });
  }

  const { voucherStatus } = parsed.data;

  const replacementDeadline =
    voucherStatus === "invalid" ? new Date(Date.now() + 5 * 60 * 1000) : null;

  const updated = await prisma.orderItem.update({
    where: { id: itemId },
    data: {
      voucherStatus,
      replacementDeadline,
    },
    select: { id: true, voucherStatus: true, replacementDeadline: true },
  });

  return NextResponse.json({ item: updated });
}
