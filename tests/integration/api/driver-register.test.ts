import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/register/driver/route";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("bcryptjs", () => ({
  __esModule: true,
  default: { hash: jest.fn().mockResolvedValue("hashed_password") },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/register/driver", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register/driver", () => {
  beforeEach(() => jest.clearAllMocks());

  it("creates User (role=driver) + Driver record (status=pending_approval)", async () => {
    const now = new Date();
    const mockUser = {
      id: "user-1",
      name: "Jane Driver",
      email: "jane@example.com",
      role: "driver",
      createdAt: now,
    };
    const mockDriver = {
      id: "driver-1",
      userId: "user-1",
      vehicleType: "motorcycle",
      status: "pending_approval",
    };

    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
      user: mockUser,
      driver: mockDriver,
    });

    const res = await POST(
      makeRequest({
        name: "Jane Driver",
        email: "jane@example.com",
        password: "password123",
        vehicleType: "motorcycle",
      }),
    );

    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.user.role).toBe("driver");
    expect(data.driver.status).toBe("pending_approval");
    expect(data.user).not.toHaveProperty("passwordHash");
  });

  it("returns 422 when vehicleType is missing", async () => {
    const res = await POST(
      makeRequest({ name: "Jane", email: "jane@example.com", password: "pass1234" }),
    );
    expect(res.status).toBe(422);
  });

  it("returns 409 when email is already registered", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "existing" });
    const res = await POST(
      makeRequest({
        name: "Jane",
        email: "taken@example.com",
        password: "password123",
        vehicleType: "car",
      }),
    );
    expect(res.status).toBe(409);
  });
});
