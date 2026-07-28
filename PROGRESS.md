# MathsMentor AI — Progress Log

Living checkpoint file. Updated after each significant change so the project
state is visible without re-scanning the codebase. Newest entry on top.

## Quick Reference

| | |
|---|---|
| **Current Version** | v0.5.0 |
| **Current Branch** | main |
| **Latest Commit** | `78cc9c0` |
| **Backend Modules Complete** | 5 / 10 |
| **Overall Progress** | ~50% |
| **Test Status** | 133/133 passing (15 suites) |
| **TypeScript** | clean |
| **ESLint** | clean |

**Milestone Progress**
```
███████████████░░░░░░░░░░░░░░░ 50%
```

**Active Milestone**
MasteryRecord (student-owned read model, DOMAIN_MODEL.md §2.9)

**Current Task**
Design `mastery.repository.interface.ts` (`findByStudent`, `findByStudentAndTopic`, `upsertFromAttempt` — the ONLY write path) and its Mongoose model, owned by the `student` module

**Next Task**
Event handlers: `mastery.onPracticeItemSubmitted` (subscribes to `PracticeItemSubmitted`) and `mastery.onDiagnosticCompleted` (subscribes to `DiagnosticCompleted`) — these are the only callers permitted to write `MasteryRecord`

**Then**
Read endpoints (student dashboard: `findByStudent`) → unit tests (event handler + repository) → integration tests → commit

**Project Health**
- ✅ Build passing
- ✅ Tests passing
- ✅ Lint clean
- ✅ Types clean
- ⚠️ OpenAPI incomplete (Student/Curriculum/Diagnostic/Practice undocumented)
- ⚠️ Deployment/observability not yet started

**Architecture Status**
- ✅ Stable
- 🔒 Frozen (v1 — see `ARCHITECTURE.md`)
- Last Reviewed: 2026-07-28

**Repository Metrics**
| | |
|---|---|
| Commits | 12 |
| Tests | 133 |
| Suites | 15 |
| Coverage | not measured yet |
| Build | Passing |

**Codebase Size**
| | |
|---|---|
| Source files (`src/`) | 88 |
| Lines of code (`src/`) | ~4,209 |
| Domain modules (`src/modules/`) | 10 (5 implemented, 5 scaffolded) |
| API endpoints | 35 |
| Test files | 16 |

**Module Completion**

| Module | Status | Started | Completed |
|---|---|---|---|
| Auth | ✅ Complete (frozen) | 2026-07-28 or earlier | 2026-07-28 |
| Student | ✅ Complete (frozen)¹ | 2026-07-28 | 2026-07-28 |
| Curriculum | ✅ Complete (frozen) | 2026-07-28 | 2026-07-28 |
| Diagnostic | ✅ Complete (frozen) | 2026-07-28 | 2026-07-28 |
| Practice | ✅ Complete (frozen) | 2026-07-28 | 2026-07-28 |
| Teacher | ⏳ Planned | — | — |
| Parent | ⏳ Planned | — | — |
| Notification | ⏳ Planned | — | — |
| Analytics | ⏳ Planned | — | — |
| AI | ⏳ Planned | — | — |

¹ `MasteryRecord`/`StudyPlan` (DOMAIN_MODEL.md §2.9–2.10) are owned by `student` but not yet built — "frozen" describes `StudentProfile` only; the module reopens narrowly for these two additions, not a full unfreeze.

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
✅ Practice
🚧 MasteryRecord (student module addition)
⬜ Teacher
⬜ Parent
⬜ Analytics
⬜ Notification
⬜ AI
⬜ Deployment
```

**Decisions Frozen** (do not reopen absent a bug or genuine architectural issue):
- Authentication
- Student module (`StudentProfile` only — see footnote above)
- Curriculum module
- Diagnostic module
- Practice module

**Known Risks**
- `MasteryRecord` is the first read model with a hard "only these event handlers may write it" rule (DOMAIN_MODEL.md §2.9) — nothing DB-enforces this, so it depends entirely on code-review discipline holding, same as the prerequisite-DAG cycle check.
- The AI module (`hint`, `tutor`, `recommendation`, `study-plan`) depends on `MasteryRecord` existing first — it cannot be usefully started before this milestone.
- `EventBus` is in-process/in-memory only — a process restart drops any in-flight event; fine for day-one, but the event log is not yet durable (ARCHITECTURE.md §21.1 flags this as a deliberate, revisitable choice, not an oversight). This matters more now that `MasteryRecord` depends on events actually being delivered.
- AI must never receive `answerKey` or ungraded student answers directly — enforced today by `toPublicQuestion`/`select:false`; every new module touching `Question`/grading must preserve this boundary.
- Diagnostic's next-question selection is a simplified heuristic (2 items/topic, difficulty ±1 on correct/incorrect), not a real IRT/adaptive-testing model — fine for a first working version, but the grade/theta mapping in `diagnostic.service.ts` (`mapThetaToGrade`) is a linear placeholder that will need real psychometric backing before this ships to real students.

**Tech Debt**
- `docs/openapi/auth.yaml` is the only OpenAPI spec the server loads at `/docs` — Student, Curriculum, Diagnostic, and Practice endpoints aren't documented there yet.
- `domain/grading`'s algebraic grader is a normalized string match against `acceptedForms`, not true symbolic equivalence (e.g. "2x+4" vs "4+2x" would fail) — needs a CAS-backed check eventually.
- `domain/grading`'s multi-step grader is a JSON deep-equality check per step — fine for primitive step answers, not a general structural-equivalence engine.

---

## 2026-07-28 — Practice module complete

**Status:** TypeScript clean · ESLint clean · 133/133 tests passing (15 suites) · committed locally (`78cc9c0`, not yet pushed)

**Completed this session**
- **Practice module** — `PracticeSession` (DOMAIN_MODEL.md §2.8), structurally parallel to `DiagnosticAttempt` but without the adaptive ability trace/finalGradeEstimate/topicBreakdown (a plain practice session has none of those). Reuses `domain/grading.evaluateAnswer` directly and the same "compute once, never recompute" rule. Publishes `PracticeItemSubmitted` per item (fine-grained, unlike Diagnostic's once-at-completion event).
- Two deliberate deviations from a literal DiagnosticRepository mirror, both documented in code: (1) starting a session does not reject on an existing in-progress one — practice is casual/frequent, `findInProgressForStudent` exists for "resume" reads, not a one-at-a-time constraint; (2) the student-facing route only accepts `source` in `{self_selected, ai_recommended}` — `teacher_assigned` requires `assignedByTeacherId` and has no creation path yet since no teacher module exists, but the type/schema already support it.
- Removed the stale `src/modules/practice/README.md` scaffold placeholder.

**Repo commits so far**
```
78cc9c0 Add Practice module (PracticeSession)
1f73876 Add Diagnostic module and domain/grading correctness engine
```
(see the Diagnostic entry below for the full history before this point)

**Scaffolded but NOT implemented yet** (README-only placeholders in `src/modules/`):
`teacher`, `parent`, `notification`, `analytics`, `ai` (hint/ocr/prompt-builder/recommendation/study-plan/tutor). `MasteryRecord`/`StudyPlan` (owned by `student`, DOMAIN_MODEL.md §2.9–2.10) also remain unbuilt.

**Recommended next milestone: MasteryRecord**
An event-handler-write-only read model owned by `student` (DOMAIN_MODEL.md §2.9) — `mastery.onPracticeItemSubmitted`/`mastery.onDiagnosticCompleted` are the only permitted writers, enforced by code-review convention, not the database. This unblocks the AI module (`recommendation`, `study-plan`), which needs mastery data to exist before it has anything to reason about.

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
