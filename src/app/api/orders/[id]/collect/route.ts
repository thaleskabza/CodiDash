import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const CollectSchema = z.object({
  receiptImageUrl: z.string().url(),
});

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "driver") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });

  const body = await req.json();
  const parsed = CollectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.driverId !== driver.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (order.status !== "driver_at_store") {
    return NextResponse.json({ error: "Order must be in driver_at_store status" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: { status: "collected", receiptImageUrl: parsed.data.receiptImageUrl },
    });

    await tx.orderAudit.create({
      data: {
        orderId: id,
        previousStatus: "driver_at_store",
        newStatus: "collected",
        actorId: session.user.id,
        actorType: "driver",
        metadata: { action: "voucher_collected" },
      },
    });
  });

  return NextResponse.json({ orderId: id, status: "collected" });
}
