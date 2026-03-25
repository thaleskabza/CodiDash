import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const card = await prisma.paymentCard.findUnique({ where: { id } });
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  if (card.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.$transaction(async (tx) => {
    await tx.paymentCard.delete({ where: { id } });

    // If deleted card was default, promote the oldest remaining card to default
    if (card.isDefault) {
      const next = await tx.paymentCard.findFirst({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
      });
      if (next) {
        await tx.paymentCard.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }
  });

  return NextResponse.json({ success: true });
}
