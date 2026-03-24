import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateDistance, getDeliveryTier } from "@/lib/geo";
import { generateQR } from "@/lib/qr";

const OrderItemSchema = z
  .object({
    voucherCode: z.string().min(1).optional(),
    voucherImageUrl: z.string().url().optional(),
    smoothieItem: z.string().min(1),
  })
  .refine((d) => !!(d.voucherCode || d.voucherImageUrl), {
    message: "Each item must have a voucherCode or voucherImageUrl",
  });

const CreateOrderSchema = z.object({
  storeId: z.string().uuid(),
  deliveryAddressId: z.string().uuid(),
  items: z.array(OrderItemSchema).min(1, "At least one item required"),
  paymentToken: z.string().optional(),
});

function generateOrderNumber(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const random = Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join("");
  return `ORD-${random}`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "customer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { storeId, deliveryAddressId, items, paymentToken } = parsed.data;

    // Verify store exists and is active
    const store = await prisma.store.findUnique({ where: { id: storeId, isActive: true } });
    if (!store) {
      return NextResponse.json({ error: "Store not found or inactive" }, { status: 400 });
    }

    // Verify delivery address belongs to customer
    const address = await prisma.deliveryAddress.findFirst({
      where: { id: deliveryAddressId, userId: session.user.id },
    });
    if (!address) {
      return NextResponse.json({ error: "Delivery address not found" }, { status: 400 });
    }

    // Calculate distance and determine fee
    const distanceKm = calculateDistance(
      { latitude: Number(store.latitude), longitude: Number(store.longitude) },
      { latitude: Number(address.latitude), longitude: Number(address.longitude) },
    );
    const tier = getDeliveryTier(distanceKm);
    if (!tier) {
      return NextResponse.json(
        { error: "Delivery address is outside the 10km service area." },
        { status: 422 },
      );
    }

    // Validate all smoothie items exist in the menu
    const menuItemNames = items.map((i) => i.smoothieItem);
    const menuItems = await prisma.menuItem.findMany({
      where: { name: { in: menuItemNames }, isAvailable: true },
    });
    const foundNames = new Set(menuItems.map((m) => m.name));
    const invalid = menuItemNames.filter((n) => !foundNames.has(n));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Invalid or unavailable menu items: ${invalid.join(", ")}` },
        { status: 400 },
      );
    }

    const orderNumber = generateOrderNumber();

    // Create order + items in transaction (QR generated after, needs real order ID)
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId: session.user.id,
          storeId,
          deliveryAddressId,
          distanceKm,
          deliveryFee: tier.fee,
          status: "pending_driver",
          paymentToken: paymentToken ?? null,
          items: {
            create: items.map((item) => ({
              voucherCode: item.voucherCode ?? null,
              voucherImageUrl: item.voucherImageUrl ?? null,
              smoothieItem: item.smoothieItem,
              voucherStatus: "pending",
            })),
          },
        },
        include: {
          items: true,
          store: { select: { name: true } },
        },
      });

      // Audit log
      await tx.orderAudit.create({
        data: {
          orderId: newOrder.id,
          newStatus: "pending_driver",
          actorId: session.user.id,
          actorType: "customer",
        },
      });

      return newOrder;
    });

    // Generate QR after order creation (needs real order ID)
    const { qrDataUrl, payload, expiresAt: qrExpiresAt } = await generateQR(order.id);
    await prisma.order.update({
      where: { id: order.id },
      data: { qrPayload: JSON.stringify(payload), qrExpiresAt },
    });

    return NextResponse.json(
      {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        storeId: order.storeId,
        storeName: order.store.name,
        deliveryFee: order.deliveryFee,
        distanceKm: Number(order.distanceKm),
        items: order.items.map((i) => ({
          id: i.id,
          smoothieItem: i.smoothieItem,
          voucherStatus: i.voucherStatus,
        })),
        qrDataUrl,
        qrExpiresAt: qrExpiresAt.toISOString(),
        createdAt: order.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  // Scope by role
  if (session.user.role === "customer") {
    where.customerId = session.user.id;
  } else if (session.user.role === "driver") {
    const driver = await prisma.driver.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (driver) where.driverId = driver.id;
  }
  // admin sees all

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: {
        store: { select: { name: true } },
        items: { select: { id: true, smoothieItem: true, voucherStatus: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ orders, total, page, limit });
}
