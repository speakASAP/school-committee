# School Committee Hosted Auth Wave 2 Status

Date: 2026-06-24
Repo: school-committee
Owner role: Wave 2 School Committee hosted Auth consumer worker
Mode: bounded remote code patch and targeted auth validation

## IPS Chain

Vision: School Committee uses Alfares central hosted Auth for human credential collection while remaining the school-domain authorization and onboarding owner.

Goal Impact: users enter credentials only on `https://auth.alfares.cz/login`, return through `/auth/callback`, and keep the existing School Committee BFF cookie/session behavior with `scp_access`, `scp_refresh`, and `scp_onboarding`.

System: Auth-hosted login/register UI, School Committee Next.js `/login` redirect page, `/auth/callback` token fragment consumer, `/api/auth/session` BFF cookie setter, `/api/auth/refresh`, `validateToken`, `proxy.ts`, and local profile/role/onboarding storage.

Feature: visible local login UX converted to a hosted Auth redirect/callback consumer.

Task: replace local credential collection on `/login` with hosted Auth redirect state, validate callback state, preserve BFF cookies and onboarding routing, and validate targeted auth/proxy behavior.

Execution Plan: inspect Auth consumer standard and prior reference plan; change only allowed auth/login/callback/helper/test/docs files; keep `/api/auth/login` and `/api/auth/magic-link` compatibility routes in place; do not touch secrets, DB data, deploy/k8s, school-domain schema, payments, events, tasks, Auth service code, or legacy `speakasap-portal`.

Coding Prompt: use Auth as credential authority; do not mint Auth JWTs locally; do not expose raw tokens in logs/docs/tests; preserve School Committee cookies and local school-domain roles; mark validation debt separately.

Code: `app/(public)/login/page.tsx`, `app/auth/callback/page.tsx`, `lib/auth/hosted-auth.ts`, `tests/auth/hosted-auth.test.ts`, `tests/middleware.test.ts`, and this status doc.

Validation: targeted auth/helper tests, middleware tests, type-check, build, and `git diff --check` over changed files.

## Current Auth Surface

- Visible login UI: `/login` now generates an opaque state nonce, stores the safe in-app `next` path in `sessionStorage`, and redirects to `https://auth.alfares.cz/login?client_id=school-committee&return_url=<origin>/auth/callback&state=<nonce>`.
- Callback consumer: `/auth/callback` reads `access_token`, `refresh_token`, and optional `state` from `window.location.hash`, strips the fragment from browser history, validates returned hosted state when present, posts tokens to `/api/auth/session`, and routes through local onboarding before any requested return path.
- BFF session: `/api/auth/session` remains the only browser callback path that sets `scp_access`, `scp_refresh`, and `scp_onboarding`; cookie names and refresh behavior were not changed.
- Refresh: `/api/auth/refresh` still rotates local BFF cookies from `scp_refresh` through Auth `/auth/refresh`.
- Validation: `lib/auth/validate-token.ts` still validates access tokens through Auth `/auth/validate`.
- Local authorization: School Committee local profile, approval state, onboarding state, and school-domain roles remain in this service and were not refactored.
- Compatibility endpoints: `/api/auth/login` and `/api/auth/magic-link` remain present for transitional compatibility, but the visible `/login` page no longer collects email/password or magic-link credentials.
- Proxy: unauthenticated protected routes still redirect to `/login?next=<path>`; authenticated routes without `scp_onboarding` still redirect through `/api/auth/sync` before final routing.

## Validation Evidence

Command run from `/home/ssf/Documents/Github/school-committee`:

```bash
npm test -- tests/auth/validate-token.test.ts tests/auth/require-role.test.ts tests/auth/hosted-auth.test.ts
```

Result: passed, 3 test files and 16 tests. The validate-token negative-path test emitted the expected mocked network-error log.

```bash
npm test -- tests/middleware.test.ts
```

Result: passed, 1 test file and 7 tests. The previous stale pass-through assertion was updated to cover the documented `/api/auth/sync` redirect when `scp_onboarding` is absent, plus the pass-through case when onboarding is complete.

```bash
npm run type-check
```

Result: passed.

```bash
npm run build
```

Result: passed. Existing admin-route dynamic server usage messages were logged during static generation, then Next classified those routes as dynamic and exited 0.

```bash
git diff --check -- app/(public)/login/page.tsx app/auth/callback/page.tsx lib/auth/hosted-auth.ts tests/auth/hosted-auth.test.ts tests/middleware.test.ts docs/orchestrator/2026-06-24-school-committee-hosted-auth-wave2-status.md
```

Result: passed.

## Existing Validation Debt Separated

- Prior reference plan recorded `tests/auth/get-current-user.test.ts` failures when broader auth tests run without DB environment variables. This Wave 2 pass did not run that DB-dependent test and did not read DB data.
- Build logs existing dynamic server usage messages for admin routes that read cookies during static generation. Build exits 0 and marks those routes dynamic; this patch did not alter admin routes.
- Runtime allowlist readiness for `school-committee` callback origin remains `[MISSING: production origin/Auth allowlist verification]` because secrets, Kubernetes Secret data, and deploy/runtime reads were out of scope.

## Blockers And Follow-Up

- `[MISSING: production origin]` for the final `school-committee` callback registry entry in Auth allowlist evidence.
- `[MISSING: safe live hosted-login smoke]` with a non-secret test user or approved synthetic token flow.
- `[UNKNOWN: when transitional /api/auth/login and /api/auth/magic-link consumers can be removed]`; they remain untouched for compatibility.

## Parallel Execution Notes

Shared contracts: Auth hosted login URL parameters, callback fragment fields, `state`, School Committee `scp_*` cookie names, and onboarding status values.

Integration owner: Auth modernization ecosystem integration owner should verify Auth allowlist/runtime callback readiness before deploy.

Validation owner: School Committee lane owner owns repo-level targeted tests; integration validator owns live smoke evidence.

Merge order: this bounded School Committee patch can merge after review; live rollout should wait for Auth allowlist verification and safe hosted-login smoke.
