# Operational Gates

```yaml
id: IPS-OPERATIONAL-GATES-SCHOOL-COMMITTEE
status: approved
owner: ssfskype@gmail.com
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: validated
upstream:
  - docs/00_constitution/agent-rules.md
  - docs/23_documentation_contracts/documentation-completeness-standard.md
  - docs/00_constitution/sensitive-data-policy.md
downstream:
  - scripts/ips_pre_coding_gate.py
  - scripts/ips_doc_audit.py
  - scripts/ips_deployment_readiness_gate.py
related_adrs: []
```

## Gate types

| Gate | Command | Timing | Blocks on |
|---|---|---|---|
| Documentation audit | `npm run ips:doc-audit` | Before and after documentation/task changes | Missing IPS files, missing sections, unresolved required fields |
| Pre-coding gate | `npm run ips:pre-coding` | Before implementation | Missing task chain, invariant evidence, context package, execution plan, or sensitive-data issues |
| Deployment-readiness gate | `npm run ips:deployment-readiness` | Before release, merge, deployment, or task closure | Failed audit, failed pre-coding gate, missing validation report, protected file changes, unresolved markers |

## Evidence

Gate reports are written to `reports/validation/`.

## Failure policy

A failed gate blocks the next delivery phase. Fix the artifact, create a documented exception, or split the task.
