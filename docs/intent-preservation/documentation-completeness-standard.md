# Documentation Completeness Standard

```yaml
id: IPS-DOC-COMPLETENESS-SCHOOL-COMMITTEE
status: approved
owner: ssfskype@gmail.com
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: validated
upstream:
  - docs/intent-preservation/README.md
downstream:
  - scripts/ips_doc_audit.py
related_adrs: []
```

## Required metadata

Major IPS documents start with `id`, `status`, `owner`, `created`, `last_updated`, `completeness_level`, `upstream`, `downstream`, and `related_adrs`.

## Completeness levels

Allowed levels are `missing`, `skeletal`, `partial`, `complete`, and `validated`.

## Required task sections

Task documents require Objective, Upstream Links, Goal Impact, Project Invariant Impact, Sensitive-Data Classification, Contract/Schema Impact, Replay/Determinism Impact, Scope, Non-Goals, Acceptance Criteria, Required Context, Validation Task, Required Gates, and Execution Plan Requirement.

## Required execution-plan sections

Execution plans require Metadata, Upstream Traceability, Goal Impact, Project Invariants, Sensitive-Data Handling, Contract Validation Plan, Replay/Determinism Plan, Scope, Non-Goals, Files to Inspect, Files to Create, Files to Modify, Files That Must Not Be Modified, Implementation Steps, Test Plan, Validation Plan, Gate Commands, Documentation Updates, Rollback Plan, Agent Handoff Prompt, and Completion Checklist.

## Required context-package sections

Context packages require Target task, Upstream traceability, Included documents, Excluded documents, Constraints, Agent prompt, and Validation instructions.

## Required validation-report sections

Validation reports require Artifact validated, Validation scope, Evidence, Gate evidence, Invariant evidence, Sensitive-data scan evidence, Replay and determinism evidence, Passed criteria, Failed criteria, Deviations, and Recommendation.

## Missing and unknown markers

Use the approved missing-information marker for required information that must be supplied. Use the approved unknown-information marker for information that exists but cannot be discovered from current context.
