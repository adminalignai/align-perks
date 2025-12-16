import { PrismaClient } from "@prisma/client";

// Ensure Prisma Client is reused in development and doesn't create extra connections.
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function getPrismaClient() {
  if (process.env.NODE_ENV === "production") {
    return new PrismaClient();
  }

  if (!globalThis.prisma) {
    globalThis.prisma = new PrismaClient();
  }

  return globalThis.prisma;
}

const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: keyof PrismaClient) {
    const client = getPrismaClient();
    return client[prop];
  },
});

export default prisma;
