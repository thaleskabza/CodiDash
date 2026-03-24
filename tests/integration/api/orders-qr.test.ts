import { NextRequest } from "next/server";
import { GET } from "@/app/api/orders/[id]/qr/route";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findFirst: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/qr", () => ({
  generateQR: jest.fn().mockResolvedValue("data:image/png;base64,qrdata"),
  signPayload: jest.fn().mockReturnValue("sig-abc"),
  isExpired: jest.fn(),
}));

import { auth } from "@/lib/auth";
import { isExpired } from "@/lib/qr";

const mockAuth = auth as jest.Mock;
const mockIsExpired = isExpired as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const SESSION = { user: { id: "cust-1", role: "customer" } };
const ORDER_IN_FLIGHT = {
  id: "order-1",
  customerId: "cust-1",
  status: "driver_assigned",
  qrPayload: JSON.stringify({ oid: "order-1", ts: Date.now(), sig: "old-sig" }),
  qrExpiresAt: new Date(Date.now() + 7200000),
};

function makeRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/orders/${id}/qr`);
}

describe("GET /api/orders/:id/qr", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns QR payload for valid in-flight order", async () => {
    mockAuth.mockResolvedValue(SESSION);
    (mockPrisma.order.findFirst as jest.Mock).mockResolvedValue(ORDER_IN_FLIGHT);
    mockIsExpired.mockReturnValue(false);

    const res = await GET(makeRequest("order-1"), {
      params: Promise.resolve({ id: "order-1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("qrPayload");
    expect(data).toHaveProperty("expiresAt");
  });

  it("regenerates QR when existing one is expired", async () => {
    mockAuth.mockResolvedValue(SESSION);
    (mockPrisma.order.findFirst as jest.Mock).mockResolvedValue({
      ...ORDER_IN_FLIGHT,
      qrExpiresAt: new Date(Date.now() - 1000),
    });
    (mockPrisma.order.update as jest.Mock).mockResolvedValue({
      ...ORDER_IN_FLIGHT,
      qrExpiresAt: new Date(Date.now() + 7200000),
    });
    mockIsExpired.mockReturnValue(true);

    const res = await GET(makeRequest("order-1"), {
      params: Promise.resolve({ id: "order-1" }),
    });
    expect(res.status).toBe(200);
    expect(mockPrisma.order.update).toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeRequest("order-1"), {
      params: Promise.resolve({ id: "order-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when order does not belong to user", async () => {
    mockAuth.mockResolvedValue(SESSION);
    (mockPrisma.order.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await GET(makeRequest("other-order"), {
      params: Promise.resolve({ id: "other-order" }),
    });
    expect(res.status).toBe(404);
  });
});
