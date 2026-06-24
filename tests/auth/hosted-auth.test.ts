import { describe, expect, it } from "vitest";
import {
  buildHostedAuthLoginUrl,
  consumeHostedAuthState,
  normalizeAppPath,
  storeHostedAuthState,
  type HostedAuthState,
} from "@/lib/auth/hosted-auth";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe("hosted auth helpers", () => {
  it("builds the hosted Auth login URL with client, return URL, and state", () => {
    const url = new URL(
      buildHostedAuthLoginUrl({
        origin: "https://committee.example",
        state: "state-1",
        loginUrl: "https://auth.alfares.cz/login",
        clientId: "school-committee",
      }),
    );

    expect(url.origin + url.pathname).toBe("https://auth.alfares.cz/login");
    expect(url.searchParams.get("client_id")).toBe("school-committee");
    expect(url.searchParams.get("return_url")).toBe("https://committee.example/auth/callback");
    expect(url.searchParams.get("state")).toBe("state-1");
  });

  it("consumes stored state exactly once", () => {
    const storage = memoryStorage();
    const state: HostedAuthState = {
      nonce: "nonce-1",
      next: "/payments?tab=open",
      createdAt: 1000,
    };

    storeHostedAuthState(storage, state);

    expect(consumeHostedAuthState(storage, "nonce-1", 2000)).toEqual(state);
    expect(consumeHostedAuthState(storage, "nonce-1", 2000)).toBeNull();
  });

  it("rejects stale callback state", () => {
    const storage = memoryStorage();
    storeHostedAuthState(storage, {
      nonce: "nonce-1",
      next: "/dashboard",
      createdAt: 1000,
    });

    expect(consumeHostedAuthState(storage, "nonce-1", 1000 + 11 * 60 * 1000)).toBeNull();
  });

  it("normalizes return paths to in-app paths", () => {
    expect(normalizeAppPath("/admin/users?role=parent")).toBe("/admin/users?role=parent");
    expect(normalizeAppPath("https://evil.example/admin")).toBe("/dashboard");
    expect(normalizeAppPath("//evil.example/admin")).toBe("/dashboard");
    expect(normalizeAppPath(null)).toBe("/dashboard");
  });
});
