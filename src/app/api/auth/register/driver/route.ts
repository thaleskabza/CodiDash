import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const DriverRegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  vehicleType: z.enum(["bicycle", "motorcycle", "car", "scooter"], {
    errorMap: () => ({
      message: "vehicleType must be one of: bicycle, motorcycle, car, scooter",
    }),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = DriverRegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 422 },
      );
    }

    const { name, email, password, vehicleType } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name, email, passwordHash, role: "driver" },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      });

      const driver = await tx.driver.create({
        data: { userId: user.id, vehicleType, status: "pending_approval" },
        select: {
          id: true,
          userId: true,
          vehicleType: true,
          status: true,
          rating: true,
          cancellationCount: true,
        },
      });

      return { user, driver };
    });

    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
