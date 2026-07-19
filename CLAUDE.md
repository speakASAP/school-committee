# Claude Instructions

Shared rules live here:

- Claude profile: `/home/ssf/.claude/CLAUDE.md`
- Shared ecosystem instructions: `/home/ssf/Documents/Github/CLAUDE.md`
- Codex profile: `/home/ssf/.codex/AGENTS.md`
- Cross-agent standard: `/home/ssf/.ai-agent-standards/CROSS_AGENT_AUTOMATION_STANDARD.md`
- Repository operations: `AGENT_OPERATIONS.md`

Read those first, then follow the repository-specific notes below and the current planning/status files.


## Repository-Specific Notes

# CLAUDE.md — school-committee

Read `/docs` before making any implementation decisions. `/docs` is the single source of truth.

Agent reading order: `BUSINESS.md` → `SYSTEM.md` → `AGENTS.md` → `TASKS.md` → `STATE.json`

---

## Knowledge Retrieval — docs-rag-microservice (MANDATORY, query before reading files)

**Query the RAG before reading source files** — saves 2000-5000 tokens per answer.

```bash
kubectl -n statex-apps exec deployment/school-committee -- curl -s -X POST http://docs-rag-microservice:3397/retrieval/agent-context \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat ~/.claude/rag-token)" \
  -d '{"query": "YOUR QUESTION HERE", "maxTokens": 3000}'
```

---

## What This Is

Mobile-first web platform for Czech primary school parent committees. Parents can contribute financially (QR bank payments), volunteer for tasks, and submit feedback. Committee gets transparency tools. No social feeds, no child accounts in MVP.

---

## Stack

- **Frontend + BFF:** Next.js 14+ (App Router), TypeScript strict, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod
- **Deployment:** Kubernetes (`statex-apps` namespace), Traefik ingress, cert-manager TLS
- **Secrets:** Vault → ESO → K8s Secret
- **Languages:** cs / en

---

## Ports

- **Blue:** 4800
- **Green:** 4801
- **Domain:** `strilkove.cz`
- **Health:** `GET /api/health/live` and `GET /api/health/ready`

---

## Infrastructure Integrations

| Service | Env var | Address | Purpose |
|---------|---------|---------|---------|
| Auth | `AUTH_SERVICE_BASE_URL` | `http://auth-microservice.statex-apps.svc.cluster.local:3370` | Identity, JWT, roles |
| PostgreSQL | `DB_HOST` / `DB_SERVICE_TOKEN` | `db-server-postgres.statex-apps.svc.cluster.local:5432` | Direct ORM connection (Prisma) |
| Logging | `LOGGING_SERVICE_URL` | `http://logging-microservice.statex-apps.svc.cluster.local:3367` | Structured logs |
| Notifications | `NOTIFICATION_SERVICE_BASE_URL` | `http://notifications-microservice.statex-apps.svc.cluster.local:3368` | Email alerts |
| Payments | internal QR generator | — | Czech QR bank payment generation |
| Storage | MinIO | `http://minio-microservice.statex-apps.svc.cluster.local:9000` | Task photos, receipts |

---

## Architecture Constraints (from ADRs in docs/59-risks-and-decisions.md)

- **ADR-001:** Never implement auth internally. Use auth-microservice.
- **ADR-002:** Direct PostgreSQL via ORM (Prisma). Shared instance at `db-server-postgres.statex-apps.svc.cluster.local:5432`.
- **ADR-003:** All secrets from Vault. Never `.env` in production.
- **ADR-004:** QR bank payments for MVP. No Stripe.
- **ADR-005:** No child accounts in MVP.
- **ADR-006:** All documentation stays in `/docs`.

---

## Vault Secret Paths

```
secret/prod/school-committee/auth         → AUTH_SERVICE_CLIENT_SECRET
secret/prod/school-committee/db           → DB_SERVICE_TOKEN  (= DB password)
secret/prod/school-committee/payments     → PAYMENT_WEBHOOK_SECRET, PAYMENT_ACCOUNT_IBAN, PAYMENT_ACCOUNT_NUMBER, PAYMENT_BANK_CODE
secret/prod/school-committee/notifications → SMTP_HOST, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM
secret/prod/school-committee/storage      → STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY, STORAGE_BUCKET
```

## Database Connection

Direct PostgreSQL via Prisma. Construct `DATABASE_URL` at runtime — never hardcode:

```ts
const url = `postgresql://${DB_USER}:${DB_SERVICE_TOKEN}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
```

ConfigMap supplies: `DB_HOST=db-server-postgres`, `DB_PORT=5432`, `DB_USER=dbadmin`, `DB_NAME=school_committee_platform`  
Vault supplies: `DB_SERVICE_TOKEN` (password)

---

## Deploy

```bash
# Build and push
./scripts/deploy.sh

docker build -t localhost:5000/school-committee:latest .
docker push localhost:5000/school-committee:latest

# Apply K8s manifests
kubectl apply -f k8s/ -n statex-apps

# Verify
kubectl get pods -n statex-apps -l app=school-committee
kubectl logs -n statex-apps -l app=school-committee --tail=50
curl https://strilkove.cz/api/health/live
```

---

## RBAC Roles

| Role | Type |
| ---- | ---- |
| parent | domain |
| committee | domain |
| teacher | domain |
| school_staff | domain |
| admin | domain |

Roles managed via auth-microservice RBAC. Use Model B (platform-owned domain roles). Token carries `sub`/`email`/`tenant_id`/`school_id`; platform queries roles from DB service.

---

## Critical Rules for Coding Agents

1. **Never store secrets in code or ConfigMap.** Vault only.
2. **Never implement authentication.** Delegate entirely to auth-microservice.
3. **ORM only for DB access.** Connect via Prisma to `db-server-postgres.statex-apps.svc.cluster.local:5432`. No raw SQL except atomic transactions.
4. **Never expose individual parent payment status publicly.** Aggregated reports only.
5. **Never create child user accounts in MVP.**
6. **QR payment QR codes must be server-generated.** No client-side generation of payment data.
7. **Every mutation must write an audit event** to the `audit_events` table in the same transaction.
8. **Every request must carry `request_id`.** Propagate to all upstream services.
9. **Frontend role checks are UX only.** BFF enforces all authorization.
10. **All docs stay in `/docs`.** Do not create docs elsewhere.

---

## Logging Pattern

POST to `LOGGING_SERVICE_URL/api/logs`:
```json
{
  "service": "school-committee",
  "level": "info",
  "msg": "<message>",
  "request_id": "<uuid>",
  "duration_ms": 42,
  "timestamp": "<ISO8601>"
}
```

---

## Key Docs Quick Reference

The numbered `docs/NN-*.md` files this table used to list do not exist — the
repository moved to the Intent Preservation System layout below. Only the
OpenAPI spec survived under its original path.

| Topic | File |
|-------|------|
| OpenAPI spec | `docs/33-openapi.yaml` |
| Constitution, invariants, agent rules | `docs/00_constitution/` |
| Sensitive data policy | `docs/00_constitution/sensitive-data-policy.md` |
| Data protection record (GDPR) | `docs/00_constitution/data-protection-record.md` |
| Operational gates | `docs/00_constitution/operational-gates.md` |
| Tasks | `docs/11_tasks/` |
| Validation reports, validation debt | `docs/12_validation/` |
| Context packages | `docs/13_context_packages/` |
| Audits | `docs/15_audits/` |
| Templates | `docs/18_templates/` |
| Execution plans | `docs/21_execution_plans/` |
| Goal impact | `docs/22_goal_impact/` |
| Documentation contracts | `docs/23_documentation_contracts/` |

**Data protection.** The internal record of processing lives at
`docs/00_constitution/data-protection-record.md` — processing activities,
lawful basis per purpose, processors, children's data, cookies, subject rights.
The public `/gdpr` page (`app/(public)/gdpr/`) is parent-facing copy, not that
record.

The document is `status: draft` / `completeness_level: partial` on purpose: the
controller's legal identity and every retention period are unresolved
`[MISSING: ...]` markers awaiting owner answers, collected in its "Open
questions for the owner" section. Its §9 lists ten points where the public
`/gdpr` page and the code disagree — read that before editing either one, and
do not reconcile them by changing the page alone.

Because of those markers, `npm run ips:doc-audit` and the deployment-readiness
gate will flag this file until the owner closes the gaps.

## Intent Preservation System

This repository implements the company Intent Preservation System in the numbered `docs/NN_*` layers.

Required chain for future implementation work:

```text
Business intent -> Goal impact -> System constraints -> Task -> Execution plan -> Context package -> Code -> Validation report -> Readiness gate
```

Run `npm run ips:pre-coding` before implementation and `npm run ips:deployment-readiness` before merge, release, deployment, or closure. Do not edit `BUSINESS.md` or `GOALS.md`.
