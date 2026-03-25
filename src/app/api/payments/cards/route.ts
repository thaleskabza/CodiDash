import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SaveCardSchema = z.object({
  token: z.string().min(1),
  brand: z.string().optional(),
  last4: z.string().length(4).optional(),
  expiryMonth: z.number().int().min(1).max(12).optional(),
  expiryYear: z.number().int().min(2024).optional(),
  isDefault: z.boolean().optional(),
});

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cards = await prisma.paymentCard.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { id: true, brand: true, last4: true, expiryMonth: true, expiryYear: true, isDefault: true, createdAt: true },
  });

  return NextResponse.json({ cards });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = SaveCardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { token, brand, last4, expiryMonth, expiryYear, isDefault } = parsed.data;

  const card = await prisma.$transaction(async (tx) => {
    // If this card is to be default, unset any existing default
    if (isDefault) {
      await tx.paymentCard.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    // If this is the first card, make it default automatically
    const existingCount = await tx.paymentCard.count({ where: { userId: session.user.id } });

    return tx.paymentCard.create({
      data: {
        userId: session.user.id,
        token,
        brand: brand ?? null,
        last4: last4 ?? null,
        expiryMonth: expiryMonth ?? null,
        expiryYear: expiryYear ?? null,
        isDefault: isDefault ?? existingCount === 0,
      },
      select: { id: true, brand: true, last4: true, expiryMonth: true, expiryYear: true, isDefault: true, createdAt: true },
    });
  });

  return NextResponse.json({ card }, { status: 201 });
}
