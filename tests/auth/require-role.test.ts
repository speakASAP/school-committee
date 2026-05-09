import { describe, it, expect } from "vitest";
import { requireRole } from "@/lib/auth/require-role";
import type { CurrentUser } from "@/types/auth";
import { ForbiddenError, UnauthenticatedError } from "@/types/errors";

const parent: CurrentUser = { id: "u1", email: "p@test.com", roles: ["parent"] };
const committee: CurrentUser = { id: "u2", email: "c@test.com", roles: ["committee"] };
const admin: CurrentUser = { id: "u3", email: "a@test.com", roles: ["admin"] };

describe("requireRole", () => {
  it("allows user with matching role", () => {
    expect(() => requireRole(parent, ["parent"])).not.toThrow();
  });

  it("allows user when one of multiple roles matches", () => {
    expect(() => requireRole(committee, ["committee", "admin"])).not.toThrow();
  });

  it("allows admin when admin is in allowed list", () => {
    expect(() => requireRole(admin, ["committee", "admin"])).not.toThrow();
  });

  it("throws ForbiddenError for admin not in allowed list", () => {
    expect(() => requireRole(admin, ["committee"])).toThrow(ForbiddenError);
  });

  it("throws ForbiddenError for insufficient role", () => {
    expect(() => requireRole(parent, ["committee", "admin"])).toThrow(ForbiddenError);
  });

  it("throws UnauthenticatedError for null user", () => {
    expect(() => requireRole(null, ["parent"])).toThrow(UnauthenticatedError);
  });

  it("returns the user on success", () => {
    const result = requireRole(committee, ["committee"]);
    expect(result).toBe(committee);
  });
});
