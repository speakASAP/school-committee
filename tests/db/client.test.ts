import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock PrismaClient and pg Pool to avoid live connection requirements
vi.mock("@prisma/client", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PrismaClient: vi.fn(function (this: any) { return this; }),
}));
vi.mock("@prisma/adapter-pg", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  PrismaPg: vi.fn(function (this: any) { return this; }),
}));
vi.mock("pg", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Pool: vi.fn(function (this: any) { return this; }),
}));

import { buildDatabaseUrl, getPrismaClient } from "@/lib/db/client";

const required: Record<string, string> = {
  DB_HOST: "192.168.88.53",
  DB_PORT: "5432",
  DB_USER: "dbadmin",
  DB_SERVICE_TOKEN: "secret",
  DB_NAME: "school_committee_platform",
};

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of Object.keys(required)) {
    saved[k] = process.env[k];
    process.env[k] = required[k];
  }
});

afterEach(() => {
  for (const k of Object.keys(required)) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("getPrismaClient (singleton)", () => {
  it("returns the same instance on repeated calls", () => {
    const first = getPrismaClient();
    const second = getPrismaClient();
    expect(first).toBe(second);
  });
});

describe("buildDatabaseUrl", () => {
  it("builds a valid postgresql URL from env vars", () => {
    const url = buildDatabaseUrl();
    expect(url).toBe(
      "postgresql://dbadmin:secret@192.168.88.53:5432/school_committee_platform",
    );
  });

  it("defaults DB_PORT to 5432 when absent", () => {
    delete process.env.DB_PORT;
    const url = buildDatabaseUrl();
    expect(url).toContain(":5432/");
  });

  it("percent-encodes special characters in password", () => {
    process.env.DB_SERVICE_TOKEN = "p@ss:w/rd";
    const url = buildDatabaseUrl();
    expect(url).toContain("p%40ss%3Aw%2Frd");
  });

  it("throws when DB_HOST is missing", () => {
    delete process.env.DB_HOST;
    expect(() => buildDatabaseUrl()).toThrow("Missing required DB env vars");
  });

  it("throws when DB_SERVICE_TOKEN is missing", () => {
    delete process.env.DB_SERVICE_TOKEN;
    expect(() => buildDatabaseUrl()).toThrow("Missing required DB env vars");
  });
});
