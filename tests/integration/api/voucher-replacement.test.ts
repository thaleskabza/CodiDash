import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/orders/[id]/items/[itemId]/voucher-status/route";
import { PUT } from "@/app/api/orders/[id]/items/[itemId]/replace-voucher/route";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    driver: { findUnique: jest.fn() },
    order: { findFirst: jest.fn() },
    orderItem: { findFirst: jest.fn(), update: jest.fn() },
  },
}));
jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));

import { auth } from "@/lib/auth";
const mockAuth = auth as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const DRIVER_SESSION = { user: { id: "u-drv-1", role: "driver" } };
const CUSTOMER_SESSION = { user: { id: "u-cust-1", role: "customer" } };
const MOCK_DRIVER = { id: "drv-1", userId: "u-drv-1" };

function patchRequest(body: unknown, orderId = "order-1", itemId = "item-1"): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/orders/${orderId}/items/${itemId}/voucher-status`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
  );
}
function putRequest(body: unknown, orderId = "order-1", itemId = "item-1"): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/orders/${orderId}/items/${itemId}/replace-voucher`,
    { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
  );
}

describe("PATCH /api/orders/:id/items/:itemId/voucher-status", () => {
  beforeEach(() => jest.clearAllMocks());

  it("driver can report voucher as invalid — sets replacement_deadline", async () => {
    mockAuth.mockResolvedValue(DRIVER_SESSION);
    (mockPrisma.driver.findUnique as jest.Mock).mockResolvedValue(MOCK_DRIVER);
    (mockPrisma.order.findFirst as jest.Mock).mockResolvedValue({
      id: "order-1",
      driverId: "drv-1",
      status: "pickup_confirmed",
    });
    (mockPrisma.orderItem.findFirst as jest.Mock).mockResolvedValue({
      id: "item-1",
      voucherStatus: "pending",
    });
    (mockPrisma.orderItem.update as jest.Mock).mockResolvedValue({
      id: "item-1",
      voucherStatus: "invalid",
      replacementDeadline: new Date(Date.now() + 5 * 60 * 1000),
    });

    const res = await PATCH(patchRequest({ voucherStatus: "invalid" }), {
      params: Promise.resolve({ id: "order-1", itemId: "item-1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.item.voucherStatus).toBe("invalid");
    expect(data.item.replacementDeadline).toBeDefined();
  });

  it("returns 403 when driver is not assigned to this order", async () => {
    mockAuth.mockResolvedValue(DRIVER_SESSION);
    (mockPrisma.driver.findUnique as jest.Mock).mockResolvedValue(MOCK_DRIVER);
    (mockPrisma.order.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await PATCH(patchRequest({ voucherStatus: "invalid" }), {
      params: Promise.resolve({ id: "order-1", itemId: "item-1" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/orders/:id/items/:itemId/replace-voucher", () => {
  beforeEach(() => jest.clearAllMocks());

  it("customer can replace voucher within 5-minute window", async () => {
    mockAuth.mockResolvedValue(CUSTOMER_SESSION);
    (mockPrisma.order.findFirst as jest.Mock).mockResolvedValue({
      id: "order-1",
      customerId: "u-cust-1",
    });
    (mockPrisma.orderItem.findFirst as jest.Mock).mockResolvedValue({
      id: "item-1",
      voucherStatus: "invalid",
      replacementDeadline: new Date(Date.now() + 3 * 60 * 1000), // 3 min remaining
    });
    (mockPrisma.orderItem.update as jest.Mock).mockResolvedValue({
      id: "item-1",
      voucherStatus: "replaced",
      voucherCode: "NEW-VOC-123",
    });

    const res = await PUT(putRequest({ voucherCode: "NEW-VOC-123" }), {
      params: Promise.resolve({ id: "order-1", itemId: "item-1" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.item.voucherStatus).toBe("replaced");
  });

  it("returns 410 when replacement deadline has expired", async () => {
    mockAuth.mockResolvedValue(CUSTOMER_SESSION);
    (mockPrisma.order.findFirst as jest.Mock).mockResolvedValue({
      id: "order-1",
      customerId: "u-cust-1",
    });
    (mockPrisma.orderItem.findFirst as jest.Mock).mockResolvedValue({
      id: "item-1",
      voucherStatus: "invalid",
      replacementDeadline: new Date(Date.now() - 1000), // expired
    });

    const res = await PUT(putRequest({ voucherCode: "NEW-VOC-456" }), {
      params: Promise.resolve({ id: "order-1", itemId: "item-1" }),
    });
    expect(res.status).toBe(410);
  });
});
