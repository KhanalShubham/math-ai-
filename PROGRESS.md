# MathsMentor AI — Progress Log

Living checkpoint file. Updated after each significant change so the project
state is visible without re-scanning the codebase. Newest entry on top.

**Workflow for every milestone:** read this file → confirm the active milestone → read only the required architecture/domain sections → implement one complete module → run TypeScript + ESLint + unit tests + integration tests → commit → update this file → push → stop. No exceptions.

**Keep this file in sync with every meaningful commit, not just milestone completions** — at minimum, the Quick Reference's commit hash/test counts should never lag behind `git log`. A full dated history entry (via the template below) is still reserved for milestone-sized units of work; a one-line Quick Reference bump is enough for smaller in-flight commits so the file is never stale if work stops unexpectedly.

## Session Resume Checklist

**Before writing code:**
- [ ] Pull latest `main`
- [ ] Read this file (`PROGRESS.md`)
- [ ] Confirm the active milestone (see Quick Reference → Active Milestone)
- [ ] Read only the required architecture/domain sections for that milestone
- [ ] Review Known Risks and Tech Debt for anything the milestone touches
- [ ] Check for uncommitted changes (`git status`)
- [ ] Start implementation

**Before stopping:**
- [ ] TypeScript clean
- [ ] ESLint clean
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Commit
- [ ] Update this file (Quick Reference at minimum — see sync rule below)
- [ ] Push

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
| **Current Version** | v0.9.0 |
| **Current Branch** | main |
| **Latest Commit** | `<pending>` |
| **Backend Modules Complete** | 8 / 10 (+ MasteryRecord read model) |
| **Overall Progress** | ~85% |
| **Test Status** | 201/201 passing (23 suites) |
| **TypeScript** | clean |
| **ESLint** | clean |

**Milestone Progress**
```
█████████████████████████░░░░ 85%
```

**Active Milestone**
None — Analytics complete; awaiting direction for Notification or AI (see stop condition below)

**Current Focus**
Parent → Analytics (both complete; next module not yet chosen)

**Blocked By**
None

**Next Architectural Decision**
Reconciliation strategy for `ClassGroup.activeStudentIds` ↔ `StudentProfile.classIds` drift on partial AD-011 write failure (mirrors the same open gap on the parent-link contract)

**Current Task**
None in progress. Per explicit instruction, do not begin Notification, AI, Deployment, CI/CD, or OpenAPI work until requested.

**Next Task**
—

**Then**
—

**Project Health**
- ✅ Build passing
- ✅ Tests passing
- ✅ Lint clean
- ✅ Types clean
- ⚠️ OpenAPI incomplete (Student/Curriculum/Diagnostic/Practice/Mastery/Teacher/Parent/Analytics undocumented)
- ⚠️ Deployment/observability not yet started

**Architecture Status**
- ✅ Stable
- 🔒 Frozen (v1 — see `ARCHITECTURE.md`)
- Last Reviewed: 2026-07-28

**Repository Metrics**
| | |
|---|---|
| Commits | 18 |
| Tests | 201 |
| Suites | 23 |
| Coverage | not measured yet |
| Build | Passing |

**Codebase Size**
| | |
|---|---|
| Source files (`src/`) | 123 |
| Lines of code (`src/`) | ~6,272 |
| Domain modules (`src/modules/`) | 10 (8 implemented, 2 scaffolded) |
| API endpoints | 55 |
| Test files | 24 |

**Module Completion**

| Module | Status | Started | Completed |
|---|---|---|---|
| Auth | ✅ Complete (frozen)² | 2026-07-28 or earlier | 2026-07-28 |
| Student | ✅ Complete (frozen)¹ | 2026-07-28 | 2026-07-28 |
| Curriculum | ✅ Complete (frozen) | 2026-07-28 | 2026-07-28 |
| Diagnostic | ✅ Complete (frozen) | 2026-07-28 | 2026-07-28 |
| Practice | ✅ Complete (frozen) | 2026-07-28 | 2026-07-28 |
| MasteryRecord (student addition) | ✅ Complete | 2026-07-28 | 2026-07-28 |
| Teacher | ✅ Complete (frozen) | 2026-07-28 | 2026-07-28 |
| Parent | ✅ Complete (frozen) | 2026-07-28 | 2026-07-28 |
| Analytics | ✅ Complete (frozen)³ | 2026-07-28 | 2026-07-28 |
| Notification | ⏳ Planned | — | — |
| AI | ⏳ Planned | — | — |

¹ `StudyPlan` (DOMAIN_MODEL.md §2.10) is still owned by `student` but not yet built — "frozen" describes `StudentProfile` + `MasteryRecord` + the narrow `addClassLink`/`removeClassLink`/`removeParentLink`/`getById` additions the Teacher/Parent modules required (AD-011 and the parent-link contract); the module reopens narrowly for these, not a full unfreeze.
² `findUserByEmail`/`findByEmail` were added narrowly to support Teacher/Parent cross-module lookups (no passwordHash exposed) — same narrow-reopening pattern as Student's additions, not a full unfreeze.
³ Analytics subscribes to every event type published by every other module (see AD-012) — it reopens no other module's code (only imports each module's `*.events.ts` constants/types, the same read-only pattern MasteryRecord already established), so "frozen" here describes analytics' own write path, not a reopening of any other module.

**Production Readiness**
- ☐ OpenAPI complete
- ☐ Docker production image
- ☐ CI/CD pipeline green
- ☐ Monitoring and alerting
- ☑ Structured logging (pino) — alerting on `isOperational: false` errors not yet wired
- ☐ Rate limiting verified under load (middleware exists — `authRateLimiter`/`globalRateLimiter` — not load-tested)
- ☐ Security headers verified (helmet is in place — not audited against a checklist like OWASP secure-headers)
- ☐ Backup strategy defined
- ☐ Backup restore tested
- ☐ Disaster recovery plan
- ☐ Health/readiness endpoints (exist — `/health`, `/ready` — not wired to any uptime monitor)
- ☐ Full security review

**Performance Targets**
| Endpoint / operation | Target (p95) | Current |
|---|---|---|
| Authentication (login/refresh) | < 150 ms | Not measured |
| Diagnostic attempt start | < 500 ms | Not measured |
| Practice item submission | < 200 ms | Not measured |
| General API (p95, all routes) | < 200 ms | Not measured |

No load-testing tooling is wired up yet — these are targets to design against, not current measurements. Revisit once k6/autocannon (or similar) is added to the toolchain.

**Backend Roadmap**
```
✅ Foundation
✅ Authentication
✅ Student
✅ Curriculum
✅ Diagnostic
✅ Practice
✅ MasteryRecord
✅ Teacher
✅ Parent
✅ Analytics
⬜ Notification
⬜ AI
⬜ Deployment
```

**Module Dependency Graph**
```
Foundation
    ↓
Authentication
    ↓
Student ──────────────┐
    ↓                  │
Curriculum             │ (StudentProfile needed by
    ↓                  │  every module below)
Diagnostic             │
    ↓                  │
Practice               │
    ↓                  │
Mastery (student addn) │
    ↓                  │
Teacher ←──────────────┘
    ↓
Parent
    ↓
Analytics
    ↓
AI
```
Curriculum must precede Diagnostic/Practice (both reference `Question`). Diagnostic/Practice must precede Mastery (it projects their events). Mastery should precede AI (`recommendation`/`study-plan` need real mastery data to reason over, not just events to subscribe to). Teacher and Parent both depend on Student for their two-aggregate link contracts (AD-011 and the parent-link case respectively). Analytics doesn't strictly depend on Teacher/Parent finishing first (it only imports each module's `*.events.ts` constants/types) — it was simply built last because it subscribes to every event type every other module publishes (AD-012), so building it after all seven producer modules existed meant one pass instead of revisiting it per new module.

**Decisions Frozen** (do not reopen absent a bug or genuine architectural issue):
- Authentication
- Student module (`StudentProfile` + `MasteryRecord` — see footnote above)
- Curriculum module
- Diagnostic module
- Practice module
- Teacher module (see AD-011 for the ClassGroup↔StudentProfile write path)
- Parent module (link verification is a documented placeholder — see Known Risks — not a design gap in the frozen contract itself)
- Analytics module (see AD-012 for the explicit-per-event-type subscription approach)

**Known Risks**
- `MasteryRecord` is the first read model with a hard "only these event handlers may write it" rule (DOMAIN_MODEL.md §2.9) — nothing DB-enforces this, so it depends entirely on code-review discipline holding, same as the prerequisite-DAG cycle check.
- The AI module (`hint`, `tutor`, `recommendation`, `study-plan`) can now read real `MasteryRecord` data, but still has no consumer built — it remains blocked on product scope, not data availability.
- `EventBus` is in-process/in-memory only — a process restart drops any in-flight event; fine for day-one, but the event log is not yet durable (ARCHITECTURE.md §21.1 flags this as a deliberate, revisitable choice, not an oversight). This matters more now that `MasteryRecord` depends on events actually being delivered.
- AI must never receive `answerKey` or ungraded student answers directly — enforced today by `toPublicQuestion`/`select:false`; every new module touching `Question`/grading must preserve this boundary.
- Diagnostic's next-question selection is a simplified heuristic (2 items/topic, difficulty ±1 on correct/incorrect), not a real IRT/adaptive-testing model — fine for a first working version, but the grade/theta mapping in `diagnostic.service.ts` (`mapThetaToGrade`) is a linear placeholder that will need real psychometric backing before this ships to real students.
- AD-011's two-write enrollment (ClassGroup then StudentProfile) is not a distributed transaction — if the second write fails after the first succeeds, `StudentProfile.classIds` and `ClassGroup.activeStudentIds` can drift until a reconciliation job (ARCHITECTURE.md §21.3) exists. No such job is built yet — same open gap as the parent-link case it mirrors.
- Parent verification uses knowledge of the child's registered email as a placeholder proof of guardianship, not a real double-opt-in flow — anyone who knows (or guesses/phishes) a student's account email can currently link themselves as that student's parent. Acceptable for a pre-launch build, but must be replaced with real verification (Notification-backed double opt-in, or school-mediated confirmation) before real users are onboarded.
- Analytics has no wildcard event subscription (AD-012) — a new event type published by any module is silently absent from the analytics/audit log until `analytics.service.ts` is updated to add an explicit handler for it. Nothing fails loudly; this depends on code-review discipline the same way MasteryRecord's single-writer rule does.
- `AnalyticsEvent` has no retention/TTL policy yet (DOMAIN_MODEL.md §5 flagged this as an open question, not yet decided) — it is the fastest-growing collection in the system and will need a number (e.g. raw events retained N months, then archived) before production.

**Tech Debt**
- `docs/openapi/auth.yaml` is the only OpenAPI spec the server loads at `/docs` — Student, Curriculum, Diagnostic, Practice, Mastery, Teacher, Parent, and Analytics endpoints aren't documented there yet.
- `domain/grading`'s algebraic grader is a normalized string match against `acceptedForms`, not true symbolic equivalence (e.g. "2x+4" vs "4+2x" would fail) — needs a CAS-backed check eventually.
- `domain/grading`'s multi-step grader is a JSON deep-equality check per step — fine for primitive step answers, not a general structural-equivalence engine.
- `mastery.service`'s diagnostic-completion bootstrap approximates a fractional `topicBreakdown` score as pass/fail against a 0.5 threshold (`upsertFromAttempt` only accepts a boolean) — loses the fractional granularity DOMAIN_MODEL.md's diagnostic breakdown actually carries.
- No background reconciliation job exists yet for either two-aggregate write contract (parent-link or AD-011's class-enrollment) — both are documented as eventually-consistent-on-failure, not actually monitored/repaired.
- Parent's link-by-email verification (see Known Risks) needs a real double-opt-in or school-mediated flow before production — currently the weakest trust boundary in the codebase.
- No background reconciliation job exists yet for either two-aggregate write contract (parent-link or AD-011's class-enrollment) — both are documented as eventually-consistent-on-failure, not actually monitored/repaired.
- Analytics' two read endpoints (`GET /analytics/students/:studentId/events`, `GET /analytics/events/count`) are minimal reporting primitives (indexed reads, no aggregation pipeline) — real teacher/admin dashboards will need proper aggregation queries once a concrete reporting requirement exists (ARCHITECTURE.md §13 guidance: build the aggregation pipeline only once a real latency problem appears, not preemptively).
- `DiagnosticCompleted` and `PracticeItemSubmitted` don't carry their own attempt/session id in their event payload, so analytics' projected `AnalyticsEvent.aggregateId` for those two event types points at the student/question instead of the actual attempt/session document — documented in `analytics.service.ts`, not a data-loss bug (the source records are still fully queryable through `diagnostic`/`practice` directly).

---

## Architecture Decisions Log

Permanent record of major design decisions — the "why," not just the "what." Add a new AD-NNN entry when a decision is made that a future contributor could plausibly second-guess or accidentally undo; don't log routine implementation choices.

### AD-001 — Repositories are behavior-oriented, not CRUD
`updateEstimatedGrade(studentId, grade)`, not a generic `update(student)`. Prevents accidental writes to fields with special rules (e.g. `currentEstimatedGrade`, `answerKey`) by construction, not by convention alone.
**Status:** Frozen · **Introduced:** v0.1.0 · **Last reviewed:** v0.6.0

### AD-002 — One module owns one collection
Every collection has exactly one owning module's repository as its only sanctioned write path. Other modules read only through that module's *service*, never a second repository over the same collection.
**Status:** Frozen · **Introduced:** v0.1.0 · **Last reviewed:** v0.6.0

### AD-003 — AI never grades
`domain/grading` has no import path to `infrastructure/ai` at all — not a policy, a structural fact about the codebase. Correctness is deterministic and auditable; AI is enrichment (hints, explanations), never the source of truth for whether an answer is right.
**Status:** Frozen · **Introduced:** v0.4.0 · **Last reviewed:** v0.6.0

### AD-004 — `Question.answerKey` never leaves the repository boundary
Stripped by a dedicated `toPublicQuestion` mapper (and backed by `select: false` at the schema level) everywhere except the one admin-only internal read path. Enforced by tests, not by trusting every controller to remember to omit it.
**Status:** Frozen · **Introduced:** v0.3.0 · **Last reviewed:** v0.6.0

### AD-005 — Constraints MongoDB can't express are enforced in the service layer, explicitly
Topic prerequisite-graph acyclicity (BFS cycle check in `curriculum.service.addPrerequisite`) and MasteryRecord's single-writer rule (`upsertFromAttempt` called only from its two event handlers) both depend on code-review discipline, not a database constraint. This is tracked as a standing risk in Known Risks, not silently assumed safe.
**Status:** Frozen · **Introduced:** v0.3.0 · **Last reviewed:** v0.6.0

### AD-006 — Domain events are in-process, swappable later
`EventBus` is an interface; `InProcessEventBus` is the day-one implementation. A durable/outbox-backed implementation can replace it later without touching a single publisher or subscriber call site.
**Status:** Frozen (implementation may change; the interface boundary may not) · **Introduced:** v0.1.0 · **Last reviewed:** v0.9.0

### AD-007 — `isCorrect` is computed once, never recomputed
Both `DiagnosticAttempt.items[]` and `PracticeSession.items[]` store `isCorrect` at submission time via `domain/grading`. A later correction to a question's `answerKey` must never retroactively rewrite a student's historical result — historical attempts are immutable records of what happened.
**Status:** Frozen · **Introduced:** v0.4.0 · **Last reviewed:** v0.5.0

### AD-008 — Manual composition root, no DI framework
`container.ts` wires every concrete repository/service by hand. The object graph is shallow enough that explicit wiring is more readable and debuggable than decorator-based injection.
**Status:** Frozen · **Introduced:** v0.1.0 · **Last reviewed:** v0.6.0

### AD-009 — Admin accounts are provisioned out-of-band
`role: 'admin'` is not reachable via `/auth/register` — self-registration only allows `student`/`teacher`/`parent`. Integration tests mint admin JWTs directly (`signAccessToken`) rather than going through a registration flow that intentionally doesn't exist.
**Status:** Frozen · **Introduced:** v0.1.0 · **Last reviewed:** v0.3.0

### AD-010 — Verification and refresh tokens are dedicated collections, not fields on `User`
`VerificationToken` (email verification + password reset, one active token per user/type) and `RefreshToken` (rotation, theft detection) each got their own collection instead of accumulating token fields on `User` — the same pattern extends cleanly to future flows (magic links, invitations) without touching `User`'s schema again.
**Status:** Frozen · **Introduced:** v0.1.0 · **Last reviewed:** v0.1.0

### AD-011 — `ClassGroup` owns student enrollment; `StudentProfile.classIds` is written via a synchronous service call, not an event
**Decision:** `ClassGroup` (owned by `teacher`) is the aggregate that owns the enrollment/withdrawal action. `teacher.service.enrollStudent`/`withdrawStudent` write `ClassGroup.activeStudentIds` + `membershipHistory` first (via `classGroupRepository`), then call the new `student.service.addClassLink`/`removeClassLink` as the "commit" step for `StudentProfile.classIds`. Not a distributed transaction — if the second call fails, that's background-reconciliation-job territory (ARCHITECTURE.md §21.3), exactly as already accepted for the parent-link case.

**Why:** DOMAIN_MODEL.md §2.3 already resolves the structurally identical problem for parent-student links (`ParentProfile` owns link creation, calls `student.service.addParentLink`) but left the class-enrollment case unresolved (§2.4 just says `activeStudentIds` is "current roster" without specifying the write path). Mirroring the already-reviewed parent-link pattern keeps exactly one consistency strategy in the codebase for "two-aggregate link" problems, instead of two different ones that would each need separate reasoning about failure modes.

**Alternatives considered:**
1. *Direct write from `teacher` into the `StudentProfile` collection.* Rejected — violates AD-002 (one module owns one collection); would give `teacher` a second write path into `student`'s data.
2. *Event-driven, eventually-consistent update* (`teacher.service` publishes an event; a `student` module handler updates `classIds` asynchronously, mastery-style). Rejected — introduces a consistency lag for a value (`classIds`) that's read synchronously elsewhere in the same request cycle far more often than `MasteryRecord` is, and would leave two different two-aggregate-link strategies (sync for parent-links, async for class-links) in one codebase for no principled reason.
3. *Distributed transaction / two-phase commit.* Rejected — no supporting infrastructure exists (MongoDB multi-document transactions were deliberately avoided per the architecture doc's simplicity constraints), and the parent-link precedent already established that "retry/reconcile on partial failure" is an acceptable, simpler alternative for this codebase's stakes.

**Status:** Frozen · **Introduced:** v0.7.0 · **Last reviewed:** v0.7.0

### AD-012 — Analytics subscribes per-event-type; there is no wildcard "any event" subscription

**Decision:** DOMAIN_MODEL.md §2.13 describes `AnalyticsEvent` as written by "a dedicated `analytics.onAnyEvent` subscriber" on behalf of every module. `EventBus` (AD-006) has no wildcard subscription and its interface is frozen, so `analytics.service.ts` instead subscribes individually to every event type currently published by every other module (15 handlers across `auth`, `curriculum`, `diagnostic`, `practice`, `teacher`, `parent`, `student`), mapping each to an `AnalyticsEvent` with an explicit, per-event-type payload — never a raw spread of the source payload.

**Why:** Two constraints together rule out a literal wildcard subscriber: (1) AD-006 explicitly reserves the right to change `InProcessEventBus`'s implementation but freezes its interface, so adding a `subscribeAll`/wildcard method is off the table without reopening a decision the user has already frozen; (2) some published payloads carry secrets that must never reach a durable, queryable audit log — `auth.PasswordResetRequested` includes a raw password-reset token (see `auth.service.ts`), which a naive "persist the whole payload" wildcard handler would have written straight into `AnalyticsEvent.payload`. An explicit per-event-type mapper, one that whitelists exactly which fields to store, closes that hole by construction instead of relying on someone remembering to redact it later. This mirrors the same explicit-import pattern `mastery.service` already established for its two events (AD-005) — Analytics is simply the first module to apply it to every event type in the system at once, not a new pattern.

**Alternatives considered:**
1. *Add a wildcard `subscribeAll` method to the `EventBus` interface.* Rejected — violates AD-006's frozen-interface guarantee for a convenience that doesn't change what's actually storable (a full audit trail still needs to omit secrets per event type either way).
2. *Have every publishing module call `analytics.service.record(...)` directly alongside `eventBus.publish(...)`.* Rejected — DOMAIN_MODEL.md §2.13 is explicit that analytics is written to "not by `analytics` calling out to other modules," i.e. the direction should be analytics listening, not seven other services taking on a second call per event; would also mean every future new event type requires a change in the *publishing* module, not just analytics.
3. *Spread the entire event payload into `AnalyticsEvent.payload` for every subscription* (a middle ground: no wildcard bus method, but a generic handler applied per type). Rejected once `auth.PasswordResetRequested`'s `rawToken` was noticed — this would have created a live vulnerability (a secret sitting in an admin-readable audit-log collection). Explicit per-event-type field whitelisting was chosen instead.

**Known limitation:** a new event type added by any module is silently absent from analytics until this file's subscription list is updated to match — tracked in Known Risks/Tech Debt above, same category of risk as MasteryRecord's single-writer convention (AD-005).

**Status:** Frozen · **Introduced:** v0.9.0 · **Last reviewed:** v0.9.0

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
| v0.7.0 | Teacher module (`TeacherProfile`/`School`/`ClassGroup`, AD-011) | `22baf3a` |
| v0.8.0 | Parent module (`ParentProfile`, link/unlink by email) | `6e91541` |
| v0.9.0 | Analytics module (`AnalyticsEvent`, AD-012) | `<pending>` |

---

## 2026-07-28 — Analytics module complete

**Status:** TypeScript ✅ · ESLint ✅ · Tests ✅ (201/201, 23 suites) · commit `<pending>`

**Completed**
- `AnalyticsEvent` (DOMAIN_MODEL.md §2.13) — full repository interface → Mongoose model/repository → service → Zod validation → controller → routes → unit tests → integration tests.
- `analytics.service` subscribes to all 15 event types currently published across `auth`, `curriculum`, `diagnostic`, `practice`, `teacher`, `parent`, and `student` (see AD-012 for why this is 15 explicit handlers rather than one wildcard subscriber), projecting each into an `AnalyticsEvent` with an explicit, per-event-type payload.
- Two admin-only reporting reads: `GET /analytics/students/:studentId/events` (timeline, filterable by `eventType`, `limit`) and `GET /analytics/events/count` (count by `eventType`, optional `sinceDays` window) — deliberately simple indexed reads, no aggregation pipeline yet (ARCHITECTURE.md §13: build that only once a real dashboard-latency problem exists).
- Removed the stale `src/modules/analytics/README.md` scaffold placeholder.

**Architecture decisions**
- **AD-012** (new) — resolves how `AnalyticsEvent` gets written given DOMAIN_MODEL.md's "onAnyEvent" language and AD-006's frozen `EventBus` interface. See the Architecture Decisions Log above; also documents why `auth.PasswordResetRequested`'s raw reset token is deliberately excluded from the persisted payload.

**Known technical debt**
- No wildcard event subscription exists (AD-012) — a new event type published by any future module needs a matching handler added to `analytics.service.ts`, or it's silently absent from the audit log.
- `AnalyticsEvent` has no retention/TTL policy yet — DOMAIN_MODEL.md §5 flagged this as an open question before this session; still open, now the fastest-growing collection in the system.
- `docs/openapi/auth.yaml` still doesn't cover Analytics' routes.
- `DiagnosticCompleted`/`PracticeItemSubmitted` don't carry their own attempt/session id, so those two event types' projected `aggregateId` points at the student/question instead — documented in `analytics.service.ts`.

**Next milestone**
None queued per explicit scope instruction — Notification and AI are both still out of scope until requested.

---

## 2026-07-28 — Parent module complete

**Status:** TypeScript ✅ · ESLint ✅ · Tests ✅ (184/184, 21 suites) · commit `6e91541`

**Completed**
- `ParentProfile` (DOMAIN_MODEL.md §2.3) — full repository interface → Mongoose model/repository → service → Zod validation → controller → routes → unit tests → integration tests.
- Two-aggregate link contract implemented exactly as specified: `ParentProfile` owns link creation (`linkStudentByEmail`), then calls the pre-existing `student.service.addParentLink` as the commit step. Unlink is symmetric (`unlinkStudent` → `student.service.removeParentLink`, added this session).
- Supported per the brief: link parent (by email), unlink parent, guardian lookup (`GET /parent/guardians/:studentId`, admin-only), child lookup (`GET /parent/children`, reuses `student.service.getByParentId` rather than a new Student repository inside Parent).
- Notification preferences (`email`/`sms` toggles) with a `PATCH /parent/preferences` endpoint — a minimal shape since DOMAIN_MODEL.md doesn't specify the field beyond naming it.

**Architecture decisions**
- No new AD — this module implements the two-aggregate contract DOMAIN_MODEL.md §2.3 already specifies in full, unlike Teacher's ClassGroup case which needed AD-011.
- Verification-flow choice (email-based, not a formal AD): DOMAIN_MODEL.md deliberately leaves "verification flow" abstract, so this is a documented product-scope placeholder, not an architectural decision that could be "frozen" — it's expected to be replaced once Notification infra exists.

**Known technical debt**
- Parent's email-based verification has no real double opt-in — see Known Risks above. This is the weakest trust boundary currently in the codebase and should be prioritized before any real users are onboarded.
- No reconciliation job yet for the parent-link two-write contract if the second write fails (same gap as AD-011).
- `docs/openapi/auth.yaml` still doesn't cover Parent's routes.

**Next milestone**
None queued per explicit scope instruction — Teacher and Parent are both complete and frozen. Notification, Analytics, AI, Deployment, CI/CD, and OpenAPI work are all explicitly out of scope until requested.

---

## 2026-07-28 — Teacher module complete

**Status:** TypeScript ✅ · ESLint ✅ · Tests ✅ (164/164, 19 suites) · commit `22baf3a`

**Completed**
- `TeacherProfile`, `School`, `ClassGroup` (DOMAIN_MODEL.md §2.3–2.4) — full repository interface → Mongoose models/repositories → service → Zod validation → controller → routes → unit tests → integration tests.
- Append-only `membershipHistory`: `enrollStudent` always pushes a new open entry (`leftAt: null`); `withdrawStudent` closes the one open entry for that student with `leftAt` and never touches earlier closed entries. A student who leaves and rejoins the same class ends up with two history entries, not one mutated one — verified by a dedicated unit test (`supports multiple historical memberships without mutating a closed entry`).
- Enrollment/withdrawal authorization: a teacher may only act on classes they're assigned to (`assertCanManageClass` in `teacher.controller.ts`); admins bypass this — mirrors the existing self-or-admin pattern already used in `student.controller.listByParent`.

**Architecture decisions**
- **AD-011** (new) — resolves the previously-open question of how `ClassGroup.activeStudentIds` stays in sync with `StudentProfile.classIds`. See the Architecture Decisions Log above for the full write-up (decision, why, alternatives considered and rejected).
- Narrow, documented reopenings required by AD-011: `student` gained `getById`, `addClassLink`/`removeClassLink`, `removeParentLink` (symmetric with the existing `addParentLink`); `auth` gained `findByEmail`/`findUserByEmail` (read-only, no `passwordHash`) — added now because the upcoming Parent module needs it too, not solely for Teacher.

**Known technical debt**
- AD-011's two-write enrollment has no reconciliation job yet if the second write (`student.service.addClassLink`) fails after the first succeeds — same accepted gap as the pre-existing parent-link case.
- `docs/openapi/auth.yaml` still doesn't cover Teacher's new routes.

**Next milestone**
Parent module (DOMAIN_MODEL.md §2.3) — `ParentProfile` owns link creation and calls the already-implemented `student.service.addParentLink`/`removeParentLink`. The open design question here is the verification mechanism itself (the domain doc deliberately leaves "verification flow" abstract); plan is a placeholder email-based check via the new `authService.findUserByEmail`, documented as a placeholder pending real Notification-backed double opt-in.

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
