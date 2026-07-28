# MathsMentor AI — Progress Log

Living checkpoint file. Updated after each significant change so the project
state is visible without re-scanning the codebase. Newest entry on top.

## Quick Reference

| | |
|---|---|
| **Current Version** | v0.3.0 |
| **Current Branch** | main |
| **Latest Commit** | `1c606d2` |
| **Backend Modules Complete** | 3 / 10 |
| **Overall Progress** | ~30% |
| **Test Status** | 86/86 passing (10 suites) |
| **TypeScript** | clean |
| **ESLint** | clean |

**Milestone Progress**
```
██████████░░░░░░░░░░░░░░░░░░░░ 30%
```

**Active Milestone**
Diagnostic module

**Current Task**
Implement `DiagnosticAttempt` repository (DOMAIN_MODEL.md §2.7): `diagnostic.repository.interface.ts` + Mongoose model/repository

**Next Task**
Diagnostic service (grading hook, `findInProgressForStudent` enforcement, `DiagnosticCompleted` event)

**Then**
Zod validation → controller → routes → unit tests → integration tests → commit

**Project Health**
- ✅ Build passing
- ✅ Tests passing
- ✅ Lint clean
- ✅ Types clean
- ⚠️ OpenAPI incomplete (Student/Curriculum undocumented)
- ⚠️ Deployment/observability not yet started

**Architecture Status**
- ✅ Stable
- 🔒 Frozen (v1 — see `ARCHITECTURE.md`)
- Last Reviewed: 2026-07-28

**Repository Metrics**
| | |
|---|---|
| Commits | 8 |
| Tests | 86 |
| Suites | 10 |
| Coverage | not measured yet |
| Build | Passing |

**Module Completion**

| Module | Status |
|---|---|
| Auth | ✅ Complete (frozen) |
| Student | ✅ Complete (frozen) |
| Curriculum | ✅ Complete (frozen) |
| Diagnostic | 🚧 In Progress |
| Practice | ⏳ Planned |
| Teacher | ⏳ Planned |
| Parent | ⏳ Planned |
| Notification | ⏳ Planned |
| Analytics | ⏳ Planned |
| AI | ⏳ Planned |

**Backend Roadmap**
```
✅ Foundation
✅ Authentication
✅ Student
✅ Curriculum
🚧 Diagnostic
⬜ Practice
⬜ Teacher
⬜ Parent
⬜ Analytics
⬜ Notification
⬜ AI
⬜ Deployment
```

**Decisions Frozen** (do not reopen absent a bug or genuine architectural issue):
- Authentication
- Student module
- Curriculum module

**Known Risks**
- Diagnostic's grading/scoring logic will shape Practice's design (same `domain/grading` strategies, same "compute once, never recompute" rule) — get Diagnostic right before starting Practice.
- The AI module (`hint`, `tutor`, `recommendation`, `study-plan`) depends on `DiagnosticCompleted`/`MasteryRecord` events existing first — it cannot be usefully started before Diagnostic and the mastery read model.
- `EventBus` is in-process/in-memory only — a process restart drops any in-flight event; fine for day-one, but the event log is not yet durable (ARCHITECTURE.md §21.1 flags this as a deliberate, revisitable choice, not an oversight).
- AI must never receive `answerKey` or ungraded student answers directly — enforced today by `toPublicQuestion`/`select:false`; every new module touching `Question`/grading must preserve this boundary.

**Tech Debt**
- `docs/openapi/auth.yaml` is the only OpenAPI spec the server loads at `/docs` — Student and Curriculum endpoints aren't documented there yet.

---

## 2026-07-28 — Curriculum module complete

**Status:** TypeScript clean · ESLint clean · 86/86 tests passing (10 suites) · pushed to `origin/main` (`1c606d2`)

**Completed this session**
- **Curriculum module** (`c027d58`) — `Topic` (prerequisite DAG, cycle-checked in `curriculum.service.addPrerequisite` via BFS before write — MongoDB can't express that constraint) and `Question` (answerKey `select:false` at the schema level, stripped by `toPublicQuestion` everywhere except the admin-only internal read path). All authoring routes (create/publish/retire/prerequisites) are admin-only; reads open to any authenticated role.
- Removed the stale `src/modules/curriculum/README.md` scaffold placeholder now that it's implemented.
- `4ee5b82` — restructured this file with a Quick Reference block per the agreed workflow: read progress.md → confirm active milestone → implement only that milestone → update progress.md → run TypeScript/ESLint/tests → commit → repeat.
- `1c606d2` — extended the Quick Reference with roadmap, health, metrics, risks, and module-completion sections (reviewer feedback).

**Repo commits so far**
```
1c606d2 Extend PROGRESS.md with roadmap, health, risks, and metrics sections
4ee5b82 Add PROGRESS.md checkpoint log and update for Curriculum module
c027d58 Add Curriculum module (Topic graph + Question bank)
f484bb5 Add Student module (profile CRUD, class/parent lookups)
b66b1f4 Add root .gitignore
6275d87 Move email/password-reset tokens to a dedicated VerificationToken collection
ad0607c first commit
38296b5 Backend foundation and Authentication module complete
```

**Scaffolded but NOT implemented yet** (README-only placeholders in `src/modules/`):
`diagnostic`, `practice`, `teacher`, `parent`, `notification`, `analytics`, `ai` (hint/ocr/prompt-builder/recommendation/study-plan/tutor)

**Recommended next milestone: Diagnostic module**
`DiagnosticAttempt` (DOMAIN_MODEL.md §2.7) — embeds its own `DiagnosticItem[]` (bounded, ~15-25 items, never queried independently of the attempt). Key rules to carry in: only one in-progress attempt per student (`findInProgressForStudent`), `isCorrect` computed once at submission by `domain/grading` and never recomputed later, and it publishes `DiagnosticCompleted` for `MasteryRecord`/`StudyPlan` to react to asynchronously.

---

## 2026-07-28 — Student module complete

**Status:** TypeScript clean · ESLint clean · 62/62 tests passing (8 suites) · pushed to `origin/main` (`f484bb5`)

**Completed milestones**
- Architecture (`ARCHITECTURE.md`) and Domain Model (`DOMAIN_MODEL.md`) — foundational docs
- Backend scaffolding (Express app, error handling, logging, event bus, job queue, Mongo persistence, container/DI)
- **Authentication module** — complete and frozen: register/login/refresh/logout/logout-all, JWT access tokens, refresh-token rotation with theft detection, password reset, email verification, account lockout. Token storage refactored into a dedicated `VerificationToken` collection (mirrors `RefreshToken`) instead of ad hoc fields on `User`.
- **Student module** — complete: profile create/read/update, class/parent lookups, `currentEstimatedGrade` locked to a single write path (`updateEstimatedGrade`) reserved for the future mastery event handler.
- Root `.gitignore` added.

**Repo commits so far**
```
f484bb5 Add Student module (profile CRUD, class/parent lookups)
b66b1f4 Add root .gitignore
6275d87 Move email/password-reset tokens to a dedicated VerificationToken collection
ad0607c first commit
38296b5 Backend foundation and Authentication module complete
```

**Scaffolded but NOT implemented yet** (README-only placeholders in `src/modules/`):
`curriculum`, `diagnostic`, `practice`, `teacher`, `parent`, `notification`, `analytics`, `ai` (hint/ocr/prompt-builder/recommendation/study-plan/tutor)

**Architecture decisions to remember**
- One owning module per collection; other modules read only via that module's service, never a second repository over the same collection.
- Manual composition root (`container.ts`), no DI framework.
- Repositories are behavior-oriented (e.g. `updateEstimatedGrade`, not generic `update`) to prevent accidental writes to fields with special rules.
- Domain events via an in-process `EventBus` (`AUTH_EVENTS`, `STUDENT_EVENTS`), swappable later for a durable/outbox implementation without touching call sites.

**Known follow-ups (not blocking)**
- `docs/openapi/auth.yaml` is the only OpenAPI spec the server loads at `/docs` — Student endpoints aren't documented there yet.

**Recommended next milestone: Curriculum module**
Topic graph + Question bank (DOMAIN_MODEL.md §2.5–2.6). Diagnostic and Practice both reference `Question`/`DiagnosticItem`/`PracticeItem`, so Curriculum must come before either.

Suggested build order (same pattern as Student): repository interface → Mongoose model/repository → service → Zod validation → controller → routes → unit tests → integration tests → commit.

---
