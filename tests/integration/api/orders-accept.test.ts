import { NextRequest } from "next/server";
import { POST } from "@/app/api/orders/[id]/accept/route";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    driver: { findUnique: jest.fn() },
    order: { findUnique: jest.fn(), update: jest.fn() },
    orderAudit: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));
jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));

import { auth } from "@/lib/auth";
const mockAuth = auth as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeRequest(orderId: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/orders/${orderId}/accept`, {
    method: "POST",
  });
}

const SESSION_DRIVER = { user: { id: "user-driver-1", role: "driver" } };
const MOCK_DRIVER = { id: "driver-1", userId: "user-driver-1", status: "available" };
const PENDING_ORDER = { id: "order-1", status: "pending_driver", driverId: null };

describe("POST /api/orders/:id/accept", () => {
  beforeEach(() => jest.clearAllMocks());

  it("first driver to accept claims the order (200)", async () => {
    mockAuth.mockResolvedValue(SESSION_DRIVER);
    (mockPrisma.driver.findUnique as jest.Mock).mockResolvedValue(MOCK_DRIVER);
    (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(PENDING_ORDER);
    (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
      id: "order-1",
      status: "driver_assigned",
      driverId: "driver-1",
    });

    const res = await POST(makeRequest("order-1"), {
      params: Promise.resolve({ id: "order-1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("driver_assigned");
  });

  it("returns 409 when order already claimed", async () => {
    mockAuth.mockResolvedValue(SESSION_DRIVER);
    (mockPrisma.driver.findUnique as jest.Mock).mockResolvedValue(MOCK_DRIVER);
    (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue({
      ...PENDING_ORDER,
      status: "driver_assigned",
      driverId: "other-driver",
    });

    const res = await POST(makeRequest("order-1"), {
      params: Promise.resolve({ id: "order-1" }),
    });
    expect(res.status).toBe(409);
  });

  it("returns 403 when driver is not available", async () => {
    mockAuth.mockResolvedValue(SESSION_DRIVER);
    (mockPrisma.driver.findUnique as jest.Mock).mockResolvedValue({
      ...MOCK_DRIVER,
      status: "busy",
    });

    const res = await POST(makeRequest("order-1"), {
      params: Promise.resolve({ id: "order-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 403 when role is not driver", async () => {
    mockAuth.mockResolvedValue({ user: { id: "cust-1", role: "customer" } });
    const res = await POST(makeRequest("order-1"), {
      params: Promise.resolve({ id: "order-1" }),
    });
    expect(res.status).toBe(403);
  });
});
