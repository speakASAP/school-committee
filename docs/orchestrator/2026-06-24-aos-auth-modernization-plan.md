# School Committee Reference Plan: AOS/Auth Compatibility

Date: 2026-06-24
Repo: school-committee
Owner role: WS-D School Committee Reference Compatibility Owner
Mode: reference-consumer documentation and targeted compatibility validation

## IPS Chain

Vision: School Committee remains the reference consumer for central auth delegation while Alfares AOS/auth modernization moves toward hosted auth.
Goal Impact: auth-microservice modernization does not break existing app login, magic-link, refresh, token validation, cookie sessions, onboarding redirects, or school-domain authorization.
System: Next.js BFF auth routes, auth callback page, session cookies, proxy middleware, token validation helper, profile onboarding workflow.
Feature: compatibility matrix for central hosted auth and existing auth-microservice integration.
Task: document the current School Committee auth pattern as the reference consumer and identify stable contract requirements for WS-A/WS-E.
Execution Plan: inspect current auth routes and middleware; document compatibility expectations; run targeted auth/middleware tests; update app code only if a small compatibility defect is found after WS-A publishes the final contract.
Coding Prompt: do not refactor domain features; do not implement auth internally; keep this repo a reference, not the primary modernization target.
Code: `docs/orchestrator/**`; `tests/app/api/auth/**` only if a small compatibility fix is required. No code fix was required by this pass.
Validation: targeted Vitest coverage for auth helpers and proxy redirects; type/build only if changes expand beyond documentation.

## Source Review Status

- `AGENTS.md`: reviewed. Repo requires auth delegation, IPS chain preservation, RAG query or recorded unavailability, and no internal auth implementation.
- `README.md`: reviewed. It defines Auth as identity/JWT authority and School Committee as owner of school-domain roles and approval state.
- `AGENT_OPERATIONS.md`: reviewed. It requires explicit changed files, validation evidence, blockers, and handoff.
- `.claude/checklists/before-coding.md`: reviewed. RAG is required when available; protected files remain `BUSINESS.md` and `GOALS.md`.
- Docs RAG: unavailable in this shell because `JWT_TOKEN` was not present; no token value was printed.
- WS-A final hosted-auth contract: [UNKNOWN: not published in this repo as of this pass].

## Current School Committee Auth Pattern

School Committee is a BFF consumer of `auth-microservice`, not an auth provider. It calls Auth for identity and token operations, stores app session state in School Committee cookies, and uses local database tables for school-specific authorization and onboarding.

Current consumer endpoints and helpers:

- `app/api/auth/login/route.ts` calls `POST {AUTH_SERVICE_BASE_URL}/auth/login`, accepts flat and legacy wrapped response shapes, sets `scp_access` and `scp_refresh`, then syncs `scp_onboarding` from the local profile.
- `app/api/auth/magic-link/route.ts` calls `POST {AUTH_SERVICE_BASE_URL}/auth/magic-link/request` with `return_url={APP_BASE_URL}/auth/callback` and optional `app_domain={DOMAIN}`.
- `app/auth/callback/page.tsx` expects URL fragment tokens named `access_token` and `refresh_token`, posts them to `/api/auth/session`, then routes by onboarding status.
- `app/api/auth/session/route.ts` accepts `accessToken` and `refreshToken`, sets School Committee cookies, validates the access token, and syncs onboarding status.
- `app/api/auth/refresh/route.ts` reads `scp_refresh`, calls `POST {AUTH_SERVICE_BASE_URL}/auth/refresh`, and rotates both cookies.
- `lib/auth/validate-token.ts` calls `POST {AUTH_SERVICE_BASE_URL}/auth/validate`, accepts either `{ valid, user }` or a flat user response, and rejects inactive or invalid users.
- `lib/auth/get-current-user.ts` uses Auth identity as the user key, then reads School Committee local roles and profile approval state from this service database.
- `proxy.ts` protects app/admin routes by checking `scp_access` expiry locally, preserving `/login?next=...`, and syncing/routing onboarding via `scp_onboarding` and `/api/auth/sync`.

## Compatibility Matrix

| Flow / contract | Current School Committee behavior | Auth modernization requirement | Compatibility status | Owner handoff |
|---|---|---|---|---|
| Password login | `/api/auth/login` forwards `email` and `password` to `/auth/login`; expects `accessToken`, `refreshToken`, and `user.id/email` either flat or under `data`. | Keep `/auth/login` compatible or publish hosted-login replacement plus callback/session handoff. Preserve token field names or provide adapter contract. | Compatible with current Auth; gated on WS-A final contract. | WS-A must confirm login response shape or hosted-auth redirect replacement. WS-E should include login smoke with cookie assertion. |
| Magic link request | `/api/auth/magic-link` forwards `email`, `return_url`, and optional `app_domain` to `/auth/magic-link/request`; always returns success to avoid enumeration. | Keep request endpoint and parameters stable, or publish hosted-auth magic-link flow that returns tokens to School Committee callback/session path. | Compatible with current Auth; hosted flow unknown. | WS-A must preserve `return_url` behavior or document new URL. WS-E should smoke request acceptance and callback route. |
| Magic-link callback | `/auth/callback` reads `#access_token=...&refresh_token=...` from fragment, posts to `/api/auth/session`, then routes by local onboarding status. | Hosted auth must return both tokens in the same fragment names or WS-D needs a small callback adapter after contract publication. Avoid query tokens unless explicitly designed. | Risk: [UNKNOWN: hosted callback token transport]. | WS-A must specify callback transport. WS-D can adapt callback only after final contract. WS-E should verify no token appears in server logs if fragment is preserved. |
| Session cookies | School Committee owns `scp_access`, `scp_refresh`, and `scp_onboarding`; cookies are `httpOnly`, `sameSite=lax`, path `/`, and `secure` in production. | Auth modernization must not require Auth-owned browser cookies for School Committee routes unless WS-D receives a migration plan. Tokens returned to BFF/session are sufficient. | Compatible if tokens remain app-consumable. | WS-A should confirm consumer-managed session cookies remain supported. WS-E should assert cookie names and flags in deployed smoke. |
| Refresh | `/api/auth/refresh` sends `{ refreshToken }` from `scp_refresh` to `/auth/refresh`; expects rotated `accessToken` and `refreshToken` flat or under `data`. | Keep refresh endpoint/body/response stable or publish compatible adapter contract. | Compatible with current Auth. | WS-A owns endpoint stability. WS-E should include expired-access/valid-refresh smoke where feasible. |
| Validate | `validateToken` posts `{ token }` to `/auth/validate`; accepts `{ user }` wrapper or flat user; requires `id`, `email`, `userType`, `isActive`, `createdAt`, `roles`. | Preserve `/auth/validate` semantics and user identity fields. Roles may include global/application roles, but School Committee filters and enforces local roles from its DB. | Compatible with current Auth. | WS-A must keep stable identity fields. WS-E should run validate-token tests plus live `/auth/validate` smoke if safe. |
| Local authorization | `getCurrentUser` ignores non-School-Committee platform roles from Auth and reads local `user_roles` plus profile approval state. | Auth modernization must not move School Committee school roles into global Auth RBAC without an explicit migration plan. | Compatible; domain boundary documented in README. | WS-A should avoid claiming Auth owns School Committee local roles. WS-E should verify local role tests remain green. |
| Middleware redirects | `proxy.ts` redirects protected paths without valid `scp_access` to `/login?next=<path>`; authenticated users without onboarding cookie go through `/api/auth/sync`. | Hosted login must preserve `next` or provide equivalent return-state behavior. `/api/auth/session`, `/api/auth/refresh`, `/api/auth/sync`, and `/auth/callback` must remain public/proxy-passable. | Compatible with current local `/login`; hosted login requires state mapping. | WS-A must specify hosted `next`/state parameter. WS-D can patch `/login` to redirect after contract. WS-E should run middleware redirect tests and hosted return-path smoke. |
| Password set / onboarding | `/api/auth/set-password` uses current access token and calls `/auth/password-set`; onboarding completion remains local profile/cookie state. | Keep password-set endpoint for invited/magic-link onboarding or publish a hosted equivalent with post-completion token/session continuity. | Compatible with current Auth; hosted password set unknown. | WS-A must confirm password-set continuity. WS-E should smoke invited-user onboarding where safe. |
| Internal email check | `/api/auth/check-email` calls `/auth/internal/check-email` with `AUTH_SERVICE_CLIENT_SECRET` as `x-internal-service-token`. | Preserve internal endpoint or mark feature optional with compatible fallback. | Current route degrades safely to `{ exists: false }` on misconfig/error. | WS-A should confirm whether internal check survives modernization. WS-E may skip if no safe internal token is available. |
| Logout | `/api/auth/logout` best-effort calls `/auth/logout` with bearer access token, then clears local cookies regardless. | Keep logout endpoint best-effort; app security does not depend on remote logout success for local cookie clearing. | Compatible. | WS-E should verify local cookies are cleared even if Auth is unavailable. |

## Breakage Risks For AOS/Auth Modernization

- High: hosted-auth callback token transport is not documented here. Current code requires `access_token` and `refresh_token` in the URL fragment.
- Medium: hosted login must preserve return-path semantics equivalent to `/login?next=...`; otherwise middleware redirects will lose user intent.
- Medium: token response fields must remain flat or legacy-wrapped with `accessToken` and `refreshToken`; snake_case JSON in BFF responses would require a small adapter.
- Medium: `/auth/validate` must continue returning `isActive` and stable `id/email` fields; School Committee local roles depend on `id` as the join key.
- Low: `AUTH_SERVICE_CLIENT_SECRET` internal email check has safe closed behavior but may reduce login UX if removed.

## Parallel Execution / Ownership

| Workstream | Status | Owner role | Scope | Dependencies | Validation / output | Merge order |
|---|---|---|---|---|---|---|
| WS-A Auth contract | Dependency-gated for WS-D code edits | Auth modernization owner | auth-microservice hosted auth, login, magic-link, refresh, validate, logout contracts | Final hosted-auth callback and state contract | Published contract with exact routes, payloads, token transport, cookie assumptions | First |
| WS-D School Committee reference | Ready now for docs, code-gated for adapter | Reference compatibility owner | `docs/orchestrator/**`; small auth route/callback tests only if required | WS-A final contract for code changes | This matrix, targeted tests, adapter prompt if needed | Second after WS-A for any code patch |
| WS-E Integration validation | Ready after WS-A/WS-D handoff | Integration validator | black-box deployed smoke and repo tests | Stable deploy target and safe credentials | Evidence for login, magic-link, refresh, validate, cookies, middleware redirects | Final |

Shared files/contracts: Auth endpoint contract, hosted callback URL/state rules, School Committee cookie names, and `/login?next=` behavior.
Integration owner: WS-E for cross-service validation evidence.
Validation owner: WS-E for deployed smoke; WS-D for repo-level targeted auth/proxy tests.
Conflict rule: WS-D must not change app auth routes until WS-A publishes the contract or WS-E produces a concrete regression.

## Validation Plan

Targeted repo validation:

```bash
npm test -- tests/auth/validate-token.test.ts tests/auth/get-current-user.test.ts tests/auth/require-role.test.ts tests/middleware.test.ts
```

Optional broader validation if code changes are introduced:

```bash
npm run type-check
npm run build
```

WS-E deployed smoke checklist:

- Login: successful password login sets `scp_access`, `scp_refresh`, and expected onboarding route/cookie state.
- Magic link: request succeeds without email enumeration; callback receives tokens and establishes a School Committee session.
- Refresh: valid refresh token rotates cookies; invalid refresh returns 401 and does not create a session.
- Validate: Auth `/auth/validate` accepts School Committee access tokens and returns stable identity fields.
- Middleware: protected route without session redirects to `/login?next=...`; protected route with valid session does not redirect; missing onboarding cookie routes through `/api/auth/sync`.
- Logout: local cookies clear even if remote logout fails.

## Current Decision

No School Committee code change is required in this pass. The current consumer implementation is compatible with the existing Auth routes and already tolerates flat and legacy-wrapped token responses. The only code-gated item is a potential hosted-auth `/login` redirect and `/auth/callback` adapter after WS-A publishes the exact hosted contract.

## Handoff To WS-A

Please confirm these contract points before asking WS-D for code changes:

- Hosted auth login URL and supported `next`/state parameter.
- Magic-link request endpoint and whether `return_url` remains accepted.
- Callback token transport and exact field names.
- `/auth/login`, `/auth/refresh`, `/auth/validate`, `/auth/password-set`, `/auth/logout`, and `/auth/internal/check-email` compatibility commitments.
- Whether School Committee continues to own its browser session cookies and school-domain roles.

## Handoff To WS-E

Use this repository as the reference consumer for integration validation. Prioritize evidence that the modernization does not break:

- password login;
- magic-link request and callback;
- refresh;
- validate;
- `scp_access`, `scp_refresh`, and `scp_onboarding` cookies;
- `/login?next=` and `/api/auth/sync` middleware redirects;
- local role/profile authorization after Auth identity validation.

Record any live failure as either a WS-A contract regression, a WS-D adapter requirement, or unrelated validation debt. Do not merge a School Committee adapter without a concrete WS-A contract or WS-E regression report.

## Validation Evidence - WS-D Pass

Command run from `/home/ssf/Documents/Github/school-committee` on 2026-06-24:

```bash
npm test -- tests/auth/validate-token.test.ts tests/auth/get-current-user.test.ts tests/auth/require-role.test.ts tests/middleware.test.ts
```

Result: failed with 18 passing tests and 3 failing tests. Failures are recorded as validation debt for this documentation-only pass, not as introduced code regressions:

- `tests/auth/validate-token.test.ts`: passed, 5 tests.
- `tests/auth/require-role.test.ts`: passed, 7 tests.
- `tests/auth/get-current-user.test.ts`: 2 failures because required DB environment variables were absent (`DB_HOST`, `DB_USER`, `DB_SERVICE_TOKEN`, `DB_NAME`) and the test imports the real DB client for role/profile lookup.
- `tests/middleware.test.ts`: 1 failure because the test expects a valid `scp_access` cookie to pass through without `scp_onboarding`; current `proxy.ts` redirects to `/api/auth/sync` when the onboarding cookie is absent, which is the documented current behavior.

Clean targeted subset rerun:

```bash
npm test -- tests/auth/validate-token.test.ts tests/auth/require-role.test.ts
```

Result: passed, 2 test files and 12 tests. The expected mocked network-error log from validate-token was emitted by the negative-path test.
