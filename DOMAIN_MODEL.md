# MathsMentor AI — Domain Model & Database Contract

Status: Second foundational artifact, produced per the agreed sequencing (Architecture → **Domain Model & Database Contract** → Backend Scaffolding). Nothing here should be implemented until this is reviewed — this document is what repositories, services, and later the API contract are derived *from*, not the other way around.

This document assumes the layering from `ARCHITECTURE.md` §21.2: every collection below has exactly one owning module, exposed to that module's services only through a repository **interface**; the Mongoose schema is an implementation detail of `infrastructure/persistence/mongoose/`.

---

## 0. Conventions used below

- **Type notation** is TypeScript-flavored, not literal Mongoose schema syntax — this is a contract, not code.
- `Ref<X>` = ObjectId reference to collection X. `Embed<X>` = subdocument, not independently queryable.
- Every collection implicitly has `_id: ObjectId`, `createdAt: Date`, `updatedAt: Date` unless stated otherwise (timestamps enabled).
- **Owning module** states which module's repository interface is the *only* sanctioned write path. Other modules read via that module's service, never via a second repository over the same collection.
- **Aggregate root** (yes/no) — no means the type only exists embedded inside a root and is never independently persisted or queried.

---

## 1. Aggregate Map

```
User ──1:1── StudentProfile ──*:*── ClassGroup ──*:1── School
  │               │  │                  │
  │               │  └──*:*── ParentProfile (via User)
  │               │
  │               ├──1:*── DiagnosticAttempt ──*── DiagnosticItem (embedded)
  │               ├──1:*── PracticeSession ──*── PracticeItem (embedded)
  │               ├──1:*── MasteryRecord (one per Topic)
  │               ├──1:*── StudyPlan
  │               └──1:*── ChatConversation ──1:*── ChatMessage
  │
  ├──1:1── TeacherProfile ──*:*── ClassGroup
  │
  └──1:*── RefreshToken

Topic (curriculum graph, largely static/admin-authored)
  └──1:*── Question ──referenced by──> DiagnosticItem, PracticeItem

AnalyticsEvent — append-only, references any aggregate by (aggregateType, aggregateId)
```

**Consistency boundaries (aggregates that must be transactionally consistent with themselves, and nothing more):**

- `User` is its own aggregate — auth state changes independently of profile data.
- `StudentProfile` is its own aggregate — a diagnostic/practice submission does **not** hold `StudentProfile` in the same write; it emits an event that `MasteryRecord`/`StudyPlan` react to asynchronously (per `ARCHITECTURE.md` §21.1). This is deliberate: coupling "save this attempt" and "recompute mastery" into one transaction makes the hot path (submitting an answer) do strictly more work than it needs to, for a consistency guarantee students don't actually need instantaneously.
- `DiagnosticAttempt` and `PracticeSession` are each their own aggregate, embedding their own items — an attempt's items are never queried independently of the attempt, so embedding (not a separate collection) is correct here (see §7 for the general embed-vs-reference rule applied).
- `MasteryRecord` is an eventually-consistent **read model**, not a source of truth — the source of truth for "is this student good at fractions" is the full history of `DiagnosticAttempt`/`PracticeSession` documents; `MasteryRecord` is a materialized, denormalized projection kept up to date by event handlers, rebuildable from scratch if it ever drifts.

---

## 2. Collections

### 2.1 `User`

**Owning module:** `auth` · **Aggregate root:** yes

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | `string` | yes | unique, lowercased before save |
| `passwordHash` | `string` | yes (unless `authProvider !== 'password'`) | bcrypt, never selected by default (`select: false`) |
| `role` | `'student' \| 'teacher' \| 'parent' \| 'admin'` | yes | immutable after creation — role changes are a deliberate admin action, not a profile edit |
| `status` | `'invited' \| 'active' \| 'suspended' \| 'deleted'` | yes | default `'invited'` |
| `emailVerifiedAt` | `Date \| null` | no | |
| `authProvider` | `'password' \| 'google' \| 'microsoft'` | yes | default `'password'`; school SSO likely needed later (§8) |
| `lastLoginAt` | `Date \| null` | no | |
| `failedLoginAttempts` | `number` | yes | default 0, reset on success — backs account lockout |

**Business rules**
- A `User` cannot be hard-deleted while it has any `StudentProfile`/`TeacherProfile`/`ParentProfile` referencing it with unresolved data-retention obligations — deletion is a soft `status: 'deleted'` + PII-scrub job (see §8, children's data).
- `email` uniqueness is enforced at the database level (unique index), *not* only in application code — application-level "check then insert" has a race condition under concurrent signups.

**Indexes:** `{ email: 1 }` unique · `{ role: 1, status: 1 }` (admin listing/filtering)

**Repository interface**
```
UserRepository {
  findById(id): User | null
  findByEmail(email): User | null           // used by auth login flow
  create(data): User
  updateStatus(id, status): void
  incrementFailedLogin(id): number          // atomic $inc, returns new count
  resetFailedLogin(id): void
}
```

**Events published:** `UserRegistered`, `UserSuspended`, `UserDeleted`

---

### 2.2 `StudentProfile`

**Owning module:** `student` · **Aggregate root:** yes

| Field | Type | Required | Notes |
|---|---|---|---|
| `userId` | `Ref<User>` | yes | unique — 1:1 with User |
| `displayName` | `string` | yes | shown in UI; separate from legal name for minors-privacy reasons |
| `dateOfBirth` | `Date` | yes | drives age-appropriate-design handling (§8); access-restricted field |
| `examBoard` | `'AQA' \| 'Edexcel' \| 'OCR' \| 'WJEC'` | yes | |
| `tier` | `'foundation' \| 'higher'` | yes | can change over time as ability is established |
| `targetGrade` | `number (1-9)` | no | student/teacher-set aspiration |
| `currentEstimatedGrade` | `number (1-9) \| null` | no | **written only by the diagnostic/mastery event handler, never by a direct user edit** |
| `classIds` | `Ref<ClassGroup>[]` | yes | default `[]` |
| `parentIds` | `Ref<User>[]` | yes | default `[]`; parents linked via invite/verification flow, not self-declared |
| `onboardingCompletedAt` | `Date \| null` | no | |

**Business rules**
- `currentEstimatedGrade` is derived, not directly writable via any student/teacher-facing endpoint — enforced by only exposing an `updateEstimatedGrade` method on the repository, called exclusively from the mastery event handler, not from `student.controller`.
- A student can belong to multiple `ClassGroup`s (e.g. changes class mid-year) — history of class membership is **not** overwritten; see `ClassGroup` for how past membership is preserved for reporting continuity.

**Indexes:** `{ userId: 1 }` unique · `{ classIds: 1 }` (class roster queries) · `{ parentIds: 1 }` (parent dashboard queries)

**Repository interface**
```
StudentRepository {
  findByUserId(userId): StudentProfile | null
  findByClassId(classId): StudentProfile[]
  findByParentId(parentId): StudentProfile[]
  updateEstimatedGrade(studentId, grade): void   // the ONLY write path for this field
  updateProfile(studentId, patch): StudentProfile
}
```

**Events published:** `StudentEnrolled`, `StudentGradeEstimateChanged`

---

### 2.3 `TeacherProfile` / `ParentProfile`

**Owning module:** `teacher` / `parent` respectively · **Aggregate root:** yes (both)

Both are structurally simple — `userId (Ref<User>, unique)` plus role-specific fields:

- `TeacherProfile`: `schoolId (Ref<School>)`, `classIds (Ref<ClassGroup>[])`, `subjects (string[])`.
- `ParentProfile`: `verifiedStudentIds (Ref<StudentProfile>[])` — populated only after a verification flow (not simply "parent claims a student"), plus `notificationPreferences`.

**Business rule worth calling out:** a parent-student link changes `StudentProfile.parentIds` *and* `ParentProfile.verifiedStudentIds` — this is the one place in the model with a genuine two-aggregate consistency requirement. Handled as: `ParentProfile` is the aggregate that owns the *link creation* (verification flow lives here), and on success it calls `student.service.addParentLink(...)`, which is the only writer of `StudentProfile.parentIds`. Not a distributed transaction — a service-to-service call with the second write treated as the "commit" (if it fails, the parent link is retried/reconciled, not left silently half-created — this is exactly the kind of edge case a background reconciliation job, per §21.3 in the architecture doc, exists for).

**Indexes:** `{ userId: 1 }` unique on both · `{ schoolId: 1 }` on `TeacherProfile`.

---

### 2.4 `School` / `ClassGroup`

**Owning module:** `teacher` (schools/classes are managed primarily through teacher/admin flows) · **Aggregate roots:** yes (both)

`School`: `name`, `address (Embed)`, `subscriptionTier ('trial'|'standard'|'premium')`, `contactEmail`.

`ClassGroup`:

| Field | Type | Required | Notes |
|---|---|---|---|
| `schoolId` | `Ref<School>` | yes | |
| `name` | `string` | yes | e.g. "Year 10 Foundation B" |
| `examBoard` / `tier` | as above | yes | class-level default, student can override |
| `teacherIds` | `Ref<User>[]` | yes | |
| `activeStudentIds` | `Ref<StudentProfile>[]` | yes | **current** roster |
| `membershipHistory` | `Embed<{studentId, joinedAt, leftAt}>[]` | yes | append-only — never mutate a past entry, close it with `leftAt` and add a new one on class change |
| `academicYear` | `string` | yes | e.g. `"2025/26"` — classes are year-scoped, not reused across years |

**Why `membershipHistory` embedded rather than derived from event log:** teacher/parent dashboards need "who was in this class in December" answered by a single document read, not a scan over `AnalyticsEvent`. The event log is the audit trail; this embedded array is the query-optimized projection of it, scoped small (bounded by class size × moves per year, not unbounded).

**Indexes:** `{ schoolId: 1 }` · `{ teacherIds: 1 }` · `{ activeStudentIds: 1 }`

---

### 2.5 `Topic` (curriculum graph)

**Owning module:** `curriculum` (renamed from `lesson` per architecture §amendment — this module owns the full curriculum graph, not just lesson content) · **Aggregate root:** yes

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | `string` | yes | e.g. "Simplifying fractions" |
| `examBoard` | `string` | yes | curriculum differs slightly by board |
| `tier` | `'foundation' \| 'higher' \| 'both'` | yes | |
| `gradeBand` | `number[]` | yes | which GCSE grades this topic is examined at, e.g. `[3,4,5]` |
| `prerequisiteTopicIds` | `Ref<Topic>[]` | yes | forms the DAG — **must be acyclic**, validated at write time in the service, not left to the database |
| `status` | `'draft' \| 'published'` | yes | admin-authored content workflow |

**Business rule:** the prerequisite graph must remain a DAG. This is enforced in `curriculum.service.addPrerequisite()` by walking the graph before writing (cycle check), not by any database constraint — MongoDB cannot express this, which is exactly the kind of relational integrity §"Challenges to the brief" in the architecture doc flagged as needing deliberate application-layer handling.

**Indexes:** `{ examBoard: 1, tier: 1, gradeBand: 1 }` (diagnostic/practice topic selection queries) · `{ status: 1 }`

---

### 2.6 `Question` (question bank)

**Owning module:** `curriculum` (content authoring) — consumed by `diagnostic` and `practice` · **Aggregate root:** yes

| Field | Type | Required | Notes |
|---|---|---|---|
| `topicId` | `Ref<Topic>` | yes | |
| `type` | `'mcq' \| 'numeric' \| 'algebraic' \| 'multi-step'` | yes | determines which grading strategy in `domain/grading` applies |
| `difficulty` | `number (1-5)` | yes | used by the adaptive diagnostic engine |
| `promptText` | `string` | yes | supports embedded LaTeX/markdown |
| `promptAssets` | `Embed<{type, url}>[]` | no | diagrams, images |
| `answerKey` | `Embed<AnswerKey>` | yes | **shape varies by `type`** — see below; this field is never sent to the client |
| `markScheme` | `Embed<{steps: string[]}>` | no | used by AI tutor for explanation context, never for grading |
| `tags` | `string[]` | no | free-form, for search/filtering in authoring UI |
| `status` | `'draft' \| 'published' \| 'retired'` | yes | retired ≠ deleted — past attempts must still resolve their question |

**`answerKey` shapes (discriminated by `type`):**
- `mcq` → `{ correctOptionId: string }`
- `numeric` → `{ value: number, tolerance: number }` (floating point GCSE answers need tolerance, not exact equality)
- `algebraic` → `{ acceptedForms: string[], equivalenceRule: 'symbolic' }` (flags that `domain/grading` must use a symbolic-equivalence check, e.g. "2x+4" vs "4+2x", not string match)
- `multi-step` → `{ steps: Embed<{stepAnswerKey}>[] }`

**Business rule:** `answerKey` must never be included in any API response reachable by a student or any `ai/*` service's prompt construction — this is enforced by a dedicated Mongoose projection/DTO mapper at the repository boundary (`toPublicQuestion(question)` strips `answerKey`), not by trusting every controller to remember to omit it. Given constraint #1 in the architecture doc (AI never grades), leaking `answerKey` into an AI prompt would be a direct violation of the product's core guarantee, so this is treated as a security-sensitive field, not just an internal one.

**Indexes:** `{ topicId: 1, difficulty: 1, status: 1 }` (the primary diagnostic/practice selection query) · `{ tags: 1 }` (authoring search)

**Repository interface**
```
QuestionRepository {
  findById(id): Question | null                  // internal use, includes answerKey
  findPublicById(id): PublicQuestion | null       // answerKey stripped — the ONLY variant exposed outward
  findForTopic(topicId, difficultyRange, limit): PublicQuestion[]
  create(data): Question
  publish(id): void
  retire(id): void
}
```

---

### 2.7 `DiagnosticAttempt`

**Owning module:** `diagnostic` · **Aggregate root:** yes

| Field | Type | Required | Notes |
|---|---|---|---|
| `studentId` | `Ref<StudentProfile>` | yes | |
| `status` | `'in_progress' \| 'completed' \| 'abandoned'` | yes | |
| `startedAt` / `completedAt` | `Date` / `Date \| null` | yes/no | |
| `abilityEstimateHistory` | `Embed<{afterItem: number, theta: number}>[]` | yes | IRT-style ability trace, one entry per item administered |
| `items` | `Embed<DiagnosticItem>[]` | yes | see below — embedded, bounded (a diagnostic is ~15-25 items, never unbounded) |
| `finalGradeEstimate` | `number \| null` | no | set on completion |
| `topicBreakdown` | `Embed<{topicId, score}>[]` | no | set on completion, feeds `MasteryRecord` bootstrap |

`DiagnosticItem` (embedded, not an aggregate root): `{ questionId: Ref<Question>, presentedDifficulty: number, studentAnswer: any, isCorrect: boolean, timeTakenMs: number, hintRequested: boolean }`.

**Why embedded, not a separate `DiagnosticAttemptItem` collection:** items are always read/written as part of their parent attempt (the adaptive engine needs the whole item history in memory to pick the next question), the array is small and bounded, and there is no query pattern that needs "all items across all attempts" independent of their attempt. This is the general rule applied: **embed when the sub-entity's lifecycle and query pattern are fully owned by the parent; reference when it has independent query needs or unbounded growth** (contrast with `ChatMessage`, §2.10, which fails this test and is therefore a separate collection).

**Business rule:** `isCorrect` on each item is computed by `domain/grading` at submission time and stored — **never recomputed from `answerKey` later on the fly for display**, so that a later change to a question's answer key (e.g. correcting a bad question) does not retroactively rewrite a student's historical result. Historical attempts are immutable records of what happened, not live-recomputed views.

**Indexes:** `{ studentId: 1, startedAt: -1 }` (attempt history, most-recent-first) · `{ status: 1 }` (finding abandoned attempts for cleanup jobs)

**Repository interface**
```
DiagnosticRepository {
  findById(id): DiagnosticAttempt | null
  findInProgressForStudent(studentId): DiagnosticAttempt | null   // enforces "one active diagnostic at a time"
  create(studentId): DiagnosticAttempt
  appendItem(attemptId, item): DiagnosticAttempt
  complete(attemptId, finalGradeEstimate, topicBreakdown): void
}
```

**Events published:** `DiagnosticCompleted { studentId, finalGradeEstimate, topicBreakdown }`

---

### 2.8 `PracticeSession`

**Owning module:** `practice` · **Aggregate root:** yes

Structurally parallel to `DiagnosticAttempt` but without the adaptive ability trace:

| Field | Type | Required | Notes |
|---|---|---|---|
| `studentId` | `Ref<StudentProfile>` | yes | |
| `source` | `'self_selected' \| 'teacher_assigned' \| 'ai_recommended'` | yes | drives analytics on what's effective |
| `assignedByTeacherId` | `Ref<User> \| null` | no | set when `source === 'teacher_assigned'` |
| `topicIds` | `Ref<Topic>[]` | yes | |
| `items` | `Embed<PracticeItem>[]` | yes | same embed-vs-reference reasoning as §2.7 |
| `startedAt` / `completedAt` | `Date` / `Date \| null` | yes/no | |

`PracticeItem` (embedded): `{ questionId, studentAnswer, isCorrect, timeTakenMs, hintsUsedCount, submittedAt }`.

**Business rule:** identical immutability rule to `DiagnosticAttempt.items[].isCorrect` — computed once at submission, never recomputed.

**Indexes:** `{ studentId: 1, startedAt: -1 }` · `{ assignedByTeacherId: 1 }` (teacher "did my assigned homework get done" queries)

**Repository interface:** same shape as `DiagnosticRepository`, substituting `PracticeSession`/`PracticeItem`.

**Events published:** `PracticeItemSubmitted { studentId, topicId, questionId, isCorrect }` (per-item, fired as each answer is submitted — this is the fine-grained event that `MasteryRecord`/streak handlers subscribe to; contrast with `DiagnosticCompleted` which fires once at the end of a full attempt).

---

### 2.9 `MasteryRecord`

**Owning module:** `student` (it's a per-student read model; not owned by `practice`/`diagnostic`, which only ever *emit events* it reacts to — see architecture doc §21.1) · **Aggregate root:** yes, but **event-handler-write-only**

| Field | Type | Required | Notes |
|---|---|---|---|
| `studentId` | `Ref<StudentProfile>` | yes | |
| `topicId` | `Ref<Topic>` | yes | |
| `masteryScore` | `number (0-1)` | yes | exponentially-weighted, recent attempts weighted higher |
| `attemptsCount` / `correctCount` | `number` | yes | |
| `lastPracticedAt` | `Date` | yes | |
| `trend` | `'improving' \| 'stable' \| 'declining'` | yes | computed on update, used directly by teacher dashboard without recomputation |

**Business rule — the one to enforce hardest in code review:** no controller, no service outside the `mastery.onPracticeItemSubmitted` / `mastery.onDiagnosticCompleted` event handlers may call `masteryRepository.upsert(...)`. If a bug is ever found in mastery scores, the fix is a backfill job that replays `AnalyticsEvent`/attempt history through the same handler logic, not a one-off manual `db.masteryrecords.update(...)` — because this collection is a projection, it must always be exactly reproducible from source data, or it silently becomes a second source of truth that drifts.

**Indexes:** `{ studentId: 1, topicId: 1 }` unique compound (one record per student-topic pair, upserted) · `{ studentId: 1, masteryScore: 1 }` (student's weakest topics, for study-plan generation)

**Repository interface**
```
MasteryRepository {
  findByStudent(studentId): MasteryRecord[]
  findByStudentAndTopic(studentId, topicId): MasteryRecord | null
  upsertFromAttempt(studentId, topicId, isCorrect, occurredAt): MasteryRecord   // ONLY write path, event-handler-only by convention + code review, not DB-enforced
}
```

---

### 2.10 `StudyPlan`

**Owning module:** `student` (consumes `ai/study-plan` + `domain/curriculum`, doesn't belong to either) · **Aggregate root:** yes

| Field | Type | Required | Notes |
|---|---|---|---|
| `studentId` | `Ref<StudentProfile>` | yes | |
| `generatedAt` | `Date` | yes | |
| `validUntil` | `Date` | yes | plans expire and regenerate, not edited in place |
| `recommendedTopics` | `Embed<{topicId, priority, reasonCode}>[]` | yes | `reasonCode` is an enum (`'low_mastery' \| 'exam_imminent' \| 'prerequisite_gap'`), not free text — keeps this machine-actionable and testable, with human-readable copy generated at render time from the code, not stored |
| `status` | `'generating' \| 'ready' \| 'stale'` | yes | `'generating'` while the background job (architecture §21.3) runs |

**Business rule:** `recommendedTopics` ordering/selection is produced by rule-based logic in `domain/curriculum` (weakest `MasteryRecord`s + prerequisite gaps + exam proximity) — the AI's role, if used at all, is to generate the *human-readable rationale text* for an already-decided recommendation, never to decide the recommendation itself. Same constraint #1 pattern as grading, applied to planning: AI explains, domain logic decides.

**Indexes:** `{ studentId: 1, generatedAt: -1 }`

---

### 2.11 `ChatConversation` + `ChatMessage`

**Owning module:** `ai/tutor` (one of the five split AI services — see architecture §14 amendment) · **Aggregate roots:** `ChatConversation` yes; `ChatMessage` yes (deliberately *not* embedded — see below)

`ChatConversation`: `{ studentId, contextType ('question'|'topic'|'general'), contextRefId, startedAt, lastMessageAt, archivedAt }`.

`ChatMessage`: `{ conversationId (Ref<ChatConversation>), role ('student'|'assistant'), content, createdAt }`.

**Why `ChatMessage` is a separate collection, breaking the embed-by-default pattern used for `DiagnosticItem`/`PracticeItem`:** conversations are unbounded in length (a struggling student could have a very long back-and-forth), and MongoDB's 16MB document size limit is a real risk for an embedded array of AI conversation text over time in a way a ~25-item diagnostic never approaches. This is the concrete case that motivated stating the embed-vs-reference rule explicitly in §2.7 — same product, two different answers, because the actual data shape differs.

**Business rule:** `ChatMessage.content` is never sent to `domain/grading` and never influences `isCorrect` on any attempt — none of the `ai/*` services have write access to `PracticeSession`/`DiagnosticAttempt` collections at all (no repository dependency exists between them), which is the data-layer enforcement of constraint #1, complementing the import-boundary enforcement described in the architecture doc.

**Indexes:** `{ studentId: 1, lastMessageAt: -1 }` on `ChatConversation` · `{ conversationId: 1, createdAt: 1 }` on `ChatMessage` (paginated message history)

---

### 2.12 `Notification`

**Owning module:** `notification` — formalized as its own thin module (subscribes to domain events, has its own repository) rather than left informally shared between `student`/`parent`/`teacher`, resolving the open question originally flagged here

| Field | Type | Required | Notes |
|---|---|---|---|
| `userId` | `Ref<User>` | yes | recipient — student, teacher, or parent |
| `type` | `'streak_reminder' \| 'weekly_report' \| 'assignment_due' \| 'mastery_milestone'` | yes | |
| `payload` | `Embed<Record<string, unknown>>` | yes | type-specific data for rendering |
| `readAt` | `Date \| null` | no | |
| `deliveredVia` | `('in_app' \| 'email')[]` | yes | |

**Indexes:** `{ userId: 1, readAt: 1, createdAt: -1 }` (unread-first inbox query)

---

### 2.13 `AnalyticsEvent`

**Owning module:** `analytics` — but written to by the event bus infrastructure on behalf of every module (architecture §21.1), not by `analytics` calling out to other modules

| Field | Type | Required | Notes |
|---|---|---|---|
| `eventType` | `string` | yes | e.g. `'PracticeItemSubmitted'`, `'DiagnosticCompleted'` |
| `aggregateType` / `aggregateId` | `string` / `ObjectId` | yes | polymorphic reference — deliberately not a typed `Ref`, since this collection spans every aggregate type |
| `studentId` | `Ref<StudentProfile> \| null` | no | denormalized onto every event for fast "all events for this student" queries, even though it's derivable from the referenced aggregate — a deliberate, documented denormalization, not an oversight |
| `payload` | `Embed<Record<string, unknown>>` | yes | event-specific |
| `occurredAt` | `Date` | yes | |

**This collection doubles as the durable event log** referenced in the architecture doc's future durable-event-bus design (§21.1) — every in-process event handler run also writes here as a side effect via a dedicated `analytics.onAnyEvent` subscriber, giving an audit trail and rebuild source from day one even while the bus itself stays in-process.

**Indexes:** `{ studentId: 1, occurredAt: -1 }` · `{ eventType: 1, occurredAt: -1 }` · `{ occurredAt: 1 }` with `expireAfterSeconds` set to an 18-month retention window (PROGRESS.md AD-013 — resolves the retention question left open in §5).

---

### 2.14 `RefreshToken`

**Owning module:** `auth` · **Aggregate root:** yes

| Field | Type | Required | Notes |
|---|---|---|---|
| `userId` | `Ref<User>` | yes | |
| `tokenHash` | `string` | yes | never store the raw token |
| `expiresAt` | `Date` | yes | TTL-indexed — MongoDB auto-purges expired documents |
| `revokedAt` | `Date \| null` | no | set on rotation/logout |
| `replacedByTokenHash` | `string \| null` | no | rotation chain, lets a reuse-of-a-revoked-token be detected as a theft signal |
| `userAgent` / `ipAddress` | `string` | no | audit only |

**Indexes:** `{ tokenHash: 1 }` unique · `{ expiresAt: 1 }` TTL index (`expireAfterSeconds: 0`)

**Note on choice of store:** kept in MongoDB rather than Redis-only, despite Redis being the natural fit for ephemeral session-like data (as used elsewhere for cache/rate-limit, per architecture §17/§18). Rationale: refresh-token theft detection (the `replacedByTokenHash` reuse check) benefits from the same durability/query tooling as the rest of the auth audit trail, and the volume (one active document per logged-in device, not per-request) is trivial compared to `AnalyticsEvent`. Revisit this if session volume ever becomes a real Mongo load concern — Redis with a mirrored audit write would be the fallback, not a full redesign.

---

## 3. Repository Interfaces — summary table

| Module | Repository | Backing collection(s) |
|---|---|---|
| `auth` | `UserRepository`, `RefreshTokenRepository` | `User`, `RefreshToken` |
| `student` | `StudentRepository`, `MasteryRepository`, `StudyPlanRepository` | `StudentProfile`, `MasteryRecord`, `StudyPlan` |
| `teacher` | `TeacherRepository`, `SchoolRepository`, `ClassGroupRepository` | `TeacherProfile`, `School`, `ClassGroup` |
| `parent` | `ParentRepository` | `ParentProfile` |
| `curriculum` | `TopicRepository`, `QuestionRepository` | `Topic`, `Question` |
| `diagnostic` | `DiagnosticRepository` | `DiagnosticAttempt` |
| `practice` | `PracticeRepository` | `PracticeSession` |
| `ai/tutor` | `ChatRepository` | `ChatConversation`, `ChatMessage` |
| `analytics` | `AnalyticsEventRepository` | `AnalyticsEvent` |
| `notification` | `NotificationRepository` | `Notification` |

Every interface above lives in its owning module's folder (`modules/<module>/<x>.repository.interface.ts`) per architecture §21.2; every implementation lives in `infrastructure/persistence/mongoose/repositories/`.

---

## 4. Common Query Patterns (drives index choices above)

- **Student dashboard**: `MasteryRepository.findByStudent(studentId)` + latest `StudyPlan` — two cheap indexed reads, no aggregation pipeline needed on the hot path.
- **Teacher class overview**: `ClassGroup.activeStudentIds` → batch `MasteryRepository.findByStudent` per student, or (once class sizes/load justify it) a dedicated aggregation pipeline computing class-wide topic averages — start with the simple batched version, only build the aggregation pipeline when a real teacher-dashboard latency problem appears.
- **Parent dashboard**: `ParentProfile.verifiedStudentIds` → same read pattern as teacher, scoped to one or two students instead of a class.
- **Diagnostic adaptive engine, mid-attempt**: single read of the in-progress `DiagnosticAttempt` (has full item history in memory already), plus `QuestionRepository.findForTopic(...)` filtered by the next target difficulty — no cross-collection join needed per-item, which matters because this runs on every single question during a live assessment.
- **"Weakest topics for study plan"**: `MasteryRepository` query sorted by `masteryScore` ascending, filtered to topics valid for the student's `examBoard`/`tier` — this is why `{ studentId: 1, masteryScore: 1 }` is indexed.
- **Analytics/reporting**: always against `AnalyticsEvent` or `MasteryRecord`, never a live aggregation over `DiagnosticAttempt`/`PracticeSession` item arrays across many students — those collections are optimized for per-student attempt history, not cross-student analytics scans.

---

## 5. Open questions / recommendations before scaffolding

1. ~~Notification as its own module?~~ **Resolved** — formalized as `notification` in the architecture doc's amended module table (§21) and reflected in §2.12 above.
2. ~~`AnalyticsEvent` retention policy~~ **Resolved** — 18-month hard TTL delete (no archival tier), formalized as PROGRESS.md AD-013 and reflected in §2.13 above.
3. **`dateOfBirth` and other minor-PII fields** should get a documented field-level access policy (who can read it — not even all teachers may need to) before the `student` module's repository is implemented, not added after the fact as a patch.

Recommend resolving these three before backend scaffolding begins; none of them changes the shape of the model above, but all three change repository method signatures (field-level access control, retention-aware queries) if decided after the fact instead of now.
