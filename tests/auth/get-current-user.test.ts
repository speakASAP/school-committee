import { describe, it, expect, vi, afterEach } from "vitest";
import { UnauthenticatedError } from "@/types/errors";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("getCurrentUser", () => {
  it("throws UnauthenticatedError when no access token cookie exists", async () => {
    vi.doMock("@/lib/auth/session", () => ({
      getAccessToken: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock("@/lib/auth/validate-token", () => ({
      validateToken: vi.fn(),
    }));

    const { getCurrentUser } = await import("@/lib/auth/get-current-user");
    await expect(getCurrentUser()).rejects.toThrow(UnauthenticatedError);
  });

  it("returns CurrentUser for a valid token", async () => {
    vi.doMock("@/lib/auth/session", () => ({
      getAccessToken: vi.fn().mockResolvedValue("valid-token"),
    }));
    vi.doMock("@/lib/auth/validate-token", () => ({
      validateToken: vi.fn().mockResolvedValue({
        id: "user-1",
        email: "user@test.com",
        userType: "end_user",
        isActive: true,
        createdAt: "2024-01-01",
        roles: ["parent"],
      }),
    }));

    const { getCurrentUser } = await import("@/lib/auth/get-current-user");
    const user = await getCurrentUser();
    expect(user.id).toBe("user-1");
    expect(user.email).toBe("user@test.com");
    expect(user.roles).toEqual(["parent"]);
  });

  it("filters out non-platform roles", async () => {
    vi.doMock("@/lib/auth/session", () => ({
      getAccessToken: vi.fn().mockResolvedValue("valid-token"),
    }));
    vi.doMock("@/lib/auth/validate-token", () => ({
      validateToken: vi.fn().mockResolvedValue({
        id: "u1",
        email: "u@test.com",
        userType: "end_user",
        isActive: true,
        createdAt: "2024-01-01",
        roles: ["parent", "superuser", "global_admin"],
      }),
    }));

    const { getCurrentUser } = await import("@/lib/auth/get-current-user");
    const user = await getCurrentUser();
    expect(user.roles).toEqual(["parent"]);
  });
});
