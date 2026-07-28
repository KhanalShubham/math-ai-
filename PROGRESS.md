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
| **Current Version** | v0.11.0 |
| **Current Branch** | main |
| **Latest Commit** | `<pending>` |
| **Backend Modules Complete** | 9 / 10 (+ MasteryRecord read model) |
| **Frontend** | Test harness built (`mathsmentor-frontend/`) — not the product UI, see AD-015 |
| **Overall Progress** | ~90% backend · Phase 1 product loop proven end-to-end |
| **Test Status** | 215/215 backend passing (25 suites) — frontend has no automated tests (thin harness, manually driven end-to-end, see 2026-07-28 entry) |
| **TypeScript** | clean (backend + frontend) |
| **ESLint** | clean (backend); frontend oxlint clean (1 pre-existing fast-refresh warning) |

**Milestone Progress**
```
███████████████████████████░░ 90% (backend) — Phase 1 gate cleared
```

**Active Milestone**
None — Phase 1 (Teacher/Parent/Analytics/Notification + frontend harness + e2e proof) complete; awaiting direction to begin Phase 2 (AI) — see stop condition below

**Current Focus**
Notification → frontend test harness (both complete; Phase 2 — AI Foundation — is next, not yet started)

**Blocked By**
None

**Next Architectural Decision**
Phase 2 AI Foundation: the `AIProvider` abstraction (OpenAI/Claude/Gemini/Ollama implementations) plus `PromptBuilder`/`ConversationContext`/`TokenCounter`/`AIResponse`/`RateLimiter`/`SafetyGuard` — foundation only, no AI feature yet, per the user's explicit phase-gate instruction (see the Phase 2 Roadmap section below)

**Current Task**
None in progress. Per explicit instruction, do not begin AI, Deployment, CI/CD, or OpenAPI work until requested.

**Next Task**
—

**Then**
—

**Project Health**
- ✅ Build passing
- ✅ Tests passing
- ✅ Lint clean
- ✅ Types clean
- ⚠️ OpenAPI incomplete (Student/Curriculum/Diagnostic/Practice/Mastery/Teacher/Parent/Analytics/Notification undocumented)
- ⚠️ Deployment/observability not yet started

**Architecture Status**
- ✅ Stable
- 🔒 Frozen (v1 — see `ARCHITECTURE.md`)
- Last Reviewed: 2026-07-28

**Repository Metrics**
| | |
|---|---|
| Commits | 22 |
| Tests | 215 |
| Suites | 25 |
| Coverage | not measured yet |
| Build | Passing |

**Codebase Size**
| | |
|---|---|
| Source files (`src/`) | 132 |
| Lines of code (`src/`) | ~6,646 |
| Domain modules (`src/modules/`) | 10 (9 implemented, 1 scaffolded) |
| API endpoints | 58 |
| Test files | 26 |

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
| Notification | ✅ Complete (frozen)⁴ | 2026-07-28 | 2026-07-28 |
| AI | ⏳ Planned | — | — |

¹ `StudyPlan` (DOMAIN_MODEL.md §2.10) is still owned by `student` but not yet built — "frozen" describes `StudentProfile` + `MasteryRecord` + the narrow `addClassLink`/`removeClassLink`/`removeParentLink`/`getById` additions the Teacher/Parent modules required (AD-011 and the parent-link contract); the module reopens narrowly for these, not a full unfreeze.
² `findUserByEmail`/`findByEmail` were added narrowly to support Teacher/Parent cross-module lookups (no passwordHash exposed) — same narrow-reopening pattern as Student's additions, not a full unfreeze.
³ Analytics subscribes to every event type published by every other module (see AD-012) — it reopens no other module's code (only imports each module's `*.events.ts` constants/types, the same read-only pattern MasteryRecord already established), so "frozen" here describes analytics' own write path, not a reopening of any other module.
⁴ Notification required a genuine, narrow reopening of `student`'s frozen `mastery.service` — its first-ever published event, `MasteryMilestoneReached` (AD-014) — not just a read-only events-file import like Analytics' pattern. Only `mastery_milestone` is wired end-to-end today; `streak_reminder`/`weekly_report`/`assignment_due` are deferred (see Known Risks/Tech Debt) since each needs infrastructure or product data (a streak concept, a scheduled job runner, assignment due dates) this codebase doesn't have yet.

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
✅ Notification
⬜ AI
⬜ Deployment
```

**Phase 2 Roadmap** (AD-015 — gates AI behind a working product loop, not just green backend tests)
```
Phase 1 (done)
---------------
✅ Teacher
✅ Parent
✅ Analytics
✅ Notification
    ↓
✅ Frontend integration (mathsmentor-frontend/ — thin test harness, not product UI)
    ↓
✅ End-to-end functionality proven (2026-07-28 — real browser: register → diagnostic/
   practice → mastery milestone → notification, teacher roster, parent link, all real)

Phase 2 (not started — awaiting explicit go-ahead)
----------------------------------------------------
⬜ AI Foundation   — AIProvider abstraction only (OpenAI/Claude/Gemini/Ollama), plus
                     PromptBuilder/ConversationContext/TokenCounter/AIResponse/
                     RateLimiter/SafetyGuard. NO feature implementation in this pass.
⬜ AI Features     — one user-visible capability per milestone, in this order:
                     explain-my-mistake → hint → recommend-next-topic → study-plan →
                     tutor-chat (chat is last on purpose, not first)
⬜ AI Optimization — after features exist and are used, not before
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
Notification (needs mastery.service to
    ↓          publish MasteryMilestoneReached — AD-014)
AI
```
Curriculum must precede Diagnostic/Practice (both reference `Question`). Diagnostic/Practice must precede Mastery (it projects their events). Mastery should precede AI (`recommendation`/`study-plan` need real mastery data to reason over, not just events to subscribe to). Teacher and Parent both depend on Student for their two-aggregate link contracts (AD-011 and the parent-link case respectively). Analytics doesn't strictly depend on Teacher/Parent finishing first (it only imports each module's `*.events.ts` constants/types) — it was simply built last because it subscribes to every event type every other module publishes (AD-012), so building it after all seven producer modules existed meant one pass instead of revisiting it per new module. Notification depends on `student`'s mastery.service publishing its first-ever event (AD-014) — a genuine reopening, not just a read-only events-file import like Analytics'.

**Decisions Frozen** (do not reopen absent a bug or genuine architectural issue):
- Authentication
- Student module (`StudentProfile` + `MasteryRecord` — see footnote above; mastery.service's narrow AD-014 reopening is documented there, not here)
- Curriculum module
- Diagnostic module
- Practice module
- Teacher module (see AD-011 for the ClassGroup↔StudentProfile write path)
- Parent module (link verification is a documented placeholder — see Known Risks — not a design gap in the frozen contract itself)
- Analytics module (see AD-012 for the explicit-per-event-type subscription approach)
- Notification module (see AD-014; only `mastery_milestone` is wired end-to-end — the other three DOMAIN_MODEL.md §2.12 types are deferred, see Known Risks/Tech Debt)

**Known Risks**
- `MasteryRecord` is the first read model with a hard "only these event handlers may write it" rule (DOMAIN_MODEL.md §2.9) — nothing DB-enforces this, so it depends entirely on code-review discipline holding, same as the prerequisite-DAG cycle check.
- The AI module (`hint`, `tutor`, `recommendation`, `study-plan`) can now read real `MasteryRecord` data, but still has no consumer built — it remains blocked on product scope, not data availability.
- `EventBus` is in-process/in-memory only — a process restart drops any in-flight event; fine for day-one, but the event log is not yet durable (ARCHITECTURE.md §21.1 flags this as a deliberate, revisitable choice, not an oversight). This matters more now that `MasteryRecord` depends on events actually being delivered.
- AI must never receive `answerKey` or ungraded student answers directly — enforced today by `toPublicQuestion`/`select:false`; every new module touching `Question`/grading must preserve this boundary.
- Diagnostic's next-question selection is a simplified heuristic (2 items/topic, difficulty ±1 on correct/incorrect), not a real IRT/adaptive-testing model — fine for a first working version, but the grade/theta mapping in `diagnostic.service.ts` (`mapThetaToGrade`) is a linear placeholder that will need real psychometric backing before this ships to real students.
- AD-011's two-write enrollment (ClassGroup then StudentProfile) is not a distributed transaction — if the second write fails after the first succeeds, `StudentProfile.classIds` and `ClassGroup.activeStudentIds` can drift until a reconciliation job (ARCHITECTURE.md §21.3) exists. No such job is built yet — same open gap as the parent-link case it mirrors.
- Parent verification uses knowledge of the child's registered email as a placeholder proof of guardianship, not a real double-opt-in flow — anyone who knows (or guesses/phishes) a student's account email can currently link themselves as that student's parent. Acceptable for a pre-launch build, but must be replaced with real verification (Notification-backed double opt-in, or school-mediated confirmation) before real users are onboarded.
- Analytics has no wildcard event subscription (AD-012) — a new event type published by any module is silently absent from the analytics/audit log until `analytics.service.ts` is updated to add an explicit handler for it. Nothing fails loudly; this depends on code-review discipline the same way MasteryRecord's single-writer rule does.
- `AnalyticsEvent`'s 18-month TTL (AD-013) is a hard delete, not archive-then-delete — once a document expires it is gone, with no aggregated/rolled-up record surviving it. Acceptable today since no reporting feature depends on data older than 18 months, but revisit before any dashboard promises multi-year trend data.
- `MasteryMilestoneReached` (AD-014) fires every time a topic's score crosses the 0.8 threshold upward, not just the first time ever — a score that dips below and later re-crosses fires again. Documented simplification (a true once-ever achievement needs persisted state this module doesn't track today), not a bug.
- Notification only wires up `mastery_milestone` of the four `NotificationType`s DOMAIN_MODEL.md §2.12 defines. `streak_reminder` has no streak concept anywhere in the codebase; `weekly_report` needs a scheduled/cron job runner (`JobQueue` only supports enqueue-and-run-once, no recurring schedule); `assignment_due` needs a due date on `PracticeSession`, which doesn't exist (`teacher_assigned` practice creation is itself still unbuilt — see Practice's existing tech debt). All three are real gaps, not silent oversights.
- Notification doesn't yet notify a student's linked parents when the student hits a mastery milestone — a natural extension once real product demand exists, deliberately not built now to avoid scope creep (would need per-parent `notificationPreferences` handling).
- The frontend test harness stores its access token in `localStorage` and has no refresh-token flow (AD-015) — acceptable for a local-only harness against a dev backend, never acceptable for the real product frontend when that's eventually built.
- `npm run mint-admin-token` (backend) is a genuine, if narrow, way to obtain an admin JWT locally — it requires the same `JWT_ACCESS_SECRET` a developer already has in their local `.env`, so it grants nothing new, but it's still worth knowing this script exists if reasoning about the local dev environment's trust boundary.

**Tech Debt**
- `docs/openapi/auth.yaml` is the only OpenAPI spec the server loads at `/docs` — Student, Curriculum, Diagnostic, Practice, Mastery, Teacher, Parent, Analytics, and Notification endpoints aren't documented there yet.
- `domain/grading`'s algebraic grader is a normalized string match against `acceptedForms`, not true symbolic equivalence (e.g. "2x+4" vs "4+2x" would fail) — needs a CAS-backed check eventually.
- `domain/grading`'s multi-step grader is a JSON deep-equality check per step — fine for primitive step answers, not a general structural-equivalence engine.
- `mastery.service`'s diagnostic-completion bootstrap approximates a fractional `topicBreakdown` score as pass/fail against a 0.5 threshold (`upsertFromAttempt` only accepts a boolean) — loses the fractional granularity DOMAIN_MODEL.md's diagnostic breakdown actually carries.
- No background reconciliation job exists yet for either two-aggregate write contract (parent-link or AD-011's class-enrollment) — both are documented as eventually-consistent-on-failure, not actually monitored/repaired.
- Parent's link-by-email verification (see Known Risks) needs a real double-opt-in or school-mediated flow before production — currently the weakest trust boundary in the codebase.
- No background reconciliation job exists yet for either two-aggregate write contract (parent-link or AD-011's class-enrollment) — both are documented as eventually-consistent-on-failure, not actually monitored/repaired.
- Analytics' two read endpoints (`GET /analytics/students/:studentId/events`, `GET /analytics/events/count`) are minimal reporting primitives (indexed reads, no aggregation pipeline) — real teacher/admin dashboards will need proper aggregation queries once a concrete reporting requirement exists (ARCHITECTURE.md §13 guidance: build the aggregation pipeline only once a real latency problem appears, not preemptively).
- `DiagnosticCompleted` and `PracticeItemSubmitted` don't carry their own attempt/session id in their event payload, so analytics' projected `AnalyticsEvent.aggregateId` for those two event types points at the student/question instead of the actual attempt/session document — documented in `analytics.service.ts`, not a data-loss bug (the source records are still fully queryable through `diagnostic`/`practice` directly).
- Notification's `streak_reminder`, `weekly_report`, and `assignment_due` types are unwired (see Known Risks) — each is blocked on infrastructure or product data that doesn't exist yet, tracked here rather than silently dropped.
- No email delivery exists for Notification — `deliveredVia` is always `['in_app']` today; DOMAIN_MODEL.md's `'email'` channel option is modeled but unimplemented, same "Phase 9 log-line" placeholder status as auth's verification/password-reset emails (`auth.service.ts`).
- `mathsmentor-frontend` has no automated test suite (unit or e2e) — it was verified once, manually, end-to-end via a throwaway Playwright script (not committed) against a real running backend (2026-07-28 entry below). If the harness grows or the AI phase adds new screens, revisit whether that's still an acceptable verification method or whether a committed e2e suite is warranted.
- The frontend harness has no UI for creating a `School` (by design — see README) — a teacher can't self-serve a school, and there's no in-app path around `npm run mint-admin-token` + a manual curl call. Fine for a local dev harness, would need a real onboarding flow for any actual product.

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

### AD-013 — `AnalyticsEvent` retention: 18-month hard TTL delete, no archival tier

**Decision:** `AnalyticsEvent` documents are hard-deleted by a MongoDB TTL index (`{ occurredAt: 1 }`, `expireAfterSeconds` set to 18 months) — a single-field index separate from the two compound query indexes, since MongoDB TTL indexes cannot be compound. There is no archival/cold-storage step first; once a document ages out, it is gone.

**Why:** DOMAIN_MODEL.md §5 flagged this as an open question needing "a number, not just consider a TTL," since `AnalyticsEvent` is the fastest-growing collection in the system and doubles as the durable event/audit log (§2.13). Leaving it unbounded is both a cost problem and, per ARCHITECTURE.md's children's-data-compliance challenge (UK GDPR / Age Appropriate Design Code favor data minimization), a growing compliance liability with no offsetting product benefit — nothing in the current product reads `AnalyticsEvent` data older than the current/previous academic year. 18 months covers a full academic year (~10 months) plus a buffer for year-over-year comparison in a future teacher/admin dashboard, which was DOMAIN_MODEL.md's own suggested figure.

**Alternatives considered:**
1. *No TTL — retain forever.* Rejected — unbounded growth in the system's fastest-growing collection, with no offsetting requirement to keep raw event history indefinitely, and the largest children's-data retention surface in the system.
2. *Archive to cold storage/a data warehouse before deleting.* Rejected for now — no archival infrastructure exists (no S3/warehouse target), and no concrete reporting requirement currently needs data past the live window. Building an archival pipeline today would be exactly the kind of speculative infrastructure ARCHITECTURE.md counsels against building before a real need appears (same reasoning already applied to read replicas and aggregation pipelines elsewhere in that doc). If a real multi-year reporting requirement appears later, the answer is a periodic rollup job that pre-aggregates into a smaller, longer-retained summary collection — not keeping raw `AnalyticsEvent` around forever.
3. *A shorter window (e.g. 90 days).* Rejected — too short to support the year-over-year comparisons a teacher/admin dashboard would plausibly want; 18 months balances usefulness against minimization better than an arbitrarily short window would.

**Status:** Frozen · **Introduced:** v0.9.1 · **Last reviewed:** v0.9.1

### AD-014 — `mastery.service` publishes its first event, `MasteryMilestoneReached`, to give Notification something real to react to

**Decision:** `mastery.service`'s `applyAttempt` helper (used by both its existing event handlers) now reads the previous `MasteryRecord` via `findByStudentAndTopic` before calling the already-sanctioned `upsertFromAttempt`, and publishes `MASTERY_EVENTS.MasteryMilestoneReached` when a topic's `masteryScore` crosses 0.8 upward. No repository interface change — both methods it calls already existed. `notification.service` subscribes to this event and creates a `mastery_milestone` Notification for the student.

**Why:** the functionality-over-CRUD bar the user set (see PROGRESS.md's development philosophy, not itself an AD) means Notification needed at least one of DOMAIN_MODEL.md §2.12's four notification types wired genuinely end-to-end, not just a repository/inbox shell. Of the four (`streak_reminder`, `weekly_report`, `assignment_due`, `mastery_milestone`), only `mastery_milestone` had a real, already-existing signal to react to — `MasteryRecord` already exists and already updates on every practice/diagnostic attempt. The other three each need infrastructure or data this codebase doesn't have (a streak concept, a scheduled/cron job runner beyond `JobQueue`'s enqueue-once interface, and a due date on `PracticeSession`), so building any of them now would mean inventing that infrastructure speculatively — exactly what the architecture doc counsels against. Every other module already publishes an event after its state-changing write (AD-011, AD-012's producers, etc.) — `mastery.service` was the one exception, purely because nothing had needed to react to a mastery *change* before Notification did.

**Alternatives considered:**
1. *Have `notification.service` re-derive "did this cross a milestone" itself*, subscribing to the same raw `PracticeItemSubmitted`/`DiagnosticCompleted` events mastery already listens to. Rejected — would duplicate mastery's own scoring/threshold logic outside the module that owns it (violates AD-002's one-module-owns-its-domain-logic spirit), and still needs a "score right before this event" read that only `mastery.service` can cheaply provide (it already reads-then-writes internally).
2. *Poll `MasteryRecord` from a scheduled job instead of an event.* Rejected — no scheduled/cron job runner exists yet (see Known Risks on `weekly_report`), and an event is simpler and immediate for something that already has a natural trigger point (the moment mastery updates).
3. *Fire on every mastery update, not just threshold-crossings.* Rejected as needlessly noisy — a "mastery milestone" notification should mean something (crossing into "mastered"), not fire on every practice attempt.

**Known limitation:** the crossing check only compares the immediately preceding score, so a score that dips below 0.8 and later re-crosses it fires again — not a true once-ever achievement (tracked in Known Risks/Tech Debt).

**Status:** Frozen · **Introduced:** v0.10.0 · **Last reviewed:** v0.10.0

### AD-015 — AI is gated behind a frontend test harness and a proven end-to-end product loop; Phase 2 splits into Foundation → Features → Optimization

**Decision:** Before any AI module work begins, build a thin, unstyled frontend test harness (`mathsmentor-frontend/`, Vite + React + TypeScript) that exercises the real backend end-to-end — login, diagnostic, practice, teacher roster, parent view, notifications inbox — and manually verify the full loop works in a real browser against the real backend. Only once that's proven does Phase 2 (AI) begin, and Phase 2 itself is split into **AI Foundation** (an `AIProvider` abstraction — OpenAI/Claude/Gemini/Ollama implementations — plus `PromptBuilder`, `ConversationContext`, `TokenCounter`, `AIResponse`, `RateLimiter`, `SafetyGuard` — foundation only, no feature) → **AI Features** (one user-visible capability per milestone: explain-my-mistake, hint, recommend-next-topic, study-plan, tutor-chat — in that order, chat deliberately last) → **AI Optimization**.

**Why:** the user's explicit direction (2026-07-28) was to stop before starting AI immediately after Notification completed, even with every test green. AD-003 already establishes "AI never grades" — meaning AI's entire job is to enhance an already-working learning loop, not to be the thing that makes the product function. Building AI before the rest of the product demonstrably works end-to-end (not just passes backend integration tests, but actually renders and responds in a browser) risks building the enhancement layer before there's a proven base to enhance. Splitting Phase 2 into Foundation → Features → Optimization mirrors the same "decide the frozen boundary once, iterate freely behind it" pattern already used for `EventBus` (AD-006) and every repository interface in this codebase — locking in the provider abstraction before committing to any specific prompt design or feature avoids provider lock-in and expensive rework.

**Alternatives considered:**
1. *Go straight from Notification to AI feature work.* Rejected — explicit user instruction; also the pattern this codebase has consistently avoided (invent infrastructure/abstractions before there's a proven, concrete need — see AD's for AnalyticsEvent retention, the deferred `PromptTemplate`/`FeatureFlag` items in ARCHITECTURE.md §22).
2. *Build the real, polished product frontend now instead of a thin harness.* Rejected (explicit user choice) — bigger scope, slower to reach the "review the product flow" checkpoint the phase gate exists for, and premature before AI's UI needs are even known (AI features will likely need their own frontend surfaces the harness doesn't yet anticipate).
3. *Skip the frontend entirely and "review the flow" by re-reading backend integration tests.* Rejected — the whole point of this gate is proving the product works from a real user's vantage point (a browser), not re-confirming what the test suite already asserts about the API contract.
4. *Build all AI features in one pass instead of Foundation → Features → Optimization.* Rejected — committing to a provider/prompt design and five feature implementations simultaneously removes the option to course-correct after the first feature ships; the explicit user framing was "feature-driven, not service-driven," one milestone at a time.

**Status:** Frozen (the phase-gate + split itself; the harness's own internals are explicitly not frozen — iterate on it freely) · **Introduced:** v0.11.0 · **Last reviewed:** v0.11.0

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
| v0.9.0 | Analytics module (`AnalyticsEvent`, AD-012) | `f969f11` |
| v0.9.1 | `AnalyticsEvent` retention policy — 18-month TTL delete (AD-013) | `0448e25` |
| v0.10.0 | Notification module (`Notification`, `mastery_milestone` end-to-end, AD-014) | `ca1879a` |
| v0.11.0 | Frontend test harness (`mathsmentor-frontend/`) + Phase 2 AI gate (AD-015) | `<pending>` |

---

## 2026-07-28 — Frontend test harness built; Phase 1 end-to-end loop proven

**Status:** TypeScript ✅ (backend + frontend) · ESLint ✅ (backend) · oxlint ✅ (frontend, 1 pre-existing warning) · backend Tests ✅ (215/215, 25 suites, unchanged) · frontend has no automated tests (see Tech Debt) · commit `<pending>`

**Completed**
- `mathsmentor-frontend/` (Vite + React + TypeScript, `react-router-dom`) — a thin, deliberately unstyled test harness, not the product UI. Pages: login/register, student dashboard (profile creation, mastery table, full diagnostic loop, full practice loop), teacher dashboard (profile creation, class creation, roster + enroll/withdraw + membership history), parent dashboard (profile creation, link/unlink child by email, children table, notification-preference toggles), a shared layout with a polling notifications bell (unread badge, mark-read, mark-all-read).
- **AD-015** (new) — the phase-gate decision itself: frontend harness + manual end-to-end browser verification required before any AI module work begins; Phase 2 (AI) split into Foundation → Features → Optimization.
- `mathsmentor-backend/scripts/mint-admin-token.ts` (`npm run mint-admin-token`) — a small dev-only script printing a short-lived admin JWT, needed because the harness's Teacher dashboard requires a `School` to exist and Schools remain admin-provisioned by design (AD-009); documented as a bootstrap convenience, not a new admin-registration path.
- **Manually verified end-to-end in a real headless browser** (Playwright, throwaway script, not committed — see Tech Debt) against the real backend (real Mongo via the local MongoDB service, no Redis running — rate limiting fails open by design when Redis is unreachable, confirmed harmless for this check): student registers → creates profile → submits a correct practice answer → a real `mastery_milestone` notification appears in the bell within one poll cycle and can be marked read; the full diagnostic loop (start → answer → next question → complete, ending in a real `finalGradeEstimate`) also verified; teacher registers → creates profile against a bootstrapped School → creates a class → enrolls the student by ID → roster and membership history render correctly; parent registers → creates profile → links the student by email → sees the child's data → toggles notification preferences. All against the actual, real HTTP API — not mocked.
- Found and fixed one real bug during this verification: `NotificationsBell` fetched notifications once on mount and never again, so a notification created later in the same session (exactly the mastery-milestone case) never appeared without a full page reload. Fixed with a 5-second poll plus a refetch on every dropdown open.

**Architecture decisions**
- AD-015 (see Architecture Decisions Log) — frontend-harness-then-AI phase gate, Phase 2 Foundation/Features/Optimization split.

**Known technical debt**
- No automated frontend test suite (unit or e2e) — verified once, manually, via a throwaway Playwright script. Revisit if the harness grows or the AI phase adds screens.
- Frontend access tokens live in `localStorage`, no refresh-token flow — deliberate harness simplification, never acceptable for a real product frontend.
- No in-app way to bootstrap a `School` — by design (Schools are admin-provisioned, AD-009); requires `npm run mint-admin-token` + a manual curl call, documented in the frontend README.
- A logout click occasionally shows an aborted `/auth/logout` request in the browser console — cosmetic, no functional impact since the harness never uses the refresh-token cookie that request would otherwise clear.

**Next milestone**
Phase 2 — AI Foundation (the `AIProvider`/`PromptBuilder`/`ConversationContext`/`TokenCounter`/`AIResponse`/`RateLimiter`/`SafetyGuard` abstraction layer only, no feature implementation) — not started, awaiting explicit direction per AD-015's phase gate.

---

## 2026-07-28 — Notification module complete

**Status:** TypeScript ✅ · ESLint ✅ · Tests ✅ (215/215, 25 suites) · commit `ca1879a`

**Completed**
- `Notification` (DOMAIN_MODEL.md §2.12) — full repository interface → Mongoose model/repository → service → Zod validation → controller → routes → unit tests → integration tests. Unread-first inbox index (`{ userId:1, readAt:1, createdAt:-1 }`) exactly as specified.
- Real, end-to-end functionality per the user's functionality-over-CRUD directive: a student who submits a correct practice answer (or completes a diagnostic) that crosses a topic's mastery threshold for the first time gets a real, visible, mark-readable in-app notification — verified against real Mongo in `notification.test.ts`, not just unit-mocked.
- **AD-014** (new) — `mastery.service` publishes its first-ever event, `MASTERY_EVENTS.MasteryMilestoneReached`, when a topic's `masteryScore` crosses 0.8 upward; `notification.service` subscribes and creates the `mastery_milestone` Notification, resolving the recipient's auth `userId` via `studentService.getById` (mastery only knows the StudentProfile id).
- Self-scoped inbox API: `GET /notifications` (unread-first, filterable by `unreadOnly`/`limit`), `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` — any authenticated role, ownership-checked (a user can only mark their own notifications read; verified with a 403 test).
- Removed the stale `src/modules/notification/README.md` scaffold placeholder.

**Architecture decisions**
- AD-014 (see Architecture Decisions Log) — the first mastery.service change since its original build; a narrow, justified reopening of a frozen module, same category as AD-011's reopening of `student`.

**Known technical debt**
- Only `mastery_milestone` of DOMAIN_MODEL.md §2.12's four `NotificationType`s is wired end-to-end. `streak_reminder`, `weekly_report`, and `assignment_due` are deferred — each needs infrastructure or data this codebase doesn't have yet (a streak concept, a scheduled/cron job runner, a `PracticeSession` due date). Documented as real gaps, not silently dropped.
- No email delivery — `deliveredVia` is always `['in_app']`; DOMAIN_MODEL.md's `'email'` channel is modeled but unimplemented, same placeholder status as auth's verification/reset emails.
- `MasteryMilestoneReached` fires on every upward threshold-crossing, not just the first ever (a score that dips and re-crosses re-fires) — documented simplification.
- Notification doesn't (yet) also notify a student's linked parents on a milestone — a natural extension once real product demand exists.
- `docs/openapi/auth.yaml` still doesn't cover Notification's routes.

**Next milestone**
None queued per explicit scope instruction — AI is the only backend module still planned; Deployment/CI/CD/OpenAPI remain out of scope until requested.

---

## 2026-07-28 — Analytics module complete

**Status:** TypeScript ✅ · ESLint ✅ · Tests ✅ (201/201, 23 suites) · commit `f969f11`

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
