This file explains how an agent should work effectively in this repository.

It is intentionally “ops-focused”: how to run the service, where code lives, and the exact patterns expected for new API work.

---

## Project Overview

- TypeScript + Express API service.
- Entrypoint: `src/index.ts`.
- Uses a standard Controller → Service → Repository layered pattern.
- Database: PostgreSQL (via `pg` + Drizzle ORM).
- Background pieces: Redis (BullMQ / pubsub usage) + Socket.IO websockets.

### Key design constraints

- Controllers/Services/Repositories should be written in functional style.
- Request handlers are wrapped via `globalAsyncHandler` to forward errors to the global error middleware.
- Prefer standardized responses via `SuccessResponse` (or `res.success`/`res.created` helpers).

---

## Build & Run

### Prerequisites

- Node.js >= 20 (see `package.json` engines)

### Local development

1. Install deps: `npm install`
2. Start dev server (ts-node + nodemon): `npm run dev`

Notes:

- Dev execution uses `ts-node -r tsconfig-paths/register src/index.ts` (see `nodemon.json`).
- Module alias `@/` maps to `src/` in development; in production it maps to `dist/` (see `src/register.ts`).

### Production build

- Build TS → JS: `npm run build`
- Run built server: `npm run start`

## Database & Migrations

### Runtime database connection

- App expects `DATABASE_URL` (see `src/config/db.config.ts`).
- Drizzle runtime schema lives in `src/models/*`.

### Drizzle migrations

- Drizzle kit config uses `DATABASE_URL_DRIZZLE_MIGRATE` (see `drizzle.config.ts`).
- Common commands:
    - Generate migrations: `npm run db:generate:dev` / `npm run db:generate:prod`
    - Apply migrations: `npm run db:migrate:dev` / `npm run db:migrate:prod`

---

## Tests, Lint, Formatting

- Unit tests: `npm run test`
- Watch mode: `npm run test:watch`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint` / `npm run lint:fix`
- Format (Prettier): `npm run format`

ESLint scope:

- Lints `src/**/*.{js,mjs,cjs,ts}`.
- Ignores `src/models/**` and `src/middleware/handler/**` (see `eslint.config.js`).

---

## Code Style Guidelines (MUST FOLLOW)

- `implement guideline path`: `.github/skills/implement-guideline/SKILL.md`

---

## API Implementation Workflow

- `implement architect workflow path`: `.github/skills/implement-workflow/SKILL.md`

## Commit Messages / Pull Request Guidelines

### Commit messages (recommended)

Use Conventional Commits:

- `feat(<area>): ...` for new features
- `fix(<area>): ...` for bug fixes
- `refactor(<area>): ...` for refactors
- `test(<area>): ...` for tests
- `chore: ...` for tooling/infra

### PR checklist

- Contain title
- Contain what going on
- Description your implementation
- Passes `npm run typecheck` and `npm run lint`.
- Does not add `try/catch` in controller/service/repo layers.
- Uses `SuccessResponse` and typed errors.
- Does not introduce secret/credential leaks (env values, tokens, access keys).

---
