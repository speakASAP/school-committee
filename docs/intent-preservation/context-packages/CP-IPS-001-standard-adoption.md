# CP-IPS-001: Adopt company Intent Preservation System

## Target task

`docs/intent-preservation/tasks/TASK-IPS-001-standard-adoption.md`

## Upstream traceability

`BUSINESS.md`, `GOALS.md`, `SYSTEM.md`, `AGENTS.md`, `CLAUDE.md`, `TASKS.md`, company IPS docs, and RAG precedent from company repos.

## Included documents

Root contracts, OpenAPI, and all files under `docs/intent-preservation/`.

## Excluded documents

Runtime source files unless a future task names them. `BUSINESS.md` and `GOALS.md` are read-only human-owned source documents.

## Constraints

Do not add secrets or production data. Do not change runtime behavior. Do not deploy solely for this documentation/tooling adoption unless a human asks.

## Agent prompt

Implement or maintain the IPS chain for school-committee. Preserve protected business intent, add missing task artifacts before coding, run gates, and record validation evidence.

## Validation instructions

Run the IPS npm scripts and inspect reports under `reports/validation/`.
