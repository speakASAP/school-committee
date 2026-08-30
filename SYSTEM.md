# SYSTEM.md — school-committee

## Runtime

| Item | Value |
|------|-------|
| Stack | Next.js 14+ App Router, TypeScript strict |
| Deployment | Kubernetes, namespace `statex-apps` |
| Image registry | `localhost:5000/school-committee` |
| Blue port | 4800 |
| Green port | 4801 |
| Domain | `strilkove.cz` |
| Health live | `GET /api/health/live` |
| Health ready | `GET /api/health/ready` |

## Environment Variables

### Non-sensitive (ConfigMap)

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `SERVICE_NAME` | `school-committee` |
| `DOMAIN` | `strilkove.cz` |
| `PORT` | `4800` |
| `APP_BASE_URL` | `https://strilkove.cz` |
| `AUTH_SERVICE_BASE_URL` | `http://auth-microservice.statex-apps.svc.cluster.local:3370` |
| `AUTH_SERVICE_AUDIENCE` | `school-committee` |
| `DB_HOST` | `db-server-postgres` |
| `DB_PORT` | `5432` |
| `DB_USER` | `dbadmin` |
| `DB_NAME` | `school_committee_platform` |
| `LOGGING_SERVICE_URL` | `http://logging-microservice.statex-apps.svc.cluster.local:3367` |
| `LOGGING_SERVICE_API_PATH` | `/api/logs` |
| `NOTIFICATION_SERVICE_BASE_URL` | `http://notifications-microservice.statex-apps.svc.cluster.local:3368` |
| `DEFAULT_LOCALE` | `cs` |
| `SUPPORTED_LOCALES` | `cs,en,ru,uk` |
| `PUBLIC_REPORT_CACHE_TTL_SECONDS` | `300` |

### Secrets (Vault → ESO → K8s Secret)

Vault path prefix: `secret/prod/school-committee/`

| K8s Secret key | Vault path | Description |
|----------------|-----------|-------------|
| `AUTH_SERVICE_CLIENT_SECRET` | `.../auth` | Auth service client secret |
| `DB_SERVICE_TOKEN` | `.../db` | PostgreSQL password (used as DB password in DATABASE_URL) |
| `PAYMENT_WEBHOOK_SECRET` | `.../payments` | Payment webhook verification |
| `PAYMENT_ACCOUNT_IBAN` | `.../payments` | School committee IBAN |
| `PAYMENT_ACCOUNT_NUMBER` | `.../payments` | Czech account number |
| `PAYMENT_BANK_CODE` | `.../payments` | Bank code (e.g. 0800) |
| `SMTP_HOST` | `.../notifications` | Mail server host |
| `SMTP_USER` | `.../notifications` | Mail server user |
| `SMTP_PASSWORD` | `.../notifications` | Mail server password |
| `EMAIL_FROM` | `.../notifications` | Sender address |
| `STORAGE_ACCESS_KEY` | `.../storage` | MinIO/S3 access key |
| `STORAGE_SECRET_KEY` | `.../storage` | MinIO/S3 secret key |
| `STORAGE_BUCKET` | `.../storage` | Storage bucket name |

## K8s Manifests

```
k8s/
  configmap.yaml
  external-secret.yaml
  deployment.yaml
  service.yaml
  ingress.yaml
```

## Deploy commands

```bash
./scripts/deploy.sh
/home/ssf/Documents/Github/shared/scripts/wait-for-rollout.sh -n statex-apps school-committee
```

## Rollback

```bash
kubectl rollout undo deployment/school-committee -n statex-apps
```

## Local dev

```bash
cp .env.example .env.local
# fill in local dev values (fake data only — see docs/19-vault-secrets.md)
npm install
npm run dev
```

## Purpose
Provide the documented mobile-first parent-committee platform.

## Responsibilities
Provide contribution, volunteer-task, feedback, transparency, and school-scoped authorization flows.

## Non-Responsibilities
The service does not issue identities, operate a social feed, or host child accounts in the MVP.

## Inputs
Authenticated requests, PostgreSQL records, configured payment webhooks, and configured integration responses.

## Outputs
Web and BFF responses, QR payment information, stored school-domain records, and structured logs.

## Dependencies
Kubernetes configuration declares auth, PostgreSQL, logging, notifications, AI, and object-storage dependencies.

## Upstream Traceability
This system implements the approved business baseline and vision in `BUSINESS.md` and `docs/01_vision/VISION.md`.

## Downstream Artifacts
The integration contract and bootstrap task chain record runtime decisions and onboarding evidence.

## Validation Criteria
Run the declared tests and type check; verify the live and ready endpoints and integration configuration.

## Open Questions
Future notification sending is explicitly planned through notifications-microservice; no new scope is defined here.
Status: reviewed
completeness_level: complete
