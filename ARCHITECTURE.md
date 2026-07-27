# MathsMentor AI — Backend Architecture

Status: Foundational design document. No application code has been written yet — this is the blueprint the codebase must conform to before Prompt 2 (folder scaffolding) and Prompt 3 (backend foundation) begin.

**Amendment (post-review):** the initial draft implied a repository layer but didn't formalize it, and left domain events, background jobs, and observability as future concerns rather than day-one structure. Both are corrected below (§21) and the folder structure and module boundaries throughout now assume these from the start. The next artifact per the agreed sequencing is the Domain Model & Database Contract (separate document), which the repository interfaces defined there must satisfy.

---

## 0. Guiding constraints (why this document looks the way it does)

Three product facts drive almost every decision below:

1. **AI must never grade.** Correctness is a business rule, not a model output. This means the AI layer is a *sibling* of the domain layer, not a dependency of it — the domain layer must be able to run, be tested, and be correct with the AI layer entirely absent (e.g. Ollama down). This single constraint is the reason for the strict layering in §2 and the AI abstraction in §14.
2. **"Thousands of concurrent students" is a stated scale target**, not the day-one reality. The architecture must not *require* premature infrastructure (no Kafka on day one), but it must not *block* horizontal scaling later (no in-process session state, no filesystem-as-database). This is the "why" behind the stateless-server + external-store choices throughout.
3. **Provider churn is expected** (Ollama → OpenAI/Claude/Gemini). Any code that imports a provider SDK outside of one adapter file is a bug, full stop.

Everything else is in service of these three.

---

## 1. Folder Structure

```
mathsmentor-backend/
├── src/
│   ├── config/                     # env loading, typed config objects (§9)
│   │   ├── env.ts
│   │   ├── database.config.ts
│   │   ├── ai.config.ts
│   │   └── index.ts
│   │
│   ├── modules/                    # domain-driven, one folder per bounded context (§3, §4)
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repository.interface.ts   # contract — module owns the interface (§21.2)
│   │   │   ├── auth.validation.ts  # zod/joi schemas
│   │   │   ├── auth.types.ts
│   │   │   ├── auth.events.ts       # events this module publishes (§21.1)
│   │   │   └── auth.test.ts
│   │   ├── student/
│   │   ├── diagnostic/
│   │   ├── curriculum/              # renamed from "lesson" — owns Topic, Question, Lesson, prerequisite graph (§ amendment below)
│   │   ├── practice/
│   │   ├── analytics/
│   │   ├── teacher/
│   │   ├── parent/
│   │   ├── notification/
│   │   └── ai/                      # split from a single "ai-tutor" module (§ amendment below)
│   │       ├── tutor/               # chat/tutoring conversations
│   │       ├── study-plan/          # rationale-text generation for domain/curriculum's recommendations
│   │       ├── hint/                # in-the-moment hints during practice/diagnostic
│   │       ├── ocr/                 # handwritten-work interpretation (feeds hint/tutor, never grading)
│   │       ├── recommendation/      # teacher/parent insight summaries, weekly reports
│   │       └── prompt-builder/      # shared prompt construction, used by every service above
│   │
│   ├── domain/                      # cross-module business logic that belongs to no single module
│   │   ├── grading/                 # correctness engine — pure functions, zero I/O
│   │   ├── curriculum/              # GCSE topic graph, difficulty models
│   │   └── shared-kernel/           # value objects shared across modules (e.g. Grade, Topic)
│   │
│   ├── infrastructure/              # concrete implementations of interfaces defined in domain/modules
│   │   ├── ai/
│   │   │   ├── ai-provider.interface.ts
│   │   │   ├── providers/
│   │   │   │   ├── ollama.provider.ts
│   │   │   │   ├── openai.provider.ts   # added later, zero changes elsewhere
│   │   │   │   └── claude.provider.ts
│   │   │   └── ai-provider.factory.ts
│   │   ├── persistence/
│   │   │   ├── mongoose/
│   │   │   │   ├── connection.ts
│   │   │   │   ├── models/           # Mongoose schemas — implementation detail, NOT exported outside infra/
│   │   │   │   └── repositories/     # implements each module's *.repository.interface.ts (§21.2)
│   │   │   │       ├── mongo-student.repository.ts
│   │   │   │       ├── mongo-question.repository.ts
│   │   │   │       └── ...
│   │   │   └── redis/
│   │   │       └── cache.client.ts
│   │   ├── storage/                  # file upload backend (§15)
│   │   │   ├── storage.interface.ts
│   │   │   └── providers/
│   │   │       ├── local.provider.ts
│   │   │       └── s3.provider.ts
│   │   ├── events/                   # domain event bus (§21.1)
│   │   │   ├── event-bus.interface.ts
│   │   │   ├── in-process.event-bus.ts     # day-one implementation (Node EventEmitter)
│   │   │   └── durable.event-bus.ts        # future: outbox + queue-backed, same interface
│   │   ├── jobs/                     # background job runner (§21.3)
│   │   │   ├── job-queue.interface.ts
│   │   │   └── bullmq.job-queue.ts         # added when first real background job is needed
│   │   ├── observability/            # (§21.5)
│   │   │   ├── health.ts             # GET /health — liveness (process is up)
│   │   │   ├── readiness.ts          # GET /ready — dependency checks (Mongo, Redis, AI reachable)
│   │   │   └── metrics.ts            # GET /metrics — prometheus-format counters/histograms
│   │   └── logging/
│   │       └── logger.ts
│   │
│   ├── middleware/                   # cross-cutting HTTP concerns (§6, §16)
│   │   ├── auth.middleware.ts
│   │   ├── error-handler.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   ├── validate.middleware.ts
│   │   ├── request-context.middleware.ts
│   │   └── security.middleware.ts    # helmet, cors, sanitize
│   │
│   ├── errors/                       # error taxonomy (§7)
│   │   ├── app-error.ts
│   │   ├── domain-errors.ts
│   │   └── http-error-map.ts
│   │
│   ├── container/                    # DI wiring (§13)
│   │   └── container.ts
│   │
│   ├── routes/
│   │   ├── v1/                       # API versioning (§12)
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── app.ts                        # express app assembly, middleware ORDER lives here
│   └── server.ts                     # process entrypoint, http.listen, graceful shutdown
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── scripts/                          # migration/seed scripts
├── .env.example
├── docker-compose.yml                # local mongo/redis/ollama
├── Dockerfile
└── package.json
```

**Why modules AND domain/infrastructure split, instead of pure "feature folders"?**
Pure feature-folder (each module owns its own Mongoose models, its own AI calls) looks clean initially but silently violates constraint #1: a `student` module that directly imports the OpenAI SDK cannot be tested without a live API key, and grading logic duplicated across `practice` and `diagnostic` will drift. Pulling `grading/` and `ai/` out into `domain/` and `infrastructure/` is the one deviation from a naive DDD-by-folder structure, and it's deliberate: **grading correctness is the product's core IP and must have exactly one implementation.**

---

## 2. Layered Architecture (Clean Architecture, adapted)

```
┌─────────────────────────────────────────────────────────────┐
│  HTTP Layer (routes, controllers)                           │
│  - Parses request, calls service, shapes response            │
│  - Knows NOTHING about Mongoose or Ollama                    │
└───────────────────────────┬───────────────────────────────────┘
                             │ calls
┌───────────────────────────▼───────────────────────────────────┐
│  Application/Service Layer (module *.service.ts)              │
│  - Orchestrates use cases: "submit answer", "generate plan"   │
│  - Depends on INTERFACES (repository, ai-provider), not impls │
└───────────────────────────┬───────────────────────────────────┘
                             │ calls
        ┌────────────────────┼─────────────────────┐
        ▼                    ▼                      ▼
┌───────────────┐  ┌──────────────────┐   ┌────────────────────┐
│ Domain Layer   │  │ Repository       │   │ AI Provider         │
│ (grading,      │  │ interfaces       │   │ interface           │
│ curriculum)    │  │ (module-defined) │   │ (infrastructure/ai)  │
│ PURE FUNCTIONS │  └────────┬─────────┘   └──────────┬──────────┘
│ no I/O, no DI  │           │ implemented by                │ implemented by
└───────────────┘  ┌────────▼─────────┐   ┌──────────▼──────────┐
                    │ Mongoose Repo    │   │ Ollama/OpenAI/Claude │
                    │ Implementation   │   │ Provider             │
                    └──────────────────┘   └───────────────────────┘
```

**Dependency rule:** arrows point inward/downward only. Controllers depend on services; services depend on interfaces; infrastructure implements interfaces and is *injected* into services (§13). Nothing in `domain/` imports from `infrastructure/` or `express`. This is what makes "swap Ollama for Claude" a one-file change and "swap Mongo for Postgres later" a contained (if painful) migration rather than a rewrite.

**Request lifecycle (§6):**

```
Client
  │
  ▼
[helmet, cors] → [request-id + logger context] → [rate limiter] → [body parser]
  │
  ▼
[route match: /api/v1/practice/:id/submit]
  │
  ▼
[auth.middleware: verify JWT, attach req.user]
  │
  ▼
[validate.middleware: zod schema on req.body]
  │
  ▼
[controller: extracts DTO, calls service]
  │
  ▼
[service: orchestrates — loads attempt, calls domain/grading (pure), persists via repo,
           optionally calls an ai/* service (e.g. ai/hint) for an explanation]
  │
  ▼
[controller: maps service result → HTTP response shape]
  │
  ▼
[error-handler middleware — ONLY reached if something threw; see §7]
  │
  ▼
Client
```

---

## 3 & 4. Module Boundaries and Domain-Driven Organization

Bounded contexts, and the *one* thing each is allowed to own:

| Module | Owns | Must NOT own |
|---|---|---|
| `auth` | credentials, tokens, sessions | student profile data |
| `student` | profile, enrolment, preferences | grading logic, question content |
| `diagnostic` | adaptive assessment flow, ability estimation | the correctness engine itself (calls `domain/grading`) |
| `curriculum` (renamed from `lesson`) | Topic graph, Question bank, Lesson content, sequencing | AI prompt construction (calls `ai/*`) |
| `practice` | question sets, attempts, submission flow | correctness engine (calls `domain/grading`) |
| `ai/tutor`, `ai/study-plan`, `ai/hint`, `ai/ocr`, `ai/recommendation` | prompt construction (via shared `ai/prompt-builder`), conversation/response generation, provider selection | grading, persistence of academic records, deciding *what* to recommend (that's `domain/curriculum`'s job — AI only phrases it) |
| `analytics` | aggregation, reporting queries | writing academic records (read-mostly) |
| `teacher` / `parent` | dashboards, read views, permissions over student data | any grading or AI logic — these are presentation-oriented modules that compose other modules' services |
| `notification` | in-app/email notification delivery, read state | any of the above — purely reactive, subscribes to events (§21.1) |

**Cross-module communication rule:** a module may call another module's *service* (not its repository or model directly). `practice.service.ts` calling `analytics.service.recordAttempt(...)` is fine; `practice.service.ts` importing analytics' Mongoose model is not. This keeps module boundaries enforceable by code review even without a monorepo tool enforcing it, and makes a later extraction into separate services (if scale ever demands it) a matter of moving folders, not disentangling imports.

---

## 5. Clean Architecture Principles Applied

- **Entities/domain objects** (`domain/shared-kernel`) have no knowledge of Mongoose. A `Question` domain object is a plain TS type/class; `QuestionModel` (Mongoose schema) is a separate persistence concern mapped via the repository.
- **Use case isolation**: each service method is one use case ("submit practice answer") and is independently testable by mocking its two dependencies (repository interface, AI interface).
- **Framework independence at the core**: Express-specific types (`Request`, `Response`) never appear below the controller layer. This is what makes moving to Fastify, or adding a GraphQL layer later, not require touching business logic.

This is a deliberate *pragmatic* Clean Architecture, not a dogmatic one — we do not add a full separate "use case" class per action (that's Uncle Bob's strictest interpretation and is overkill here); the service class serves that role. Challenging over-engineering here matters as much as challenging under-engineering.

---

## 6. Request Lifecycle & Middleware Order — see §2 diagram

**Exact order in `app.ts` and why order matters:**

1. `helmet()` — security headers before anything else touches the request.
2. `cors()` — reject disallowed origins before spending CPU on parsing.
3. Request-ID + structured logger context (AsyncLocalStorage) — every subsequent log line, including errors, is now correlated.
4. Rate limiter (§17) — cheap, keyed by IP/user, before body parsing to reject abuse before paying the parsing cost.
5. `express.json({ limit })` — body parsing, bounded to prevent large-payload DoS.
6. Route-level `auth.middleware` — only on protected routes.
7. Route-level `validate.middleware` — schema validation, so controllers only ever see validated shapes.
8. Controller → Service → Domain/Infra.
9. `error-handler.middleware` — registered *last*, catches everything via `next(err)` or async wrapper.

Getting steps 2–4 in the wrong order is a common real-world mistake (e.g. parsing large bodies before rate limiting them) — worth stating explicitly since it's easy to get backwards.

---

## 7. Error Handling Strategy

Single error taxonomy, not ad-hoc `throw new Error(string)` scattered everywhere:

```
AppError (abstract base: statusCode, code, message, isOperational)
 ├── ValidationError        (400)
 ├── AuthenticationError    (401)
 ├── AuthorizationError     (403)
 ├── NotFoundError          (404)
 ├── ConflictError          (409)
 ├── RateLimitError         (429)
 ├── AIProviderError        (502)  ← AI failure is a gateway error, NOT a 500 that looks like our bug
 └── InternalError          (500)  — anything unexpected; isOperational=false
```

- Services/domain throw `AppError` subclasses. Controllers never `try/catch` — they're wrapped by a single `asyncHandler` utility that forwards rejections to `next()`.
- The error-handler middleware is the *only* place that maps error → HTTP response, and the only place that decides what's safe to leak to the client (message for operational errors; generic "Internal server error" otherwise).
- `isOperational: false` errors additionally trigger a high-severity log and (later) an alert — this is how a Mongo connection drop is distinguished from "student submitted a malformed answer" without special-casing every call site.
- Crucially: **AI failures must degrade, not crash the request.** If the AI provider errors while generating a hint, the practice/curriculum flow itself (which already computed correctness via `domain/grading`) must still return a successful response with a fallback message — the AI is enrichment, not a dependency of the correctness path. This is constraint #1 showing up in error handling specifically.

---

## 8. Logging Strategy

- Structured JSON logging (pino, not console.log) — required for any future log aggregation (CloudWatch/Datadog) without a rewrite.
- Correlation via request-id propagated through AsyncLocalStorage, so a single student's request across controller → service → AI call all shares one traceable ID.
- Log levels: `debug` (dev only), `info` (business events: "attempt submitted", "plan generated"), `warn` (operational error, e.g. AI provider timeout with fallback used), `error` (non-operational, needs attention).
- **Never log**: raw JWTs, passwords, full request bodies containing PII of minors (this product serves GCSE students — treat student data with the same care as a children's-data product, which has real regulatory weight, e.g. UK GDPR/Age Appropriate Design Code implications). Log redaction is a middleware concern, not left to each call site.

---

## 9 & 10. Configuration & Environment Variable Management

- All env access goes through `src/config/env.ts`, which parses `process.env` through a **zod schema once at boot** and exports a typed, frozen `env` object. Nothing outside `config/` calls `process.env` directly — this is enforced by lint rule (`no-process-env` outside `config/`), not just convention, because "we'll remember to validate it" is how a missing `JWT_SECRET` becomes a production incident instead of a boot-time crash.
- Fail-fast: if a required var is missing/malformed, the process exits immediately at startup with a clear message — never at request-time three days later.
- `.env.example` is committed; `.env` is gitignored. Config is layered: `.env` (local) → real environment variables (staging/prod, injected by the platform) — no secrets ever committed, no secrets baked into Docker images.
- Config objects are grouped by concern (`database.config.ts`, `ai.config.ts`, `auth.config.ts`) and are what gets injected via the DI container (§13), not raw `env` — this means a service depends on "AI config" as a typed interface, and swapping how config is sourced (env vars vs. a secrets manager later) touches one file.

---

## 11. Validation Strategy

- **zod** at the boundary (request body/query/params) via `validate.middleware`, schema colocated with each module (`*.validation.ts`).
- Validation happens *before* the controller — controllers receive already-validated, already-typed DTOs. No manual `if (!req.body.email)` checks anywhere in business code.
- Same zod schemas are reused to derive TypeScript types (`z.infer<typeof schema>`) — one source of truth for shape, not a hand-maintained interface plus a hand-maintained schema that drift apart.
- Domain-level invariants (e.g. "a diagnostic attempt cannot be submitted twice") are NOT validation-layer concerns — those are business rules enforced in the service/domain layer and raise `ConflictError`, not a 400. Keep the distinction: validation = "is this shape well-formed," business rules = "is this action allowed right now."

---

## 12. API Versioning

- URI versioning: `/api/v1/...`. Chosen over header-based versioning for this product because the client is a first-party Next.js app the team controls — URI versioning is simpler to reason about, cache, and debug (visible in every log line and every browser network tab), and the header-based-versioning benefit (multiple versions truly indistinguishable at the URL) doesn't matter when there's no third-party API consumer to support.
- `routes/v1/index.ts` composes all module routers. A hypothetical `v2` gets its own folder and can cherry-pick which modules actually changed — unchanged modules' v1 routers are simply re-mounted under `/v2`, not duplicated.
- Versioning is at the route-mount layer only — services/domain are version-agnostic. A breaking change to the `practice` submission contract means a new controller/route, not a new service method, unless the underlying business rule actually changed.

---

## 13. Dependency Injection Strategy

- Lightweight, explicit, constructor-based DI via a manual composition root (`container/container.ts`) — **not** a heavy framework like InversifyJS/tsyringe with decorators.
- Why not a DI framework: the team is small, the object graph is not deep, and decorator-based DI adds a build-step dependency (`emitDecoratorMetadata`) and a layer of magic that makes the actual dependency graph harder to read than just... reading a factory function. Reach for a framework only if the graph genuinely gets unwieldy — don't pre-pay that complexity now.
- Pattern: each module exports a factory (`createStudentService(deps)`), `container.ts` wires concrete implementations (Mongoose repo, chosen AI provider) into those factories once at boot, and routes receive already-constructed service instances.
- This is what makes services trivially unit-testable: `createStudentService({ repository: fakeRepo, aiProvider: fakeAI })` in tests, zero mocking-library gymnastics, zero hitting a real database.

```
container.ts (composition root)
   │
   ├── const mongooseStudentRepo = new MongooseStudentRepository()
   ├── const aiProvider = AIProviderFactory.create(config.ai.provider)  // §14
   ├── const studentService = createStudentService({ repo: mongooseStudentRepo })
   └── const aiTutorService = createAITutorService({ aiProvider })
```

---

## 14. AI Abstraction Architecture (the most important diagram in this document, given constraint #1 and #3)

```
        ┌──────────┬──────────┬──────────┬──────────┬────────────────┐
        ▼          ▼          ▼          ▼          ▼                │
   ai/tutor   ai/study-plan  ai/hint   ai/ocr   ai/recommendation     │
   (service)   (service)   (service)  (service)    (service)         │
        │          │          │          │          │                │
        └──────────┴────┬─────┴──────────┴──────────┘                │
                         ▼ all route prompt construction through      │
                  ai/prompt-builder (shared, versioned templates) ────┘
                         │
                         │ every service above depends on the SAME interface
                         ▼
                     ┌───────────────────────────────────┐
                     │      AIProvider (interface)         │
                     │  generateHint(ctx): Promise<str>    │
                     │  explainConcept(ctx): Promise<str>  │
                     │  streamTutorResponse(ctx): Stream    │
                     └───────────────┬─────────────────────┘
                                     │ implemented by (one active at a time,
                                     │  chosen by config.ai.provider)
        ┌────────────────────────────┼─────────────────────────────┐
        ▼                            ▼                             ▼
┌───────────────┐          ┌──────────────────┐          ┌──────────────────┐
│ OllamaProvider │          │  OpenAIProvider   │          │  ClaudeProvider   │
│ (Qwen, local)  │          │  (future)         │          │  (future)         │
└───────────────┘          └──────────────────┘          └──────────────────┘
```

**Why split a single `ai-tutor` module into five services behind one shared provider interface (post-review amendment):** tutoring chat, hint generation, OCR interpretation, study-plan rationale text, and teacher/parent recommendation summaries are five different prompt shapes, five different conversation lifetimes (one is stateless-per-call, one is a running chat), and — per §14 constraint #1's planning analogue — none of them should grow into a single `AITutorService` god-class handling unrelated concerns just because they all happen to call an LLM. Splitting them now, while each is still small, is cheap; unwinding a monolithic tutor service into five once it's grown is not. `ai/prompt-builder` is the one shared piece across all five — templated, versioned prompt construction — because prompt text drifting inconsistently across five hand-rolled string-concatenation call sites is a real maintenance cost, and a natural seam for the deferred `PromptTemplate` idea (§22) if/when prompts need to change without a redeploy.

- The interface is the contract; each `ai/*` service is written once and never edited when the provider changes. Adding OpenAI later means writing `openai.provider.ts` implementing the same interface and flipping `AI_PROVIDER=openai` in env — **zero** changes to any `ai/*` service, `practice`, `diagnostic`, or `curriculum`.
- **Grading is architecturally incapable of calling the AI provider** — `domain/grading` has no import path to `infrastructure/ai` at all (enforce with an eslint boundary rule, e.g. `eslint-plugin-boundaries`, not just a code-review reminder). This is the concrete implementation of constraint #1: it's not a policy, it's a compile/lint-time-checkable fact about the codebase.
- Provider implementations handle their own retries/timeouts internally and translate provider-specific errors into the single `AIProviderError` (§7) — callers never see an Ollama-specific or OpenAI-specific exception type.
- Streaming (`streamTutorResponse`) is part of the interface from day one even though Ollama-only usage might not need it, because retrofitting streaming into an interface after controllers/frontend are built against a non-streaming contract is expensive; designing it in now costs little.

---

## 15. File Upload Architecture

Relevant for: student work uploads (photographed handwritten answers), teacher-uploaded worksheets, profile images.

```
Client → multipart/form-data → [multer, memory storage, size+mimetype limit]
                                        │
                                        ▼
                          controller extracts buffer + metadata
                                        │
                                        ▼
                       StorageProvider.upload(buffer, metadata)  (interface)
                          │                              │
                          ▼                              ▼
                 LocalStorageProvider              S3StorageProvider
                 (dev only, disk)                  (staging/prod)
```

- Same abstraction pattern as AI: an interface (`storage.interface.ts`) with swappable implementations, because "where files live" is exactly the kind of infra decision that changes between local dev and production and must not leak into module code.
- Multer uses **memory storage**, not disk storage, on the app server — the app server should stay stateless/ephemeral so it can scale horizontally without local-disk assumptions; files are streamed straight to the storage provider, never persisted to the container's local filesystem even transiently in production.
- Strict allow-listed mimetypes and a size cap enforced at the multer layer *before* the buffer is fully read where possible — reject early, don't let a 500MB "photo" consume worker memory.
- Uploaded content that later feeds into AI tutoring (e.g. "explain what's wrong with my working") goes through OCR/processing as a distinct pipeline step, not bundled into the upload handler itself — keep "receive and store the file" and "interpret the file's content" as separable concerns.

---

## 16. Security Middleware Order

(Detailed order already given in §6; security-specific rationale here.)

- `helmet` first, unconditionally — sets `X-Content-Type-Options`, `X-Frame-Options`, CSP headers, etc. before any other processing, so even an error response carries safe headers.
- `cors` with an explicit origin allow-list (the Next.js frontend's known domains), never `origin: '*'` — this product handles data about minors; permissive CORS is not an acceptable default here.
- Input sanitization (`express-mongo-sanitize` equivalent) applied before validation to strip `$`/`.` operator-injection attempts from `req.body`/`req.query` — MongoDB's flexible query operators make NoSQL injection via unsanitized user input a real risk if raw request objects ever reach a Mongoose query.
- Auth middleware verifies JWT signature + expiry, checks against a revocation/blacklist for refresh-token rotation (short-lived access token ~15 min, longer-lived refresh token, rotated on use, stored hashed).
- Password hashing: bcrypt algorithm (via `bcryptjs` — pure-JS, chosen during scaffolding to avoid the native `bcrypt` package's `node-pre-gyp`/`tar` transitive vulnerability chain; revisit only if hashing throughput ever becomes a measured bottleneck) with a cost factor re-evaluated against current hardware (12+ as a starting point), never a faster/weaker hash for this kind of account data.
- Role-based authorization (student/teacher/parent/admin) is a *separate* middleware from authentication — "who are you" and "are you allowed to do this" are different questions and should be different, composable middleware, not one big `checkAuth(role)` function per route.

---

## 17. Rate Limiting

- Two tiers from day one:
  1. **IP-based**, applied globally at the edge of the middleware stack — blunt protection against scripted abuse before we even know who the user is.
  2. **User-based**, applied on specific expensive routes (AI tutor requests, diagnostic generation) — a logged-in student shouldn't be able to hammer the Ollama/LLM endpoint in a tight loop and either rack up API costs (once on a paid provider) or starve local Ollama for other concurrent students.
- Backed by Redis (`rate-limit-redis` + `express-rate-limit`), *not* in-memory counters — in-memory rate limiting silently stops working correctly the moment there's more than one app instance, which directly contradicts the "thousands of concurrent students" scaling target. This is worth calling out because in-memory rate limiting is the most common "works in dev, silently broken in prod" architecture mistake in Express apps.
- AI-specific routes get a stricter limit than general API routes, reflecting real unit cost/latency differences.
- **Fail-open on Redis unavailability (discovered during scaffolding, not originally specified):** `rate-limit-redis` loads a Lua script over the connection as soon as its store is *constructed* — if that happens before Redis is reachable, the load throws synchronously with nothing to catch it, crashing the process before serving a single request. The limiter is therefore built lazily on first use, only once the connection is confirmed up; until then, requests pass through unlimited rather than the process going down. Taking the whole app down is a worse outcome than briefly running unlimited, so this degrades deliberately rather than failing closed. Implemented in `src/middleware/rate-limit.middleware.ts`.

---

## 18. Caching Strategy

- Redis, as a shared cache — not per-instance in-memory (same stateless-server reasoning as §17).
- What's cacheable and why:
  - **Curriculum content** (Topics/Lessons, rarely change): long TTL, cache-aside pattern.
  - **Diagnostic question banks**: cached, invalidated on teacher/admin content updates via explicit cache-bust, not TTL alone.
  - **AI responses**: NOT cached by default for tutoring (personalized, low reuse value) — but a specific, deliberate exception is worth considering later for extremely common canned explanations (e.g. "explain how to simplify a fraction") keyed by concept+difficulty, which could meaningfully cut AI load at scale. Flagging this as a future optimization, not a day-one requirement.
  - **Student session/JWT-adjacent lookups** (e.g. refresh token validity): Redis, because this must be consistent across instances and fast.
- Cache invalidation ownership sits with the module that owns the data (e.g. `curriculum.service` invalidates topic/lesson cache on update) — caching is not a cross-cutting concern bolted on from outside; each module treats its own cache the way it treats its own database writes.

---

## 19. Future Scalability Strategy

Concrete, in priority order of when they'd actually be needed:

1. **Stateless app servers behind a load balancer** — already guaranteed by the choices above (Redis for cache/rate-limit/sessions, no local disk reliance, JWT instead of server-side sessions). This is the *free* scalability win and it's already baked in, not deferred.
2. **MongoDB scaling**: start with a single replica set (for availability, not scale); move to sharding only if/when a specific collection (likely `attempts` or `analytics events`) demonstrably outgrows a single primary's write capacity. Don't shard preemptively — it complicates every query for a problem that doesn't exist yet.
3. **AI inference scaling**: local Ollama is a single-node bottleneck by nature. The AI abstraction (§14) means the actual scaling answer — moving to a hosted provider (OpenAI/Claude) or a dedicated GPU inference cluster — is an infrastructure swap, not an application rewrite. This is the single biggest scalability payoff of the abstraction layer.
4. **Read/write separation for analytics**: analytics queries (teacher/parent dashboards, aggregate reporting) are read-heavy and tolerant of slight staleness — candidate for a read replica or a periodically-materialized reporting collection well before the core transactional path needs any special treatment.
5. **Background jobs**: anything not required for the immediate HTTP response (e.g. "regenerate this student's full study plan after a diagnostic," batch analytics rollups) should move to a job queue (BullMQ on the existing Redis) rather than growing the request-handler's synchronous work. This is worth designing the service layer to *allow* (return quickly, enqueue the rest) even before the queue itself is introduced.
6. **Horizontal scaling trigger points**: define these now even if unused — e.g. "add an app instance when p95 latency on `/practice/submit` exceeds Xms" — so scaling is a metric-driven decision later, not a guess.

---

## 20. Deployment Strategy

- **Containerized** (Dockerfile per service: backend, and separately the Next.js frontend), so local dev, staging, and prod run the identical artifact — eliminates "works on my machine" class of bugs.
- **Environment parity**: `docker-compose.yml` for local dev spins up Mongo, Redis, and Ollama alongside the app, so a new engineer's setup is `docker compose up`, not a bespoke local install of four different services.
- **CI pipeline** (before any deploy): lint → typecheck → unit tests → integration tests (against an ephemeral Mongo/Redis in CI) → build. A failing step blocks merge, full stop — this matters more here than in a typical CRUD app because grading correctness bugs directly affect a student's assessed grade.
- **Staging environment** mirroring prod topology (even if smaller) is non-negotiable before any release touches real student data — this product's data (minors' academic records) is not the kind of thing to test against in production.
- **Zero/rolling deploys**: since app servers are stateless (per §19), rolling deploys behind the load balancer are safe by construction — no session-affinity workaround needed.
- **Secrets**: injected by the deployment platform's secret manager, never baked into images or committed — consistent with §9/10.
- Database migrations (schema evolution for Mongoose, which is schema-*loose* but not schema-*less* in practice) run as an explicit, versioned migration step in the pipeline before the new app version receives traffic, not implicitly on app boot — implicit migrations-on-boot are a classic source of race conditions under rolling deploys with multiple instances starting concurrently.

---

## 21. Amendments from Design Review

Five gaps identified in review, now folded into the baseline architecture rather than deferred.

### 21.1 Domain Events

Cross-cutting reactions to a business event (practice attempt submitted → update mastery, update streak, log analytics, maybe notify) do not belong sequentially inlined in `practice.service.submitAnswer()`. That method should do exactly one thing — persist the attempt via the repository, having already computed correctness via `domain/grading` — and then publish an event. Everything reactive subscribes independently.

```
practice.service.submitAnswer()
   │
   ├── domain/grading.evaluate(...)         (pure, synchronous)
   ├── practiceRepository.save(attempt)      (the one required side effect)
   └── eventBus.publish(PracticeAttemptSubmitted{ studentId, topicId, correct, attemptId })
                              │
        ┌─────────────────────┼─────────────────────┬───────────────────┐
        ▼                     ▼                     ▼                   ▼
 mastery.onAttempt      streak.onAttempt      analytics.onAttempt   notification.onAttempt
 (updates MasteryRecord) (updates streak)      (writes AnalyticsEvent) (maybe queues a nudge)
```

- **Interface, not a specific broker**: `EventBus.publish(event)` / `EventBus.subscribe(eventType, handler)`. Day-one implementation is an in-process Node `EventEmitter` wrapper — zero new infrastructure, and correct for a single-instance deployment. The interface is what lets this become a durable outbox-pattern + queue-backed bus later (needed once there are multiple app instances and an in-process emitter can no longer guarantee a subscriber on another instance sees the event) without touching a single publisher or subscriber call site.
- **Failure semantics matter now, even with the simple implementation**: a handler throwing must never fail the original request (the attempt is already saved) and must never silently disappear either. In-process handlers run in a `try/catch` per-handler with logged failures; this is precisely the seam where "silently dropped" becomes "durably retried" when the event bus is swapped later — worth being honest that the in-process version has a real gap here (an event fired the instant before a crash is lost) and that gap is exactly what motivates the future durable version, not a reason to avoid events now.
- **What is NOT an event**: the grading decision itself, and anything the HTTP response depends on synchronously. Events are for reactions the caller doesn't need to wait for.

### 21.2 Repository Pattern — formalized, not implied

Corrected: `*.repository.ts` in the original folder listing was ambiguous about whether it was an interface or a Mongoose-backed implementation. It is now explicitly split:

- `modules/<module>/<module>.repository.interface.ts` — owned by the module, defines the contract the *service* depends on (e.g. `StudentRepository { findById, findByUserId, save, listByClass }`). Pure TypeScript interface, no Mongoose import.
- `infrastructure/persistence/mongoose/repositories/mongo-<module>.repository.ts` — the Mongoose-backed implementation, wired into the module's service via the DI container (§13).

```
practice.service.ts  →  depends on  →  PracticeRepository (interface, lives in modules/practice/)
                                              ▲
                                              │ implements
                              MongoPracticeRepository (infrastructure/, uses PracticeAttemptModel)
```

A service never imports a Mongoose model, a Mongoose `Document` type, or `mongoose` itself — if a service file has `import mongoose` or `import { Model }` anywhere, that's the one-line signal in code review that the boundary was crossed. This is what makes services unit-testable with an in-memory fake repository and what makes "migrate this one collection off MongoDB" a contained, single-file blast radius. Full collection-by-collection repository interfaces are defined in the Domain Model & Database Contract document (next artifact, per the agreed sequencing) — this section fixes the *pattern*, that document fixes the *contracts*.

### 21.3 Background Jobs

Anything whose value doesn't require blocking the HTTP response — weekly report generation, AI-driven study-plan regeneration, analytics rollups, chat archival, notification delivery — is designed from day one to be enqueue-and-return, even before a real queue exists.

- `JobQueue.enqueue(jobType, payload)` interface, day-one implementation can be as simple as `setImmediate`-based in-process execution for genuinely low-stakes, fast jobs; **but anything AI-driven (study plan generation, weekly reports) uses the queue interface from the first line of code**, because these are exactly the calls slow/expensive enough to matter and the ones most likely to actually need BullMQ+Redis once there's real load — retrofitting "make this call non-blocking" after it's already wired synchronously into a controller is the expensive version of this mistake.
- Concretely: `studyPlan.service.requestRegeneration(studentId)` enqueues a job and returns immediately (202-style "we're working on it," or the existing plan until the new one is ready); the job handler is where `ai/study-plan` and `domain/curriculum` actually get called. The controller/service split here matters because it's the difference between a student's request hanging on an LLM call and a request that returns in milliseconds.
- Same swap-the-implementation-not-the-caller pattern as AI providers and storage: `InProcessJobQueue` now, `BullMQJobQueue` (backed by the Redis already in the stack for caching/rate-limiting — no new infra) the moment a job is slow or important enough to need retries and observability.

### 21.4 Typed Configuration Module

Already specified in §9/§10 (`config/` as the sole `process.env` access point, zod-validated at boot, lint-enforced boundary) — confirming it stays as designed, with the addition that config is grouped exactly along the lines called out in review (`database.ts`, `jwt.ts`, `redis.ts`, `ai.ts`, `storage.ts`), each exporting a narrow typed shape, so e.g. `ai-tutor.service` receives an `AIConfig` object via DI rather than the entire application config — no module can accidentally read a config value that isn't its concern.

### 21.5 Observability

Beyond structured logging + correlation IDs (already specified in §8), production readiness requires the platform-level surfaces a load balancer/orchestrator and an on-call engineer actually need:

- `GET /health` — liveness only: "is the process running and able to respond." No dependency checks. A load balancer uses this to decide whether to keep routing traffic to an instance.
- `GET /ready` — readiness: actively checks Mongo connection, Redis connection, and (non-fatally) AI provider reachability. An instance that's up but can't reach Mongo should be pulled from rotation, not silently fail every request it receives. This is also *why* `server.ts` never awaits `connectMongo()`/`connectRedis()` before calling `listen()` — both clients retry with backoff on their own (ioredis indefinitely, by default), so blocking startup on that would hang the whole process during a dependency outage instead of coming up and reporting not-ready. Discovered during scaffolding by actually booting the server without Redis running: startup hung indefinitely until this was fixed.
- `GET /metrics` — Prometheus-format counters/histograms: request duration by route, error rate by type, AI provider latency/error rate, queue depth once jobs exist. This is what turns "students are complaining the app is slow" into "p95 on `/practice/submit` jumped at 14:02, correlated with AI provider latency" instead of a guessing exercise.
- All three are infrastructure concerns (`infrastructure/observability/`), mounted directly in `app.ts` outside the versioned API (`/health`, `/ready`, `/metrics`, not `/api/v1/health`) since they're platform contracts, not product API surface.

---

## 22. Deferred Roadmap Items (acknowledged now, not designed now)

Two ideas raised in review are good, but neither is needed for the MVP and both would add speculative complexity if built before there's a real forcing function. Recording them here so they're not forgotten, not scoping them yet:

- **`PromptTemplate`**: versioned, externally-editable prompt templates (system prompt, user template, temperature, provider, active version) so `ai/prompt-builder` reads templates from data instead of hardcoded strings — valuable once prompts need to change without a redeploy, or per-provider prompt tuning is needed. Natural home is inside `ai/prompt-builder`'s existing responsibility, not a new module. Building this before there's more than one or two hand-written prompts is premature — the shared `prompt-builder` seam identified in §14 is what makes adding it later a contained change.
- **`FeatureFlag`**: environment/school/plan-scoped toggles (`AI_CHAT`, `AI_HINTS`, `OCR`, `PARENT_DASHBOARD`, `VOICE_MODE`, etc.). Becomes valuable once there's more than one deployment target (multiple schools/plans) that need independent feature sets. Until then, environment variables (already the config mechanism per §9/§10) serve the same purpose with far less machinery. Revisit when "turn this on for one school without a deploy" becomes a real request, not before.

Both are explicitly **out of scope for backend scaffolding and every module phase through Phase 9** — introducing either without a concrete near-term need is the analysis-paralysis failure mode called out in review, applied to code instead of documents.

---

## Challenges to the brief, as requested

A few things worth pushing back on or flagging before code gets written:

1. **"Qwen via Ollama initially"** — fine for development and demoing, but Ollama's single-node throughput will not hold up under real concurrent tutoring load, and local Ollama typically produces noticeably lower-quality tutoring explanations than a frontier hosted model. The AI abstraction (§14) is designed specifically so this isn't a hard commitment — but plan to budget for a hosted provider before any real pilot with actual students, not just before "thousands of concurrent students."
2. **JWT refresh-token strategy needs an explicit revocation store decision now**, not later — pure stateless JWT with no revocation list means a compromised token (e.g. a student's device is lost) can't be invalidated until it expires. Redis-backed refresh-token rotation with revocation (as specified in §16) is the right call, but it's worth being explicit that "JWT" alone in the brief undersells this requirement.
3. **Children's data compliance** (UK GDPR, Age Appropriate Design Code, likely school-side data-processing agreements if this sells into schools) is a real constraint that touches logging (§8), file uploads (§15), and analytics far more than a typical SaaS product. Worth scoping explicitly as a requirement in the SRS phase, not discovered later — retrofitting data-handling compliance is far more expensive than designing for it now.
4. **Mongoose/MongoDB for inherently relational data**: student ↔ teacher ↔ class ↔ parent relationships, and curriculum's topic-prerequisite graph, are relational in nature. MongoDB is a fine choice overall (flexible for AI conversation logs, question content, evolving schemas), but the shared-kernel domain objects for these specific relational structures should be designed carefully with explicit referential-integrity handling in the application layer, since MongoDB won't enforce it for you. Not a reason to switch databases — a reason to be deliberate about which parts of the domain model need extra application-level discipline.
5. **"No code yet" is right for this phase, but the very next artifact should be an explicit data model / ER-style diagram for the MongoDB collections** (before "MongoDB models" phase begins per the stated build order) — architecture without at least a sketched data shape risks the module boundaries in §3/§4 looking cleaner on paper than they'll be once real documents and relationships are drawn out.

---

## Summary: what this buys the project

- A grading bug and an AI outage are structurally incapable of being the same incident (constraint #1, enforced via layering + lint boundaries).
- Swapping AI providers, storage backends, or (with more effort) the database is a contained change because of interfaces + DI, not a rewrite.
- Nothing here requires infrastructure (Kafka, sharding, a DI framework, a job queue) the project doesn't need yet — but nothing here blocks adding any of it later without a rewrite.

This document is the contract for Prompt 2 onward: backend foundation, MongoDB models, and every module built after this should map directly onto the folders, layers, and interfaces defined here.
