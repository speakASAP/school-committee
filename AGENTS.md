# Repository Agent Instructions

Shared rules live here:

- Codex profile: `/home/ssf/.codex/AGENTS.md`
- Cross-agent standard: `/home/ssf/.ai-agent-standards/CROSS_AGENT_AUTOMATION_STANDARD.md`
- Repository operations: `AGENT_OPERATIONS.md`

Read those first, then follow the repository-specific notes below and the current planning/status files.


## Repository-Specific Notes

# AGENTS.md — school-committee

## Knowledge Retrieval

Use `docs-rag-microservice` for bounded discovery when it is healthy, then
verify deployment, security, database, integration and public-contract facts
against the cited Git source. Git remains authoritative.

Authority and fallback rules:
`/home/ssf/Documents/Github/shared/docs/DOCUMENTATION_AUTHORITY.md`.

Do not generate tokens in documentation or assume an unconfident/failed RAG
response means that source documentation does not exist.

## Agent boundaries

| Agent role | Can do | Cannot do |
|-----------|--------|-----------|
| Coding agent | Implement features per task files | Change docs without instruction |
| Coding agent | Write tests | Modify BUSINESS.md or GOALS.md |
| Coding agent | Create K8s manifests | Write production secrets anywhere |
| Coding agent | Scaffold components | Implement own auth logic |
| Coding agent | Call DB service API | Write directly to PostgreSQL |
| Security reviewer | Read all files | Modify implementation |

## Agent commands

```bash
# Check current task status
cat .claude/tasks/*.md | grep "status:"

# Run tests
npm test

# Type check
npx tsc --noEmit

# Health check (local)
curl http://localhost:4800/api/health/live

# Lint
npm run lint
```

## Coordination

- Tasks live in `.claude/tasks/`
- Each task is self-contained with context, constraints, and acceptance criteria
- Complete one task fully (tests pass) before starting next
- If a task touches auth or payment, consult security checklist first
- Never skip `.claude/checklists/before-coding.md`

## Escalation

Stop and report to human if:
- Auth service contract is unclear or unavailable
- DB service endpoint is missing or returns unexpected schema
- A payment-related change is needed that is not in docs
- A GDPR-impacting data model change is needed
- Two tasks conflict

## Intent Preservation System

Company IPS is implemented in the numbered `docs/NN_*` layers.

Before coding:
- Query docs RAG as documented above, or record why it is unavailable.
- Read `.claude/checklists/before-coding.md`.
- Confirm a task exists under `docs/11_tasks/` with goal impact, invariant impact, sensitive-data classification, contract/schema impact, replay/determinism impact, execution plan, context package, and validation commands.
- Run `npm run ips:pre-coding`.

Before merge, release, deployment, or task closure:
- Run `npm run ips:deployment-readiness`.
- Store gate evidence under `reports/validation/`.

Human-only files remain protected: `BUSINESS.md` and `GOALS.md`.

## Required Reading
Read `BUSINESS.md`, `SYSTEM.md`, `TASKS.md`, `STATE.json`, and the numbered IPS documents before work.

## Authority
Git-tracked project contracts are authoritative; protected intent requires owner approval.

## Safety and Operations
Do not expose secrets, bypass external identity validation, or change deployment policy without pre-existing authorization.

## Project-Specific Rules
Preserve GDPR constraints, school-scoped roles, payment verification, and the MVP exclusions.

## Required Final Report
Report changed files, validation evidence, validation debt, blockers, deviations, and the next concrete action.
