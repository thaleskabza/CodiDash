import { NextRequest } from "next/server";
import { POST } from "@/app/api/orders/route";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    store: { findUnique: jest.fn() },
    deliveryAddress: { findFirst: jest.fn() },
    menuItem: { findMany: jest.fn() },
    order: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/geo", () => ({
  calculateDistance: jest.fn(),
  getDeliveryTier: jest.fn(),
}));
jest.mock("@/lib/qr", () => ({ generateQR: jest.fn(), signPayload: jest.fn() }));
jest.mock("@/lib/payfast", () => ({ createToken: jest.fn() }));

import { auth } from "@/lib/auth";
import { calculateDistance, getDeliveryTier } from "@/lib/geo";
import { generateQR, signPayload } from "@/lib/qr";

const mockAuth = auth as jest.Mock;
const mockCalcDist = calculateDistance as jest.Mock;
const mockGetTier = getDeliveryTier as jest.Mock;
const mockGenerateQR = generateQR as jest.Mock;
const mockSignPayload = signPayload as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const SESSION = { user: { id: "cust-1", role: "customer" } };

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_STORE = {
  id: "store-1",
  name: "Kauai Canal Walk",
  latitude: -33.893,
  longitude: 18.5127,
  isActive: true,
};
const VALID_ADDRESS = {
  id: "addr-1",
  userId: "cust-1",
  latitude: -33.91,
  longitude: 18.52,
};

describe("POST /api/orders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(SESSION);
    (mockPrisma.store.findUnique as jest.Mock).mockResolvedValue(VALID_STORE);
    (mockPrisma.deliveryAddress.findFirst as jest.Mock).mockResolvedValue(VALID_ADDRESS);
    (mockPrisma.menuItem.findMany as jest.Mock).mockResolvedValue([
      { name: "Berry Blaze Smoothie", isAvailable: true },
    ]);
    mockCalcDist.mockReturnValue(3.0);
    mockGetTier.mockReturnValue({ fee: 3500, tier: "0-4km" });
    mockGenerateQR.mockResolvedValue("data:image/png;base64,abc123");
    mockSignPayload.mockReturnValue("sig-abc");
    (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) =>
      fn(mockPrisma),
    );
    (mockPrisma.order.create as jest.Mock).mockResolvedValue({
      id: "order-1",
      orderNumber: "ORD-A1B2C3",
      status: "pending_driver",
      storeId: "store-1",
      deliveryFee: 3500,
      distanceKm: 3.0,
      items: [{ id: "item-1", smoothieItem: "Berry Blaze Smoothie", voucherStatus: "pending" }],
      qrExpiresAt: new Date(Date.now() + 7200000),
    });
  });

  it("creates order with single item and returns 201", async () => {
    const res = await POST(
      makeRequest({
        storeId: "store-1",
        deliveryAddressId: "addr-1",
        items: [{ voucherCode: "VOC001", smoothieItem: "Berry Blaze Smoothie" }],
      }),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.status).toBe("pending_driver");
    expect(data.deliveryFee).toBe(3500);
  });

  it("creates order with multiple items (multi-voucher)", async () => {
    (mockPrisma.menuItem.findMany as jest.Mock).mockResolvedValue([
      { name: "Berry Blaze Smoothie", isAvailable: true },
      { name: "Green Glow Smoothie", isAvailable: true },
    ]);
    const res = await POST(
      makeRequest({
        storeId: "store-1",
        deliveryAddressId: "addr-1",
        items: [
          { voucherCode: "VOC001", smoothieItem: "Berry Blaze Smoothie" },
          { voucherCode: "VOC002", smoothieItem: "Green Glow Smoothie" },
        ],
      }),
    );
    expect(res.status).toBe(201);
  });

  it("returns 422 when address is beyond 10km", async () => {
    mockCalcDist.mockReturnValue(11.5);
    mockGetTier.mockReturnValue(null);
    const res = await POST(
      makeRequest({
        storeId: "store-1",
        deliveryAddressId: "addr-1",
        items: [{ voucherCode: "VOC001", smoothieItem: "Berry Blaze Smoothie" }],
      }),
    );
    expect(res.status).toBe(422);
  });

  it("returns 400 when items array is empty", async () => {
    const res = await POST(
      makeRequest({ storeId: "store-1", deliveryAddressId: "addr-1", items: [] }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when smoothieItem is not in menu", async () => {
    (mockPrisma.menuItem.findMany as jest.Mock).mockResolvedValue([]);
    const res = await POST(
      makeRequest({
        storeId: "store-1",
        deliveryAddressId: "addr-1",
        items: [{ voucherCode: "VOC001", smoothieItem: "Not A Real Smoothie" }],
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(
      makeRequest({
        storeId: "store-1",
        deliveryAddressId: "addr-1",
        items: [{ voucherCode: "VOC001", smoothieItem: "Berry Blaze Smoothie" }],
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when role is not customer", async () => {
    mockAuth.mockResolvedValue({ user: { id: "drv-1", role: "driver" } });
    const res = await POST(
      makeRequest({
        storeId: "store-1",
        deliveryAddressId: "addr-1",
        items: [{ voucherCode: "VOC001", smoothieItem: "Berry Blaze Smoothie" }],
      }),
    );
    expect(res.status).toBe(403);
  });
});
