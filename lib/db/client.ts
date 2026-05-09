import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

export function buildDatabaseUrl(): string {
  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT ?? "5432";
  const user = process.env.DB_USER;
  const password = process.env.DB_SERVICE_TOKEN;
  const name = process.env.DB_NAME;

  if (!host || !user || !password || !name) {
    throw new Error(
      "Missing required DB env vars: DB_HOST, DB_USER, DB_SERVICE_TOKEN, DB_NAME",
    );
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
}

// Singleton pattern — prevents connection pool exhaustion in Next.js dev hot-reload
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const pool = new Pool({ connectionString: buildDatabaseUrl() });
    const adapter = new PrismaPg(pool);
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }
  return globalForPrisma.prisma;
}

// Lazy proxy — defers PrismaClient initialization until first property access.
// This prevents connection errors at module load time (e.g., during tests).
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return getPrismaClient()[prop as keyof PrismaClient];
  },
});
