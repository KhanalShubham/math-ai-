# MathsMentor AI — Progress Log

Living checkpoint file. Updated after each significant change so the project
state is visible without re-scanning the codebase. Newest entry on top.

## Quick Reference

| | |
|---|---|
| **Current Version** | v0.4.0 |
| **Current Branch** | main |
| **Latest Commit** | `1f73876` |
| **Backend Modules Complete** | 4 / 10 |
| **Overall Progress** | ~40% |
| **Test Status** | 111/111 passing (13 suites) |
| **TypeScript** | clean |
| **ESLint** | clean |

**Milestone Progress**
```
████████████░░░░░░░░░░░░░░░░░░ 40%
```

**Active Milestone**
Practice module

**Current Task**
Read DOMAIN_MODEL.md §2.8 (`PracticeSession`) and design `practice.repository.interface.ts`

**Next Task**
Practice service (reuses `domain/grading.evaluateAnswer`, same "compute once, never recompute" rule as Diagnostic; publishes `PracticeAttemptSubmitted`)

**Then**
Mongoose model/repository → Zod validation → controller → routes → unit tests → integration tests → commit

**Project Health**
- ✅ Build passing
- ✅ Tests passing
- ✅ Lint clean
- ✅ Types clean
- ⚠️ OpenAPI incomplete (Student/Curriculum/Diagnostic undocumented)
- ⚠️ Deployment/observability not yet started

**Architecture Status**
- ✅ Stable
- 🔒 Frozen (v1 — see `ARCHITECTURE.md`)
- Last Reviewed: 2026-07-28

**Repository Metrics**
| | |
|---|---|
| Commits | 10 |
| Tests | 111 |
| Suites | 13 |
| Coverage | not measured yet |
| Build | Passing |

**Codebase Size**
| | |
|---|---|
| Source files (`src/`) | 79 |
| Lines of code (`src/`) | ~3,740 |
| Domain modules (`src/modules/`) | 10 (4 implemented, 6 scaffolded) |
| API endpoints | 30 |
| Test files | 14 |

**Module Completion**

| Module | Status | Started | Completed |
|---|---|---|---|
| Auth | ✅ Complete (frozen) | 2026-07-28 or earlier | 2026-07-28 |
| Student | ✅ Complete (frozen) | 2026-07-28 | 2026-07-28 |
| Curriculum | ✅ Complete (frozen) | 2026-07-28 | 2026-07-28 |
| Diagnostic | ✅ Complete (frozen) | 2026-07-28 | 2026-07-28 |
| Practice | 🚧 In Progress | 2026-07-28 | — |
| Teacher | ⏳ Planned | — | — |
| Parent | ⏳ Planned | — | — |
| Notification | ⏳ Planned | — | — |
| Analytics | ⏳ Planned | — | — |
| AI | ⏳ Planned | — | — |

**Production Readiness**
- ☐ OpenAPI complete
- ☐ Docker production image
- ☐ CI/CD
- ☐ Monitoring
- ☐ Logging (structured logging already in place via pino; alerting not yet)
- ☐ Backups
- ☐ Security review

**Backend Roadmap**
```
✅ Foundation
✅ Authentication
✅ Student
✅ Curriculum
✅ Diagnostic
🚧 Practice
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
- Diagnostic module

**Known Risks**
- Practice reuses the exact same `domain/grading` engine and "compute once, never recompute" rule as Diagnostic — any grading change must be validated against both modules' tests, not just one.
- The AI module (`hint`, `tutor`, `recommendation`, `study-plan`) depends on `DiagnosticCompleted`/`MasteryRecord` events existing first — it cannot be usefully started before Practice and the mastery read model.
- `EventBus` is in-process/in-memory only — a process restart drops any in-flight event; fine for day-one, but the event log is not yet durable (ARCHITECTURE.md §21.1 flags this as a deliberate, revisitable choice, not an oversight).
- AI must never receive `answerKey` or ungraded student answers directly — enforced today by `toPublicQuestion`/`select:false`; every new module touching `Question`/grading must preserve this boundary.
- Diagnostic's next-question selection is a simplified heuristic (2 items/topic, difficulty ±1 on correct/incorrect), not a real IRT/adaptive-testing model — fine for a first working version, but the grade/theta mapping in `diagnostic.service.ts` (`mapThetaToGrade`) is a linear placeholder that will need real psychometric backing before this ships to real students.

**Tech Debt**
- `docs/openapi/auth.yaml` is the only OpenAPI spec the server loads at `/docs` — Student, Curriculum, and Diagnostic endpoints aren't documented there yet.
- `domain/grading`'s algebraic grader is a normalized string match against `acceptedForms`, not true symbolic equivalence (e.g. "2x+4" vs "4+2x" would fail) — needs a CAS-backed check eventually.
- `domain/grading`'s multi-step grader is a JSON deep-equality check per step — fine for primitive step answers, not a general structural-equivalence engine.

---

## 2026-07-28 — Diagnostic module complete

**Status:** TypeScript clean · ESLint clean · 111/111 tests passing (13 suites) · committed locally (`1f73876`, not yet pushed)

**Completed this session**
- **`domain/grading`** — the pure correctness engine (`evaluateAnswer`), graded per question type (mcq/numeric/algebraic/multi-step). Zero I/O, zero import path to `infrastructure/ai` (ARCHITECTURE.md §0 constraint #1). Algebraic/multi-step graders are simplified string/deep-equality checks, not true symbolic equivalence — flagged as tech debt above.
- **Diagnostic module** — `DiagnosticAttempt` (DOMAIN_MODEL.md §2.7): bounded embedded `items[]`/`abilityEstimateHistory[]`, one in-progress attempt per student enforced in `startAttempt`, `isCorrect` computed once via `domain/grading` and never recomputed, publishes `DiagnosticCompleted` on completion. Question selection is a simple adaptive heuristic (2 items/topic, difficulty ±1 on correct/incorrect, theta ±0.5 clamped to [-3,3], linear theta→grade mapping) — explicitly documented as a placeholder, not real IRT.
- Removed the stale `src/domain/grading/README.md` and `src/modules/diagnostic/README.md` scaffold placeholders now that both are implemented.
- Fixed a real bug during integration testing: the Mongo repository's `toDiagnosticAttempt` mapper was spreading Mongoose subdocuments (`{...item}`), which silently drops schema-path fields because those accessors live on the prototype, not as own properties — replaced with explicit field-by-field mapping.

**Repo commits so far**
```
1f73876 Add Diagnostic module and domain/grading correctness engine
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
`practice`, `teacher`, `parent`, `notification`, `analytics`, `ai` (hint/ocr/prompt-builder/recommendation/study-plan/tutor)

**Recommended next milestone: Practice module**
`PracticeSession` (DOMAIN_MODEL.md §2.8) — reuses `domain/grading` exactly like Diagnostic, but without the adaptive-selection complexity (student or curriculum picks the topic/question set directly). Publishes `PracticeAttemptSubmitted` for mastery/streak/analytics subscribers, per ARCHITECTURE.md §21.1's domain-events example.

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
