# MathsMentor AI — frontend test harness

A thin, deliberately unstyled Vite + React + TypeScript app whose only job is
to prove the backend (`../mathsmentor-backend`) works end-to-end — login,
diagnostic, practice, teacher roster, parent view, notifications inbox. It is
**not** the product UI (no design system, no polish) — see PROGRESS.md's
Phase 1/Phase 2 roadmap for why this exists before any AI feature work.

## Setup

```bash
npm install
cp .env.example .env.local   # VITE_API_BASE_URL defaults to http://localhost:4000/api/v1
npm run dev                  # http://localhost:3000 — matches the backend's CORS_ALLOWED_ORIGINS default
```

The backend must be running separately (`../mathsmentor-backend`, `npm run dev`,
with a real `.env` — copy `.env.example`, fill in `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`
with 32+ random characters, and have MongoDB + Redis reachable at the configured
URLs — `docker compose up -d mongo redis` from that directory, or local
installs; Redis is optional in dev, rate limiting just fails open without it).

## Bootstrapping a School (one-time, admin-only)

Schools are admin-provisioned by design (AD-009 — admin accounts have no
self-registration path). The Teacher dashboard needs a School ID to create a
teacher profile against, and there's no admin UI in this harness for that
(deliberately — building one would mean routing around AD-009, not respecting
it). From `../mathsmentor-backend`:

```bash
npm run mint-admin-token   # prints a short-lived admin JWT to stdout — local dev only
curl -X POST http://localhost:4000/api/v1/teacher/schools \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"name":"Springfield High","subscriptionTier":"standard","contactEmail":"admin@springfield.example"}'
```

Same pattern to seed a published Topic/Question so Practice/Diagnostic have
something to serve — see `mathsmentor-backend/tests/integration/*.test.ts` for
the exact request shapes already used there.

## Known limitations (deliberate, for a test harness)

- **Access tokens are stored in `localStorage`**, not httpOnly cookies or
  in-memory-only — a real product UI should not do this; fine here since this
  harness only ever talks to a local dev backend.
- **No refresh-token flow** — when the 15-minute access token expires, the
  user just logs in again. The backend does set a refresh cookie on login;
  this harness never uses it.
- **`studentAnswer` is always a plain text field**, regardless of question
  type — the domain model has no separate "MCQ options" field (the answer
  key is just `{ correctOptionId }`), so option text is expected to live in
  `promptText` itself. This harness doesn't invent a richer input for that.
- A logout button click occasionally shows an aborted `/auth/logout` request
  in the browser console — cosmetic (the httpOnly refresh cookie may not get
  cleared server-side in that case), no functional impact since this harness
  never implements the refresh flow that cookie is for.
