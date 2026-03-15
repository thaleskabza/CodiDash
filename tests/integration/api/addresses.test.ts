import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/addresses/route";
import { PATCH, DELETE } from "@/app/api/addresses/[id]/route";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    deliveryAddress: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

import { auth } from "@/lib/auth";

const mockAuth = auth as jest.Mock;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const SESSION = { user: { id: "user-1", role: "customer" } };

function makeRequest(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("GET /api/addresses", () => {
  it("returns the user's delivery addresses", async () => {
    mockAuth.mockResolvedValue(SESSION);
    (mockPrisma.deliveryAddress.findMany as jest.Mock).mockResolvedValue([
      { id: "addr-1", address: "123 Main St", isDefault: true },
    ]);

    const req = makeRequest("http://localhost:3000/api/addresses", "GET");
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.addresses).toHaveLength(1);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const req = makeRequest("http://localhost:3000/api/addresses", "GET");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

describe("POST /api/addresses", () => {
  it("creates a new delivery address", async () => {
    mockAuth.mockResolvedValue(SESSION);

    // Mock fetch for Nominatim geocoding
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => [{ lat: "-33.9249", lon: "18.4241" }],
    } as any);

    (mockPrisma.deliveryAddress.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (mockPrisma.deliveryAddress.create as jest.Mock).mockResolvedValue({
      id: "addr-2",
      address: "10 Long St, Cape Town",
      latitude: -33.9249,
      longitude: 18.4241,
      isDefault: true,
    });

    const req = makeRequest("http://localhost:3000/api/addresses", "POST", {
      address: "10 Long St, Cape Town",
      label: "Work",
      isDefault: true,
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it("returns 422 for missing address field", async () => {
    mockAuth.mockResolvedValue(SESSION);
    const req = makeRequest("http://localhost:3000/api/addresses", "POST", {
      label: "Work",
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });
});

describe("PATCH /api/addresses/[id]", () => {
  it("updates an address that belongs to the user", async () => {
    mockAuth.mockResolvedValue(SESSION);
    (mockPrisma.deliveryAddress.findFirst as jest.Mock).mockResolvedValue({
      id: "addr-1",
      userId: "user-1",
    });
    (mockPrisma.deliveryAddress.update as jest.Mock).mockResolvedValue({
      id: "addr-1",
      label: "Updated Home",
    });

    const req = makeRequest(
      "http://localhost:3000/api/addresses/addr-1",
      "PATCH",
      { label: "Updated Home" },
    );
    const res = await PATCH(req, { params: Promise.resolve({ id: "addr-1" }) });
    expect(res.status).toBe(200);
  });

  it("returns 404 for address belonging to another user", async () => {
    mockAuth.mockResolvedValue(SESSION);
    (mockPrisma.deliveryAddress.findFirst as jest.Mock).mockResolvedValue(null);

    const req = makeRequest(
      "http://localhost:3000/api/addresses/addr-99",
      "PATCH",
      { label: "Hack" },
    );
    const res = await PATCH(req, { params: Promise.resolve({ id: "addr-99" }) });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/addresses/[id]", () => {
  it("deletes an address that belongs to the user", async () => {
    mockAuth.mockResolvedValue(SESSION);
    (mockPrisma.deliveryAddress.findFirst as jest.Mock).mockResolvedValue({
      id: "addr-1",
      userId: "user-1",
    });
    (mockPrisma.deliveryAddress.delete as jest.Mock).mockResolvedValue({ id: "addr-1" });

    const req = makeRequest("http://localhost:3000/api/addresses/addr-1", "DELETE");
    const res = await DELETE(req, { params: Promise.resolve({ id: "addr-1" }) });
    expect(res.status).toBe(200);
  });
});
