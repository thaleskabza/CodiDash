import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/admin/drivers/[id]/route";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    driver: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({ auth: jest.fn() }));
import { auth } from "@/lib/auth";

const mockAuth = auth as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/drivers/driver-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/drivers/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("admin can approve driver (pending_approval → available)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
    (mockPrisma.driver.findUnique as jest.Mock).mockResolvedValue({
      id: "driver-1",
      status: "pending_approval",
    });
    (mockPrisma.driver.update as jest.Mock).mockResolvedValue({
      id: "driver-1",
      status: "available",
      user: { name: "Test Driver", email: "driver@test.com" },
    });

    const res = await PATCH(makeRequest({ status: "available" }), {
      params: { id: "driver-1" },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("available");
  });

  it("admin can suspend driver (available → suspended)", async () => {
    mockAuth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
    (mockPrisma.driver.findUnique as jest.Mock).mockResolvedValue({
      id: "driver-1",
      status: "available",
    });
    (mockPrisma.driver.update as jest.Mock).mockResolvedValue({
      id: "driver-1",
      status: "suspended",
      user: { name: "Test Driver", email: "driver@test.com" },
    });

    const res = await PATCH(makeRequest({ status: "suspended" }), {
      params: { id: "driver-1" },
    });
    expect(res.status).toBe(200);
  });

  it("returns 403 when non-admin attempts status change", async () => {
    mockAuth.mockResolvedValue({ user: { id: "customer-1", role: "customer" } });

    const res = await PATCH(makeRequest({ status: "available" }), {
      params: { id: "driver-1" },
    });
    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);

    const res = await PATCH(makeRequest({ status: "available" }), {
      params: { id: "driver-1" },
    });
    expect(res.status).toBe(401);
  });
});
