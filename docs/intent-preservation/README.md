# Intent Preservation System for school-committee

```yaml
id: IPS-SCHOOL-COMMITTEE
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
  - docs/intent-preservation/operational-gates.md
related_adrs:
  - docs/59-risks-and-decisions.md
```

## Purpose

This directory implements the company Intent Preservation System (IPS) for `school-committee`. The standard preserves intent from business goal through task, execution plan, context package, code, validation evidence, and readiness gates.

## Source-of-truth mapping

| IPS concept | school-committee source |
|---|---|
| Protected business intent | `BUSINESS.md`, `GOALS.md` |
| Runtime/system contract | `SYSTEM.md`, `CLAUDE.md`, `docs/33-openapi.yaml` |
| Agent rules | `AGENTS.md`, `docs/intent-preservation/agent-rules.md` |
| Task index | `TASKS.md`, `docs/intent-preservation/tasks/` |
| Execution plans | `docs/intent-preservation/execution-plans/` |
| Context packages | `docs/intent-preservation/context-packages/` |
| Goal impact records | `docs/intent-preservation/goal-impact/` |
| Validation reports | `docs/intent-preservation/validation/` |
| Gate reports | `reports/validation/` |

## Required delivery chain

```text
Business intent -> Goal impact -> System constraints -> Task -> Execution plan -> Context package -> Code -> Validation report -> Readiness gate
```

Coding work is not ready until the task has upstream links, goal impact, invariant impact, sensitive-data classification, contract/schema impact, replay/determinism impact, an execution plan, a context package, and validation commands.
