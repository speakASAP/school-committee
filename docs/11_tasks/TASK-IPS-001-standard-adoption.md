# TASK-IPS-001: Adopt company Intent Preservation System

```yaml
id: TASK-IPS-001
status: done
owner: ssfskype@gmail.com
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: validated
upstream:
  - BUSINESS.md
  - GOALS.md
  - AGENTS.md
  - CLAUDE.md
downstream:
  - docs/21_execution_plans/EP-IPS-001-standard-adoption.md
related_adrs:
  - docs/59-risks-and-decisions.md
goal_impact: docs/22_goal_impact/GOAL-IMPACT-IPS-001-standard-adoption.md
execution_plan: docs/21_execution_plans/EP-IPS-001-standard-adoption.md
context_package: docs/13_context_packages/CP-IPS-001-standard-adoption.md
```

## Objective

Implement the company IPS standard in the remote `school-committee` repository with service-local governance docs, templates, gates, and validation evidence.

## Upstream Links

`BUSINESS.md`, `GOALS.md`, `AGENTS.md`, `CLAUDE.md`, `SYSTEM.md`, and the company standard at `/Users/Sergej.Stasok/Documents/Gitlab/intent-preservation-system`.

## Goal Impact

Supports `GOAL-001`, `GOAL-002`, and `GOAL-003` by making future delivery traceable and blocking work that violates MVP, payment, transparency, auth, GDPR, or child-safety constraints.

## Project Invariant Impact

Applies all invariants in `docs/00_constitution/project-invariants.md`. No runtime invariant is changed by this documentation/tooling task.

## Sensitive-Data Classification

`synthetic-only`. The task creates documentation and scripts only.

## Contract/Schema Impact

No runtime API, database, event, auth, payment, or Kubernetes contract changes.

## Replay/Determinism Impact

Gate scripts are deterministic over repository files and write JSON reports to `reports/validation/`.

## Scope

Add IPS documentation, templates, gate scripts, npm commands, agent entrypoint references, task index updates, and validation evidence.

## Non-Goals

Do not edit `BUSINESS.md` or `GOALS.md`. Do not change runtime behavior. Do not deploy application changes.

## Acceptance Criteria

IPS structure exists, future coding is gated, IPS commands are available, and validation evidence records adoption.

## Required Context

Read `BUSINESS.md`, `GOALS.md`, `SYSTEM.md`, `AGENTS.md`, `CLAUDE.md`, `TASKS.md`, `docs/33-openapi.yaml`, and the numbered `docs/NN_*` layers.

## Validation Task

Run the IPS audit and gates. Record unavailable external context, if any, in validation evidence.

## Required Gates

- `npm run ips:doc-audit`
- `npm run ips:pre-coding`
- `npm run ips:deployment-readiness`

## Execution Plan Requirement

Execution plan: `docs/21_execution_plans/EP-IPS-001-standard-adoption.md`.
