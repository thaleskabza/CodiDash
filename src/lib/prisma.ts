import { PrismaClient } from "@prisma/client";

// Prevent multiple Prisma client instances in development due to hot-reloading
declare global {
  var __prisma: PrismaClient | undefined; // eslint-disable-line no-var
}

function buildDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? "";
  // Enforce connection_limit=1 so Prisma serialises queries through a single
  // pooler slot — required for Supabase session-mode PgBouncer (free tier).
  if (!url.includes("connection_limit")) {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}connection_limit=1&pool_timeout=10`;
  }
  return url;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
    datasources: {
      db: {
        url: buildDatabaseUrl(),
      },
    },
  });
}

export const prisma: PrismaClient =
  global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

export default prisma;
