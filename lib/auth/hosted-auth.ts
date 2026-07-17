const HOSTED_AUTH_LOGIN_URL =
  process.env.NEXT_PUBLIC_AUTH_LOGIN_URL ?? "https://auth.alfares.cz/login";
const HOSTED_AUTH_CLIENT_ID =
  process.env.NEXT_PUBLIC_AUTH_CLIENT_ID ?? "school-committee";

export const HOSTED_AUTH_STATE_STORAGE_PREFIX = "scp_auth_state:";

export type HostedAuthState = {
  nonce: string;
  next: string;
  createdAt: number;
};

export function createHostedAuthState(nextPath: string, now = Date.now()): HostedAuthState {
  return {
    nonce: createNonce(),
    next: normalizeAppPath(nextPath),
    createdAt: now,
  };
}

export function buildHostedAuthLoginUrl(options: {
  origin: string;
  state: string;
  loginUrl?: string;
  clientId?: string;
  lang?: string;
}): string {
  const url = new URL(options.loginUrl ?? HOSTED_AUTH_LOGIN_URL);
  url.searchParams.set("client_id", options.clientId ?? HOSTED_AUTH_CLIENT_ID);
  url.searchParams.set("return_url", new URL("/auth/callback", options.origin).toString());
  url.searchParams.set("state", options.state);
  url.searchParams.set("lang", options.lang ?? "cs");
  return url.toString();
}

export function storeHostedAuthState(storage: Storage, state: HostedAuthState): void {
  storage.setItem(
    `${HOSTED_AUTH_STATE_STORAGE_PREFIX}${state.nonce}`,
    JSON.stringify(state),
  );
}

export function consumeHostedAuthState(
  storage: Storage,
  nonce: string | null,
  now = Date.now(),
): HostedAuthState | null {
  if (!nonce) return null;

  const key = `${HOSTED_AUTH_STATE_STORAGE_PREFIX}${nonce}`;
  const raw = storage.getItem(key);
  if (!raw) return null;

  storage.removeItem(key);

  try {
    const parsed = JSON.parse(raw) as Partial<HostedAuthState>;
    if (parsed.nonce !== nonce || typeof parsed.createdAt !== "number") {
      return null;
    }

    const maxAgeMs = 10 * 60 * 1000;
    if (now - parsed.createdAt > maxAgeMs) {
      return null;
    }

    return {
      nonce,
      next: normalizeAppPath(parsed.next),
      createdAt: parsed.createdAt,
    };
  } catch {
    return null;
  }
}

export function normalizeAppPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  try {
    const url = new URL(value, "https://school-committee.local");
    if (url.origin !== "https://school-committee.local") {
      return "/dashboard";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/dashboard";
  }
}

function createNonce(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }

  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
