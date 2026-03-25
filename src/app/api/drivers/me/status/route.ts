import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const StatusSchema = z.object({
  status: z.enum(["available", "offline"]),
});

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "driver") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });

  // Only approved drivers can toggle availability
  if (driver.status === "pending_approval") {
    return NextResponse.json({ error: "Account pending approval" }, { status: 403 });
  }
  if (driver.status === "suspended") {
    return NextResponse.json({ error: "Account suspended" }, { status: 403 });
  }
  if (driver.status === "busy") {
    return NextResponse.json({ error: "Cannot change status while on an active delivery" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = StatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const updated = await prisma.driver.update({
    where: { id: driver.id },
    data: { status: parsed.data.status },
    select: { id: true, status: true },
  });

  return NextResponse.json({ status: updated.status });
}
