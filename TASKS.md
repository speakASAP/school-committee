# TASKS.md — school-committee

Backlog max 30 items. Each task needs a goal reference.

| ID | Title | Status | Goal refs | File |
|----|-------|--------|-----------|------|
| 001 | Repository scaffold | done | GOAL-001 | `.claude/tasks/001-repository-scaffold.md` |
| 002 | Auth integration | done | GOAL-001 | `.claude/tasks/002-auth-integration.md` |
| 003 | DB service client | done | GOAL-001 | `.claude/tasks/003-db-service-client.md` |
| 004 | Vault config | done | GOAL-001 | `.claude/tasks/004-vault-config.md` |
| 005 | Kubernetes manifests | done | GOAL-001 | `.claude/tasks/005-kubernetes-manifests.md` |
| 006 | QR payment generator | done | GOAL-002 | `.claude/tasks/006-qr-payment-generator.md` |
| 007 | Onboarding flow | done | GOAL-001 | `.claude/tasks/007-onboarding-flow.md` |
| 008 | Task module | done | GOAL-001 | `.claude/tasks/008-task-module.md` |
| 009 | Feedback module | done | GOAL-001 | `.claude/tasks/009-feedback-module.md` |
| 010 | Admin panel | done | GOAL-001, GOAL-002 | `.claude/tasks/010-admin-panel.md` |
| 011 | Landing page + lead capture | done | GOAL-001 | `.claude/tasks/011-landing-page-lead-capture.md` |
| 012 | Volunteer task showcase | done | GOAL-001 | (included in 011) |
| 013 | Lead confirmation UX | done | GOAL-001 | (included in 011) |
| 014 | SMS / email-link / Telegram / WhatsApp confirmation sending | planned | GOAL-001 | (future notifications-microservice) |
| 015 | Company Intent Preservation System adoption | done | GOAL-001, GOAL-002, GOAL-003 | `docs/11_tasks/TASK-IPS-001-standard-adoption.md` |

## Safe start order

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11

## Intent preservation requirement

Future implementation tasks must have matching IPS artifacts under the numbered `docs/NN_*` layers: task, goal impact record, execution plan, context package, and validation report. Run `npm run ips:pre-coding` before source edits and `npm run ips:deployment-readiness` before closure.

## Project Completion Marker

- 2026-06-21: Project marked completed/frozen after remote inventory. There are no active goals, active plans, open tasks, blockers, or pending human/AI actions. Do not ask for a new goal during routine status checks unless the owner explicitly creates one.
