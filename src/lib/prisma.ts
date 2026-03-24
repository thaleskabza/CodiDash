import { PrismaClient } from "@prisma/client";

// Prevent multiple Prisma client instances in development due to hot-reloading
declare global {
  var __prisma: PrismaClient | undefined; // eslint-disable-line no-var
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
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
