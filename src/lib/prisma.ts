import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// If in development and cached instance is outdated (e.g. missing newly generated fields)
if (
  process.env.NODE_ENV !== "production" &&
  globalForPrisma.prisma &&
  !(globalForPrisma.prisma as any)._runtimeDataModel?.models?.Room?.fields?.some(
    (f: any) => f.name === "previousRoomNumber"
  )
) {
  try {
    (globalForPrisma.prisma as any).$disconnect?.();
  } catch {}
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development"
      ? ["error", "warn"]
      : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

