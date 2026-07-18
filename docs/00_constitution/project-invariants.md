# Project Invariants

```yaml
id: IPS-INVARIANTS-SCHOOL-COMMITTEE
status: approved
owner: ssfskype@gmail.com
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: validated
upstream:
  - BUSINESS.md
  - GOALS.md
  - SYSTEM.md
  - CLAUDE.md
downstream:
  - docs/00_constitution/agent-rules.md
  - docs/00_constitution/operational-gates.md
related_adrs:
  - docs/59-risks-and-decisions.md
```

## Purpose

Declare constraints that must survive task execution, refactors, and deployment work.

## Invariants

| ID | Invariant | Source |
|---|---|---|
| INV-001 | Do not implement authentication internally; use `auth-microservice`. | `CLAUDE.md` |
| INV-002 | Use Prisma/ORM for PostgreSQL access; raw SQL only for justified atomic transactions. | `CLAUDE.md` |
| INV-003 | Production secrets must come from Vault through ESO; never commit secrets or production `.env` values. | `SYSTEM.md` |
| INV-004 | MVP uses QR bank payments, not Stripe. | `CLAUDE.md` |
| INV-005 | Do not create child user accounts in MVP. | `BUSINESS.md` |
| INV-006 | Never expose individual parent payment status publicly. | `CLAUDE.md` |
| INV-007 | Every mutation must write an audit event in the same transaction. | `CLAUDE.md` |
| INV-008 | Every request carries and propagates `request_id`. | `CLAUDE.md` |
| INV-009 | Frontend role checks are UX only; BFF enforces authorization. | `CLAUDE.md` |
| INV-010 | GDPR and child-safety handling must be declared for every relevant task. | `BUSINESS.md` |

## Exceptions

Exceptions require human approval and a documented validation report. Agents may not silently weaken an invariant to pass a gate.
