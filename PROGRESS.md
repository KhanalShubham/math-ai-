# MathsMentor AI — Progress Log

Living checkpoint file. Updated after each significant change so the project
state is visible without re-scanning the codebase. Newest entry on top.

**Workflow for every milestone:** read this file → confirm the active milestone → read only the required architecture/domain sections → implement one complete module → run TypeScript + ESLint + unit tests + integration tests → commit → update this file → push → stop. No exceptions.

**Standard entry template** for each dated section below:
```
## YYYY-MM-DD — <Module> complete

**Status:** TypeScript ✅ · ESLint ✅ · Tests ✅ (N/N, M suites) · commit `<hash>`

**Completed**
- ...

**Architecture decisions**
- ... (link an AD-NNN if it introduced or confirmed one)

**Known technical debt**
- ...

**Next milestone**
- ...
```

## Quick Reference

| | |
|---|---|
| **Current Version** | v0.6.0 |
| **Current Branch** | main |
| **Latest Commit** | `21028be` |
| **Backend Modules Complete** | 5 / 10 (+ MasteryRecord read model) |
| **Overall Progress** | ~55% |
| **Test Status** | 143/143 passing (17 suites) |
| **TypeScript** | clean |
| **ESLint** | clean |

**Milestone Progress**
```
████████████████░░░░░░░░░░░░░░ 55%
```

**Active Milestone**
Teacher module

**Current Task**
Read DOMAIN_MODEL.md §2.4 (`School`/`ClassGroup`) and design `teacher.repository.interface.ts` — note the `teacher` module owns both `TeacherProfile` (§2.3) and `School`/`ClassGroup` (§2.4)

**Next Task**
`membershipHistory` handling on `ClassGroup` (append-only — close with `leftAt`, never mutate a past entry) and the two-aggregate parent-link contract from §2.3 (`ParentProfile` owns link creation, calls `student.service.addParentLink`, already implemented and waiting to be called)

**Then**
Mongoose models/repositories → service → Zod validation → controller → routes → unit tests → integration tests → commit

**Project Health**
- ✅ Build passing
- ✅ Tests passing
- ✅ Lint clean
- ✅ Types clean
- ⚠️ OpenAPI incomplete (Student/Curriculum/Diagnostic/Practice/Mastery undocumented)
- ⚠️ Deployment/observability not yet started

**Architecture Status**
- ✅ Stable
- 🔒 Frozen (v1 — see `ARCHITECTURE.md`)
- Last Reviewed: 2026-07-28

**Repository Metrics**
| | |
|---|---|
| Commits | 13 |
| Tests | 143 |
| Suites | 17 |
| Coverage | not measured yet |
| Build | Passing |

**Codebase Size**
| | |
|---|---|
| Source files (`src/`) | 93 |
| Lines of code (`src/`) | ~4,447 |
| Domain modules (`src/modules/`) | 10 (5 implemented, 5 scaffolded) |
| API endpoints | 36 |
| Test files | 18 |

**Module Completion**

| Module | Status | Started | Completed |
|---|---|---|---|
| Auth | ✅ Complete (frozen) | 2026-07-28 or earlier | 2026-07-28 |
| Student | ✅ Complete (frozen)¹ | 2026-07-28 | 2026-07-28 |
| Curriculum | ✅ Complete (frozen) | 2026-07-28 | 2026-07-28 |
| Diagnostic | ✅ Complete (frozen) | 2026-07-28 | 2026-07-28 |
| Practice | ✅ Complete (frozen) | 2026-07-28 | 2026-07-28 |
| MasteryRecord (student addition) | ✅ Complete | 2026-07-28 | 2026-07-28 |
| Teacher | 🚧 In Progress | 2026-07-28 | — |
| Parent | ⏳ Planned | — | — |
| Notification | ⏳ Planned | — | — |
| Analytics | ⏳ Planned | — | — |
| AI | ⏳ Planned | — | — |

¹ `StudyPlan` (DOMAIN_MODEL.md §2.10) is still owned by `student` but not yet built — "frozen" describes `StudentProfile` + `MasteryRecord`; the module reopens narrowly for that one addition, not a full unfreeze.

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
✅ MasteryRecord
🚧 Teacher
⬜ Parent
⬜ Analytics
⬜ Notification
⬜ AI
⬜ Deployment
```

**Decisions Frozen** (do not reopen absent a bug or genuine architectural issue):
- Authentication
- Student module (`StudentProfile` + `MasteryRecord` — see footnote above)
- Curriculum module
- Diagnostic module
- Practice module

**Known Risks**
- `MasteryRecord` is the first read model with a hard "only these event handlers may write it" rule (DOMAIN_MODEL.md §2.9) — nothing DB-enforces this, so it depends entirely on code-review discipline holding, same as the prerequisite-DAG cycle check.
- The Teacher module's `ClassGroup.activeStudentIds` and `StudentProfile.classIds` need to stay in sync — DOMAIN_MODEL.md doesn't fully specify this two-aggregate write path the way it does for the parent-link case (§2.3), so this needs a deliberate design decision, not an assumption, before coding it.
- The AI module (`hint`, `tutor`, `recommendation`, `study-plan`) can now read real `MasteryRecord` data, but still has no consumer built — it remains blocked on product scope, not data availability.
- `EventBus` is in-process/in-memory only — a process restart drops any in-flight event; fine for day-one, but the event log is not yet durable (ARCHITECTURE.md §21.1 flags this as a deliberate, revisitable choice, not an oversight). This matters more now that `MasteryRecord` depends on events actually being delivered.
- AI must never receive `answerKey` or ungraded student answers directly — enforced today by `toPublicQuestion`/`select:false`; every new module touching `Question`/grading must preserve this boundary.
- Diagnostic's next-question selection is a simplified heuristic (2 items/topic, difficulty ±1 on correct/incorrect), not a real IRT/adaptive-testing model — fine for a first working version, but the grade/theta mapping in `diagnostic.service.ts` (`mapThetaToGrade`) is a linear placeholder that will need real psychometric backing before this ships to real students.

**Tech Debt**
- `docs/openapi/auth.yaml` is the only OpenAPI spec the server loads at `/docs` — Student, Curriculum, Diagnostic, Practice, and Mastery endpoints aren't documented there yet.
- `domain/grading`'s algebraic grader is a normalized string match against `acceptedForms`, not true symbolic equivalence (e.g. "2x+4" vs "4+2x" would fail) — needs a CAS-backed check eventually.
- `domain/grading`'s multi-step grader is a JSON deep-equality check per step — fine for primitive step answers, not a general structural-equivalence engine.
- `mastery.service`'s diagnostic-completion bootstrap approximates a fractional `topicBreakdown` score as pass/fail against a 0.5 threshold (`upsertFromAttempt` only accepts a boolean) — loses the fractional granularity DOMAIN_MODEL.md's diagnostic breakdown actually carries.

---

## Architecture Decisions Log

Permanent record of major design decisions — the "why," not just the "what." Add a new AD-NNN entry when a decision is made that a future contributor could plausibly second-guess or accidentally undo; don't log routine implementation choices.

### AD-001 — Repositories are behavior-oriented, not CRUD
`updateEstimatedGrade(studentId, grade)`, not a generic `update(student)`. Prevents accidental writes to fields with special rules (e.g. `currentEstimatedGrade`, `answerKey`) by construction, not by convention alone.
**Status:** Frozen

### AD-002 — One module owns one collection
Every collection has exactly one owning module's repository as its only sanctioned write path. Other modules read only through that module's *service*, never a second repository over the same collection.
**Status:** Frozen

### AD-003 — AI never grades
`domain/grading` has no import path to `infrastructure/ai` at all — not a policy, a structural fact about the codebase. Correctness is deterministic and auditable; AI is enrichment (hints, explanations), never the source of truth for whether an answer is right.
**Status:** Frozen

### AD-004 — `Question.answerKey` never leaves the repository boundary
Stripped by a dedicated `toPublicQuestion` mapper (and backed by `select: false` at the schema level) everywhere except the one admin-only internal read path. Enforced by tests, not by trusting every controller to remember to omit it.
**Status:** Frozen

### AD-005 — Constraints MongoDB can't express are enforced in the service layer, explicitly
Topic prerequisite-graph acyclicity (BFS cycle check in `curriculum.service.addPrerequisite`) and MasteryRecord's single-writer rule (`upsertFromAttempt` called only from its two event handlers) both depend on code-review discipline, not a database constraint. This is tracked as a standing risk in Known Risks, not silently assumed safe.
**Status:** Frozen

### AD-006 — Domain events are in-process, swappable later
`EventBus` is an interface; `InProcessEventBus` is the day-one implementation. A durable/outbox-backed implementation can replace it later without touching a single publisher or subscriber call site.
**Status:** Frozen (implementation may change; the interface boundary may not)

### AD-007 — `isCorrect` is computed once, never recomputed
Both `DiagnosticAttempt.items[]` and `PracticeSession.items[]` store `isCorrect` at submission time via `domain/grading`. A later correction to a question's `answerKey` must never retroactively rewrite a student's historical result — historical attempts are immutable records of what happened.
**Status:** Frozen

### AD-008 — Manual composition root, no DI framework
`container.ts` wires every concrete repository/service by hand. The object graph is shallow enough that explicit wiring is more readable and debuggable than decorator-based injection.
**Status:** Frozen

### AD-009 — Admin accounts are provisioned out-of-band
`role: 'admin'` is not reachable via `/auth/register` — self-registration only allows `student`/`teacher`/`parent`. Integration tests mint admin JWTs directly (`signAccessToken`) rather than going through a registration flow that intentionally doesn't exist.
**Status:** Frozen

### AD-010 — Verification and refresh tokens are dedicated collections, not fields on `User`
`VerificationToken` (email verification + password reset, one active token per user/type) and `RefreshToken` (rotation, theft detection) each got their own collection instead of accumulating token fields on `User` — the same pattern extends cleanly to future flows (magic links, invitations) without touching `User`'s schema again.
**Status:** Frozen

---

## Releases

| Version | Milestone | Commit |
|---|---|---|
| v0.1.0 | Backend Foundation + Authentication module | `38296b5` |
| v0.2.0 | Student module | `f484bb5` |
| v0.3.0 | Curriculum module (Topic graph + Question bank) | `c027d58` |
| v0.4.0 | Diagnostic module + `domain/grading` | `1f73876` |
| v0.5.0 | Practice module | `78cc9c0` |
| v0.6.0 | MasteryRecord read model | `21028be` |
| v0.7.0 | Teacher module (planned) | — |

---

## 2026-07-28 — MasteryRecord read model complete

**Status:** TypeScript clean · ESLint clean · 143/143 tests passing (17 suites) · committed locally (`21028be`, not yet pushed)

**Completed this session**
- **MasteryRecord** (DOMAIN_MODEL.md §2.9), owned by `student` — an event-handler-write-only projection. `mastery.service` subscribes its two handlers (`onPracticeItemSubmitted`, `onDiagnosticCompleted`) at construction time; `upsertFromAttempt` on the repository is the only write path, never called from a controller.
- Scoring: recency-weighted exponential average (new observation weighted 0.3 against the running score), trend derived from the score delta (`improving`/`stable`/`declining`). Diagnostic's fractional `topicBreakdown.score` is approximated as pass/fail via a 0.5 threshold since the repository's sanctioned write path only takes a boolean — documented simplification (tech debt above).
- Added `GET /api/v1/students/mastery` (student-only, self-scoped) to the existing student controller/routes rather than a new module, since `MasteryRecord` is student-owned per the domain model.
- New integration suite (`tests/integration/mastery.test.ts`) proves the full event chain end-to-end through real Mongo: a real practice-item submission and a real completed diagnostic both produce a correct `MasteryRecord`, with no cross-student leakage.

**Repo commits so far**
```
21028be Add MasteryRecord read model (event-handler-write-only)
78cc9c0 Add Practice module (PracticeSession)
```
(see the Practice/Diagnostic entries below for the full history before this point)

**Scaffolded but NOT implemented yet** (README-only placeholders in `src/modules/`):
`teacher`, `parent`, `notification`, `analytics`, `ai` (hint/ocr/prompt-builder/recommendation/study-plan/tutor). `StudyPlan` (owned by `student`, DOMAIN_MODEL.md §2.10) also remains unbuilt.

**Recommended next milestone: Teacher module**
`TeacherProfile` + `School`/`ClassGroup` (DOMAIN_MODEL.md §2.3–2.4). This is the first module needing a genuine design decision the domain doc leaves open: how `ClassGroup.activeStudentIds` stays in sync with `StudentProfile.classIds` (contrast with the parent-link case in §2.3, which the doc already resolves explicitly).

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
