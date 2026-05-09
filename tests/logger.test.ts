import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "@/lib/logger";

describe("logger", () => {
  let output: string[] = [];

  beforeEach(() => {
    output = [];
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      output.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("outputs valid JSON for info", () => {
    logger.info("test message");
    const parsed = JSON.parse(output[0]!.trim());
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("test message");
    expect(parsed.service).toBe("school-committee");
    expect(typeof parsed.timestamp).toBe("string");
  });

  it("outputs valid JSON for warn", () => {
    logger.warn("warn message");
    const parsed = JSON.parse(output[0]!.trim());
    expect(parsed.level).toBe("warn");
  });

  it("outputs valid JSON for error", () => {
    logger.error("error message");
    const parsed = JSON.parse(output[0]!.trim());
    expect(parsed.level).toBe("error");
  });

  it("includes context fields in output", () => {
    logger.info("with context", {
      request_id: "req-123",
      route: "/api/test",
      status_code: 200,
      duration_ms: 42,
    });
    const parsed = JSON.parse(output[0]!.trim());
    expect(parsed.request_id).toBe("req-123");
    expect(parsed.route).toBe("/api/test");
    expect(parsed.status_code).toBe(200);
    expect(parsed.duration_ms).toBe(42);
  });

  it("timestamp is a valid ISO 8601 string", () => {
    logger.info("ts test");
    const parsed = JSON.parse(output[0]!.trim());
    expect(() => new Date(parsed.timestamp).toISOString()).not.toThrow();
  });
});
