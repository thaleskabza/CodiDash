import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isWithinRadius } from "@/lib/geo";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      store: { select: { id: true, name: true, address: true, latitude: true, longitude: true } },
      deliveryAddress: { select: { address: true, latitude: true, longitude: true } },
      driver: {
        include: { user: { select: { name: true } } },
      },
      items: true,
      payment: { select: { status: true, amount: true, driverAmount: true, platformAmount: true } },
      auditLogs: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Access control — customers see their own, drivers see assigned, admins see all
  const isOwner = order.customerId === session.user.id;
  const isAssignedDriver =
    session.user.role === "driver" &&
    order.driver?.user &&
    order.driverId !== null;
  const isAdmin = session.user.role === "admin";

  if (!isOwner && !isAssignedDriver && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ order });
}

const PickupSchema = z.object({
  status: z.literal("pickup_confirmed"),
  receiptImageUrl: z.string().url("Receipt image URL is required"),
  driverLatitude: z.number(),
  driverLongitude: z.number(),
});

const InTransitSchema = z.object({
  status: z.literal("in_transit"),
});

const PatchSchema = z.discriminatedUnion("status", [PickupSchema, InTransitSchema]);

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "driver") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } });
  if (!driver) return NextResponse.json({ error: "Driver not found" }, { status: 404 });

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { store: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.driverId !== driver.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = parsed.data;

  if (data.status === "pickup_confirmed") {
    if (order.status !== "driver_assigned") {
      return NextResponse.json({ error: "Order is not in driver_assigned status" }, { status: 409 });
    }

    const withinRange = isWithinRadius(
      { latitude: data.driverLatitude, longitude: data.driverLongitude },
      { latitude: Number(order.store.latitude), longitude: Number(order.store.longitude) },
      0.2, // 200m radius
    );

    if (!withinRange) {
      return NextResponse.json(
        { error: "GPS location does not match store location (must be within 200m)", flagged: true },
        { status: 422 },
      );
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      const o = await tx.order.update({
        where: { id },
        data: { status: "pickup_confirmed" },
        select: { id: true, status: true },
      });
      await tx.orderAudit.create({
        data: {
          orderId: id,
          previousStatus: "driver_assigned",
          newStatus: "pickup_confirmed",
          actorId: session.user.id,
          actorType: "driver",
          metadata: {
            receiptImageUrl: data.receiptImageUrl,
            driverLatitude: data.driverLatitude,
            driverLongitude: data.driverLongitude,
          },
        },
      });
      return o;
    });

    return NextResponse.json({ order: updated });
  }

  if (data.status === "in_transit") {
    if (order.status !== "pickup_confirmed") {
      return NextResponse.json({ error: "Order is not in pickup_confirmed status" }, { status: 409 });
    }

    const updated = await prisma.$transaction(async (tx: any) => {
      const o = await tx.order.update({
        where: { id },
        data: { status: "in_transit" },
        select: { id: true, status: true },
      });
      await tx.orderAudit.create({
        data: {
          orderId: id,
          previousStatus: "pickup_confirmed",
          newStatus: "in_transit",
          actorId: session.user.id,
          actorType: "driver",
        },
      });
      return o;
    });

    return NextResponse.json({ order: updated });
  }

  return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
}
