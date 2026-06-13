# EP-IPS-001: Adopt company Intent Preservation System

```yaml
id: EP-IPS-001
status: done
owner: ssfskype@gmail.com
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: validated
source_task: docs/intent-preservation/tasks/TASK-IPS-001-standard-adoption.md
upstream:
  - docs/intent-preservation/tasks/TASK-IPS-001-standard-adoption.md
downstream:
  - docs/intent-preservation/context-packages/CP-IPS-001-standard-adoption.md
  - docs/intent-preservation/validation/VAL-IPS-001-standard-adoption.md
related_adrs:
  - docs/59-risks-and-decisions.md
```

## Metadata

Documentation/tooling task. Remote repository path: `/home/ssf/Documents/Github/school-committee`.

## Upstream Traceability

Preserves `BUSINESS.md`, `GOALS.md`, `SYSTEM.md`, `AGENTS.md`, `CLAUDE.md`, and the company IPS standard.

## Goal Impact

Supports `GOAL-001`, `GOAL-002`, and `GOAL-003` by making implementation evidence mandatory.

## Project Invariants

All invariants in `docs/intent-preservation/project-invariants.md` apply. This task does not modify runtime code paths.

## Sensitive-Data Handling

Use synthetic-only examples. Do not add production tokens, real parent data, child data, payment records, or secrets.

## Contract Validation Plan

No runtime contract changes. Validate that `docs/33-openapi.yaml` remains untouched and package metadata parses.

## Replay/Determinism Plan

Gate scripts operate from repository file contents and produce deterministic JSON summaries except timestamps.

## Scope

Create IPS docs, templates, gate scripts, validation evidence, and agent-entrypoint references.

## Non-Goals

No runtime behavior, database schema, Kubernetes manifest, auth integration, payment integration, or production deployment change.

## Files to Inspect

`BUSINESS.md`, `GOALS.md`, `SYSTEM.md`, `AGENTS.md`, `CLAUDE.md`, `TASKS.md`, `README.md`, `package.json`, `docs/33-openapi.yaml`.

## Files to Create

`docs/intent-preservation/**`, `scripts/ips_doc_audit.py`, `scripts/ips_pre_coding_gate.py`, `scripts/ips_deployment_readiness_gate.py`, `.claude/checklists/before-coding.md`.

## Files to Modify

`AGENTS.md`, `CLAUDE.md`, `README.md`, `TASKS.md`, `package.json`.

## Files That Must Not Be Modified

`BUSINESS.md`, `GOALS.md`, production secrets, and environment files.

## Implementation Steps

Add IPS documentation and templates, add dependency-free Python gate scripts, add npm scripts, update agent entrypoints, update task index, run validation commands, and record evidence.

## Test Plan

Run `npm run ips:doc-audit`, `npm run ips:pre-coding`, `npm run ips:deployment-readiness`, and `python3 -m json.tool package.json`.

## Validation Plan

Validation passes when all IPS commands pass and reports are written under `reports/validation/`.

## Gate Commands

- `npm run ips:doc-audit`
- `npm run ips:pre-coding`
- `npm run ips:deployment-readiness`

## Documentation Updates

Update `AGENTS.md`, `CLAUDE.md`, `README.md`, `TASKS.md`, and IPS validation docs.

## Rollback Plan

Remove the IPS-created docs, scripts, npm scripts, checklist, and entrypoint references. Do not alter `BUSINESS.md` or `GOALS.md`.

## Agent Handoff Prompt

Use `docs/intent-preservation/context-packages/CP-IPS-001-standard-adoption.md` and run the IPS gates before future coding.

## Completion Checklist

- [x] Protected intent preserved
- [x] IPS docs created
- [x] Gate scripts created
- [x] Agent entrypoints updated
- [x] Task index updated
- [x] Validation evidence created
