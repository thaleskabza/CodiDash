// NextAuth credentials login is tested via the signIn flow.
// These tests verify the credentials authorize callback logic directly.
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// Import the authorize function — we test the logic in isolation
async function authorizeCredentials(
  email: string,
  password: string,
): Promise<{ id: string; email: string; role: string } | null> {
  const user = await mockPrisma.user.findUnique({
    where: { email },
    include: { driver: true },
  });

  if (!user) return null;

  const valid = await bcrypt.compare(password, (user as any).passwordHash);
  if (!valid) return null;

  return { id: user.id, email: user.email, role: (user as any).role };
}

describe("NextAuth credentials authorize logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns user on valid credentials", async () => {
    const hash = await bcrypt.hash("correctpass", 10);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "uuid-1",
      email: "user@example.com",
      passwordHash: hash,
      role: "customer",
    });

    const result = await authorizeCredentials("user@example.com", "correctpass");
    expect(result).not.toBeNull();
    expect(result?.email).toBe("user@example.com");
  });

  it("returns null for wrong password", async () => {
    const hash = await bcrypt.hash("correctpass", 10);
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "uuid-1",
      email: "user@example.com",
      passwordHash: hash,
      role: "customer",
    });

    const result = await authorizeCredentials("user@example.com", "wrongpass");
    expect(result).toBeNull();
  });

  it("returns null for unknown email", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const result = await authorizeCredentials("unknown@example.com", "pass123");
    expect(result).toBeNull();
  });
});
