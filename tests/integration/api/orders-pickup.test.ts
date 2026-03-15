import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/orders/[id]/route";
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
jest.mock("@/lib/geo", () => ({ isWithinRadius: jest.fn() }));

import { auth } from "@/lib/auth";
import { isWithinRadius } from "@/lib/geo";

const mockAuth = auth as jest.Mock;
const mockWithinRadius = isWithinRadius as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const DRIVER_SESSION = { user: { id: "u-drv-1", role: "driver" } };
const MOCK_DRIVER = { id: "drv-1", userId: "u-drv-1", status: "busy" };
const ASSIGNED_ORDER = {
  id: "order-1",
  status: "driver_assigned",
  driverId: "drv-1",
  store: { latitude: -33.893, longitude: 18.5127 },
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/orders/order-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/orders/:id — pickup confirmation", () => {
  beforeEach(() => jest.clearAllMocks());

  it("confirms pickup when GPS is within 200m of store", async () => {
    mockAuth.mockResolvedValue(DRIVER_SESSION);
    (mockPrisma.driver.findUnique as jest.Mock).mockResolvedValue(MOCK_DRIVER);
    (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(ASSIGNED_ORDER);
    mockWithinRadius.mockReturnValue(true);
    (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
      id: "order-1",
      status: "pickup_confirmed",
    });

    const res = await PATCH(makeRequest({
      status: "pickup_confirmed",
      receiptImageUrl: "https://example.com/receipt.jpg",
      driverLatitude: -33.8930,
      driverLongitude: 18.5127,
    }), { params: Promise.resolve({ id: "order-1" }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.order.status).toBe("pickup_confirmed");
  });

  it("rejects pickup when GPS is outside 200m of store", async () => {
    mockAuth.mockResolvedValue(DRIVER_SESSION);
    (mockPrisma.driver.findUnique as jest.Mock).mockResolvedValue(MOCK_DRIVER);
    (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(ASSIGNED_ORDER);
    mockWithinRadius.mockReturnValue(false);

    const res = await PATCH(makeRequest({
      status: "pickup_confirmed",
      receiptImageUrl: "https://example.com/receipt.jpg",
      driverLatitude: -33.95,
      driverLongitude: 18.60,
    }), { params: Promise.resolve({ id: "order-1" }) });

    expect(res.status).toBe(422);
  });

  it("rejects pickup when receiptImageUrl is missing", async () => {
    mockAuth.mockResolvedValue(DRIVER_SESSION);
    (mockPrisma.driver.findUnique as jest.Mock).mockResolvedValue(MOCK_DRIVER);
    (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(ASSIGNED_ORDER);

    const res = await PATCH(makeRequest({
      status: "pickup_confirmed",
      driverLatitude: -33.893,
      driverLongitude: 18.5127,
    }), { params: Promise.resolve({ id: "order-1" }) });

    expect(res.status).toBe(400);
  });
});
