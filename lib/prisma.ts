import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient();
  }
  return globalForPrisma.prisma;
}

// Lazy proxy so PrismaClient is NOT constructed during module import/build evaluation
const prisma = new Proxy(
  {},
  {
    get(_target, prop) {
      return (getPrismaClient() as any)[prop];
    },
  }
) as PrismaClient;

export default prisma;
