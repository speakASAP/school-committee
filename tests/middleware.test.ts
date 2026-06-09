import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";

import { proxy as middleware } from "@/proxy";

function makeReq(path: string, cookie?: string) {
  const req = new NextRequest(`http://localhost${path}`);
  if (cookie) req.cookies.set("scp_access", cookie);
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
    const res = middleware(makeReq("/admin/users", EXPIRED_JWT));
    expect(res.status).toBe(307);
  });

  it("passes through when cookie contains non-expired token", () => {
    const res = middleware(makeReq("/admin/users", VALID_JWT));
    expect(res.status).not.toBe(307);
  });

  it("preserves the next param in login redirect", () => {
    const res = middleware(makeReq("/admin/payments"));
    expect(res.headers.get("location")).toContain("next=%2Fadmin%2Fpayments");
  });
});
