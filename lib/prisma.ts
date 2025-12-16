import { PrismaClient } from "@prisma/client";

// Ensure Prisma Client is reused in development and doesn't create extra connections.
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function getPrismaClient(): PrismaClient {
  const datasourceUrl = process.env.DATABASE_URL;

  // With Prisma 7 + prisma.config.ts, the runtime still needs a concrete URL.
  // Vercel provides this via Project Environment Variables.
  if (!datasourceUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  return (
    globalThis.prisma ??
    (globalThis.prisma = new PrismaClient({
      datasourceUrl,
    }))
  );
}

const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    const client = getPrismaClient();
    const value = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export default prisma;

