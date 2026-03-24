import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const PatchSchema = z.object({
  status: z.enum(["available", "suspended", "offline"]),
});

interface RouteParams {
  params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const driver = await prisma.driver.findUnique({ where: { id: params.id } });
  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });

  const updated = await prisma.driver.update({
    where: { id: params.id },
    data: { status: parsed.data.status },
    include: { user: { select: { name: true, email: true } } },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.user.name,
    email: updated.user.email,
    status: updated.status,
  });
}
