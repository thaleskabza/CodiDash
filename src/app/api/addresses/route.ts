import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const AddressSchema = z.object({
  address: z.string().min(1, "Address is required"),
  label: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
});

async function geocodeAddress(
  address: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const userAgent = process.env.NOMINATIM_USER_AGENT || "CodiDash/1.0";
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": userAgent },
    });
    const results = await res.json();
    if (!results.length) return null;
    return {
      latitude: parseFloat(results[0].lat),
      longitude: parseFloat(results[0].lon),
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const addresses = await prisma.deliveryAddress.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ addresses });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = AddressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    const { address, label, isDefault } = parsed.data;

    const coords = await geocodeAddress(address);
    if (!coords) {
      return NextResponse.json(
        { error: "Address could not be geocoded. Please enter a more specific address." },
        { status: 422 },
      );
    }

    if (isDefault) {
      await prisma.deliveryAddress.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const newAddress = await prisma.deliveryAddress.create({
      data: {
        userId: session.user.id,
        address,
        label,
        latitude: coords.latitude,
        longitude: coords.longitude,
        isDefault: isDefault ?? false,
      },
    });

    return NextResponse.json({ address: newAddress }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
