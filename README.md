# School Committee Platform

Mobile-first web platform for Czech primary school parent committees. Parents can contribute financially (QR bank payments), volunteer for tasks, and submit feedback. Committee gets transparency tools. No social feeds, no child accounts in MVP.

This repository is a documentation-first implementation template.

All product, architecture, API, legal, security, UX, database, backlog and implementation documentation is located in:

```text
/docs
```

The repository is designed so that a coding agent can start implementation from the documents without requiring additional product clarification.



## Auth and Local Authorization Contract

School Committee delegates authentication to `auth-microservice`. The BFF validates Auth-issued access tokens through `POST /auth/validate` using `AUTH_SERVICE_BASE_URL`; Auth remains the authority for identity, login, JWT issuance, refresh, password reset, and global/application RBAC claims.

School Committee owns school-domain authorization after identity validation. Local roles such as `parent`, `committee`, `teacher`, `school_staff`, and `admin` are stored in this service's `user_roles` table, scoped by tenant or school, and enforced by School Committee route guards. Profile approval state is stored in this service's `profiles.approval_status` workflow.

Do not describe these local roles or approval states as Auth RBAC enforcement. Auth proves who the user is; School Committee decides whether that user is approved for a school and which local school actions they may perform.

## Setup

```bash
cp .env.example .env.local
# Fill in values — see docs/19-vault-secrets.md for guidance
npm install
```

Health checks:
- `GET /api/health/live` — liveness probe
- `GET /api/health/ready` — readiness probe (checks env var presence)

Run tests:
```bash
npm test             # Vitest unit tests
npm run type-check   # TypeScript strict mode check
```

## Existing infrastructure assumptions

The target environment already has:

- Kubernetes cluster
- Vault for secrets
- External authentication microservice
- External database microservice
- CI/CD pipeline
- Ingress/TLS infrastructure

This repository therefore documents:

- frontend and BFF responsibilities
- contracts with existing auth service
- contracts with existing DB service
- QR bank payment flow for Czechia
- GDPR and child-data handling
- implementation backlog
- agent-ready development tasks

## Intent Preservation

The company Intent Preservation System is implemented in the numbered `docs/NN_*` layers. Future implementation work must have task traceability, goal impact, invariant impact, sensitive-data classification, contract/schema impact, replay/determinism impact, an execution plan, a context package, validation evidence, and passing IPS gates.

```bash
npm run ips:doc-audit
npm run ips:pre-coding
npm run ips:deployment-readiness
```

## Status
Status: completed-frozen; the documented platform has no active implementation task.

## Documentation Authority
Git-tracked project documents and runtime manifests are authoritative; `docs/` contains the implementation material.

## Capabilities
Parents can make QR bank-payment contributions, volunteer for tasks, and submit feedback; committee users receive transparency tools.

## Interfaces
The web/BFF uses auth-microservice, PostgreSQL, logging-microservice, notifications-microservice, ai-microservice, and configured object storage.

## Development
Use `npm test` and `npm run type-check` after installing dependencies.

## Configuration
Copy `.env.example` for local development; production configuration is supplied by ConfigMap and Vault through External Secrets.

## Deployment
Kubernetes manifests in `k8s/` define the statex-apps deployment for `strilkove.cz`.

## Health and Observability
Liveness is `/api/health/live`; readiness is `/api/health/ready`; logs are configured for logging-microservice.
