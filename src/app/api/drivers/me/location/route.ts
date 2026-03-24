import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const LocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "driver") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = LocationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const { latitude, longitude } = parsed.data;

    const driver = await prisma.driver.update({
      where: { userId: session.user.id },
      data: { latitude, longitude, locationUpdatedAt: new Date() },
      select: { id: true, latitude: true, longitude: true, locationUpdatedAt: true },
    });

    return NextResponse.json({ driver });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
