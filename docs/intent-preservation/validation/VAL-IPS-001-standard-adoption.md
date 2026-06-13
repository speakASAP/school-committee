# VAL-IPS-001: Intent Preservation System adoption

```yaml
id: VAL-IPS-001
status: validated
owner: ssfskype@gmail.com
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: validated
upstream:
  - docs/intent-preservation/tasks/TASK-IPS-001-standard-adoption.md
downstream:
  - reports/validation/ips-doc-audit.json
  - reports/validation/ips-pre-coding-gate.json
  - reports/validation/ips-deployment-readiness-gate.json
related_adrs: []
```

## Artifact validated

IPS adoption for `school-committee`.

## Validation scope

Documentation structure, package scripts, dependency-free gate scripts, protected document handling, and service-local source-of-truth mapping.

## Evidence

Company standard documentation was reviewed from `/Users/Sergej.Stasok/Documents/Gitlab/intent-preservation-system`. Remote repo docs and agent contracts were reviewed. Docs RAG public endpoint returned IPS precedent from company repos.

## Gate evidence

Gate reports are generated under `reports/validation/` by the IPS commands.

## Invariant evidence

`docs/intent-preservation/project-invariants.md` lists preserved auth, DB, Vault, QR payment, child-account, payment privacy, audit-event, request-id, BFF authz, GDPR, and child-safety invariants.

## Sensitive-data scan evidence

The task uses synthetic-only examples and adds no production secrets, parent records, child records, or payment records.

## Replay and determinism evidence

Gate scripts are file-system based and deterministic except timestamp fields in JSON reports.

## Passed criteria

IPS documentation structure exists, future coding workflow is gated, human-only files are protected, and validation evidence path is defined.

## Failed criteria

None after final gate run.

## Deviations

Internal cluster RAG URL failed to resolve from this shell; the public RAG endpoint succeeded.

## Recommendation

Use this IPS workflow for all future coding tasks before editing runtime source.
