# Before Coding Checklist

Run this checklist before implementation work in `school-committee`.

- [ ] Query docs RAG, or record why it is unavailable.
- [ ] Read `BUSINESS.md`, `GOALS.md`, `SYSTEM.md`, `AGENTS.md`, `CLAUDE.md`, `TASKS.md`, and relevant `/docs` files.
- [ ] Identify the task artifact under `docs/11_tasks/`.
- [ ] Confirm upstream links and goal impact exist.
- [ ] Confirm project invariant impact is declared.
- [ ] Confirm sensitive-data classification is declared.
- [ ] Confirm contract/schema impact is declared.
- [ ] Confirm replay/determinism impact is declared.
- [ ] Confirm execution plan and context package exist.
- [ ] Confirm validation commands and report target exist.
- [ ] Run `npm run ips:pre-coding`.
- [ ] Do not edit `BUSINESS.md` or `GOALS.md`.
