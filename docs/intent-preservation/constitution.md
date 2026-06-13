# school-committee IPS Constitution

```yaml
id: IPS-CONSTITUTION-SCHOOL-COMMITTEE
status: approved
owner: ssfskype@gmail.com
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: validated
upstream:
  - BUSINESS.md
  - GOALS.md
downstream:
  - docs/intent-preservation/project-invariants.md
  - docs/intent-preservation/agent-rules.md
related_adrs:
  - docs/59-risks-and-decisions.md
```

## Purpose

Preserve the original product intent for the Czech primary school parent committee platform while allowing controlled implementation progress.

## Protected intent

- The platform serves parent committees for financial contributions, volunteer coordination, and feedback.
- MVP excludes social feeds, child accounts, public individual payment visibility, and school-provided parent import.
- Authentication remains delegated to `auth-microservice`; school-domain authorization belongs to this application.
- Production secrets come from Vault through ESO into Kubernetes Secrets.
- Every mutation writes an audit event in the same transaction.
- GDPR and child-safety constraints apply to every feature and artifact.

## Change rule

Agents must not edit `BUSINESS.md` or `GOALS.md`. If implementation discovers a business-intent conflict, stop and report the gap for human review.

## Validation

Run `npm run ips:pre-coding` before implementation and `npm run ips:deployment-readiness` before deployment or closure.
