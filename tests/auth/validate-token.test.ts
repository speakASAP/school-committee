import { describe, it, expect, vi, afterEach } from "vitest";
import { validateToken } from "@/lib/auth/validate-token";
import { UnauthenticatedError } from "@/types/errors";

afterEach(() => {
  vi.restoreAllMocks();
});

const validUser = {
  id: "user-1",
  email: "test@example.com",
  userType: "end_user",
  isActive: true,
  createdAt: "2024-01-01T00:00:00Z",
  roles: ["parent"],
};

describe("validateToken", () => {
  it("returns user data for a valid token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => validUser,
      }),
    );

    const result = await validateToken("valid-token");
    expect(result.id).toBe("user-1");
    expect(result.email).toBe("test@example.com");
    expect(result.roles).toEqual(["parent"]);
  });

  it("throws UnauthenticatedError for 401 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }),
    );

    await expect(validateToken("bad-token")).rejects.toThrow(UnauthenticatedError);
  });

  it("throws UnauthenticatedError for 403 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({}) }),
    );

    await expect(validateToken("bad-token")).rejects.toThrow(UnauthenticatedError);
  });

  it("throws UnauthenticatedError for inactive user", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ...validUser, isActive: false }),
      }),
    );

    await expect(validateToken("token-for-inactive")).rejects.toThrow(UnauthenticatedError);
  });

  it("throws UnauthenticatedError on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network failure")));

    await expect(validateToken("any-token")).rejects.toThrow(UnauthenticatedError);
  });
});
