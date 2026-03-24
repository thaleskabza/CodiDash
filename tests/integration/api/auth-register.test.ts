import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a customer user with hashed password", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.user.create as jest.Mock).mockResolvedValue({
      id: "uuid-1",
      name: "Test User",
      email: "test@example.com",
      role: "customer",
      createdAt: new Date(),
    });

    const req = makeRequest({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.user.email).toBe("test@example.com");
    expect(data.user).not.toHaveProperty("passwordHash");
    expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);

    const createCall = (mockPrisma.user.create as jest.Mock).mock.calls[0][0];
    expect(createCall.data.role).toBe("customer");
    const isHashed = await bcrypt.compare(
      "password123",
      createCall.data.passwordHash,
    );
    expect(isHashed).toBe(true);
  });

  it("returns 409 when email already exists", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "existing",
      email: "taken@example.com",
    });

    const req = makeRequest({
      name: "Test",
      email: "taken@example.com",
      password: "password123",
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it("returns 422 for missing required fields", async () => {
    const req = makeRequest({ email: "test@example.com" });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("returns 422 for invalid email format", async () => {
    const req = makeRequest({
      name: "Test",
      email: "not-an-email",
      password: "password123",
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("returns 422 for password shorter than 8 characters", async () => {
    const req = makeRequest({
      name: "Test",
      email: "test@example.com",
      password: "short",
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });
});
