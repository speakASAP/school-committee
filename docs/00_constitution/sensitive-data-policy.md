# Sensitive Data Policy

```yaml
id: IPS-SENSITIVE-DATA-SCHOOL-COMMITTEE
status: approved
owner: ssfskype@gmail.com
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: validated
upstream:
  - BUSINESS.md
  - SYSTEM.md
  - CLAUDE.md
downstream:
  - scripts/ips_pre_coding_gate.py
  - scripts/ips_deployment_readiness_gate.py
related_adrs:
  - docs/59-risks-and-decisions.md
```

## Forbidden content

Do not place production secrets, tokens, passwords, private keys, session cookies, webhook secrets, raw production exports, real parent/child/teacher/school/payment/phone/address/consent records, public individual payment visibility, or child-identifying data in documentation, prompts, tests, logs, screenshots, plans, or reports.

## Allowed test material

Synthetic examples are allowed when clearly fake and minimal.

## Classification

Every task must declare one of: `none`, `synthetic-only`, `personal-data`, `payment-data`, `child-safety`, or `secrets-sensitive`.

## Gate behavior

The IPS gates scan text files for obvious secrets and unresolved sensitive-data markers. A finding blocks readiness until removed or documented as a false positive.
