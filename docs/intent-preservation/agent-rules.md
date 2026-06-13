# IPS Agent Rules

```yaml
id: IPS-AGENT-RULES-SCHOOL-COMMITTEE
status: approved
owner: ssfskype@gmail.com
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: validated
upstream:
  - AGENTS.md
  - CLAUDE.md
  - docs/intent-preservation/constitution.md
  - docs/intent-preservation/project-invariants.md
downstream:
  - .claude/checklists/before-coding.md
  - docs/intent-preservation/operational-gates.md
related_adrs:
  - docs/59-risks-and-decisions.md
```

## Required workflow

Before coding, an agent must query docs RAG or record why unavailable, read root contracts and IPS docs, verify task traceability, run `npm run ips:pre-coding`, implement only execution-plan scope, write validation evidence, and run `npm run ips:deployment-readiness` before closure.

## Immutable and human-only files

Agents must not edit `BUSINESS.md` or `GOALS.md`.

## Gap behavior

If required information can be derived from approved upstream docs, add it and cite the source path. If not, use the approved missing-information marker or unknown-information marker.

## Forbidden behavior

Do not invent business goals, skip execution plans or validation, store secrets or production data, or change auth/payment/GDPR/child-safety/deployment contracts without an approved task.
