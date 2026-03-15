import { NextRequest } from "next/server";
import { POST } from "@/app/api/orders/[id]/qr/scan/route";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    driver: { findUnique: jest.fn() },
    order: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/qr", () => ({
  verifySignature: jest.fn(),
  isExpired: jest.fn(),
}));
jest.mock("@/lib/payfast", () => ({ chargeToken: jest.fn() }));

import { auth } from "@/lib/auth";
import { verifySignature, isExpired } from "@/lib/qr";
import { chargeToken } from "@/lib/payfast";

const mockAuth = auth as jest.Mock;
const mockVerify = verifySignature as jest.Mock;
const mockIsExpired = isExpired as jest.Mock;
const mockCharge = chargeToken as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const DRIVER_SESSION = { user: { id: "u-drv-1", role: "driver" } };
const MOCK_DRIVER = { id: "drv-1", userId: "u-drv-1" };
const IN_TRANSIT_ORDER = {
  id: "order-1",
  orderNumber: "ORD-ABC123",
  status: "in_transit",
  driverId: "drv-1",
  deliveryFee: 3500,
  paymentToken: "tok_test",
  qrExpiresAt: new Date(Date.now() + 7200000),
  payment: { id: "pay-1", status: "authorized" },
};

const VALID_QR = { oid: "ORD-ABC123", ts: Math.floor(Date.now() / 1000), sig: "valid-sig" };

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/orders/order-1/qr/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/orders/:id/qr/scan", () => {
  beforeEach(() => jest.clearAllMocks());

  it("delivers order and charges payment on valid QR scan", async () => {
    mockAuth.mockResolvedValue(DRIVER_SESSION);
    (mockPrisma.driver.findUnique as jest.Mock).mockResolvedValue(MOCK_DRIVER);
    (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(IN_TRANSIT_ORDER);
    mockVerify.mockReturnValue(true);
    mockIsExpired.mockReturnValue(false);
    mockCharge.mockResolvedValue({ success: true, paymentId: "payfast-123" });
    (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
      id: "order-1",
      status: "delivered",
      paymentStatus: "captured",
      amountCharged: 3500,
    });

    const res = await POST(makeRequest({ qrData: VALID_QR }), {
      params: Promise.resolve({ id: "order-1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("delivered");
  });

  it("returns 400 for invalid QR signature", async () => {
    mockAuth.mockResolvedValue(DRIVER_SESSION);
    (mockPrisma.driver.findUnique as jest.Mock).mockResolvedValue(MOCK_DRIVER);
    (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(IN_TRANSIT_ORDER);
    mockVerify.mockReturnValue(false);
    mockIsExpired.mockReturnValue(false);

    const res = await POST(makeRequest({ qrData: { ...VALID_QR, sig: "bad-sig" } }), {
      params: Promise.resolve({ id: "order-1" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for expired QR code", async () => {
    mockAuth.mockResolvedValue(DRIVER_SESSION);
    (mockPrisma.driver.findUnique as jest.Mock).mockResolvedValue(MOCK_DRIVER);
    (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue({
      ...IN_TRANSIT_ORDER,
      qrExpiresAt: new Date(Date.now() - 1000),
    });
    mockVerify.mockReturnValue(true);
    mockIsExpired.mockReturnValue(true);

    const res = await POST(makeRequest({ qrData: VALID_QR }), {
      params: Promise.resolve({ id: "order-1" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 402 when payment charge fails", async () => {
    mockAuth.mockResolvedValue(DRIVER_SESSION);
    (mockPrisma.driver.findUnique as jest.Mock).mockResolvedValue(MOCK_DRIVER);
    (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(IN_TRANSIT_ORDER);
    mockVerify.mockReturnValue(true);
    mockIsExpired.mockReturnValue(false);
    mockCharge.mockResolvedValue({ success: false, error: "Insufficient funds" });
    (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
      status: "payment_pending",
    });

    const res = await POST(makeRequest({ qrData: VALID_QR }), {
      params: Promise.resolve({ id: "order-1" }),
    });
    expect(res.status).toBe(402);
  });
});
