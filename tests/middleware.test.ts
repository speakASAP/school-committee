import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

import { proxy as middleware } from "@/proxy";

function makeReq(path: string, cookies?: Record<string, string>) {
  const req = new NextRequest(`http://localhost${path}`);
  for (const [name, value] of Object.entries(cookies ?? {})) {
    req.cookies.set(name, value);
  }
  return req;
}

// A minimal JWT with exp in the past (payload: {"exp": 1000000000})
const EXPIRED_JWT =
  "eyJhbGciOiJIUzI1NiJ9." +
  btoa(JSON.stringify({ exp: 1000000000 })).replace(/=/g, "") +
  ".fake";

// A minimal JWT with exp far in the future
const VALID_JWT =
  "eyJhbGciOiJIUzI1NiJ9." +
  btoa(JSON.stringify({ exp: 9999999999 })).replace(/=/g, "") +
  ".fake";

describe("middleware", () => {
  it("passes through unprotected paths without cookie", () => {
    const res = middleware(makeReq("/login"));
    expect(res.status).not.toBe(307);
  });

  it("passes through manifest.json without cookie", () => {
    const res = middleware(makeReq("/manifest.json"));
    expect(res.status).not.toBe(307);
  });

  it("redirects to /login when no cookie on protected path", () => {
    const res = middleware(makeReq("/admin/users"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("redirects when cookie contains obviously expired token", () => {
    const res = middleware(makeReq("/admin/users", { scp_access: EXPIRED_JWT }));
    expect(res.status).toBe(307);
  });

  it("routes valid sessions without onboarding cookie through sync", () => {
    const res = middleware(makeReq("/admin/users", { scp_access: VALID_JWT }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/api/auth/sync");
    expect(res.headers.get("location")).toContain("next=%2Fadmin%2Fusers");
  });

  it("passes through when valid session has complete onboarding", () => {
    const res = middleware(makeReq("/admin/users", {
      scp_access: VALID_JWT,
      scp_onboarding: "complete",
    }));
    expect(res.status).not.toBe(307);
  });

  it("preserves the next param in login redirect", () => {
    const res = middleware(makeReq("/admin/payments"));
    expect(res.headers.get("location")).toContain("next=%2Fadmin%2Fpayments");
  });
});
