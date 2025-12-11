# GitHub Copilot Instructions

## Project Overview

This is a Node.js API service built with **Express.js** and **TypeScript**. It uses **Drizzle ORM** with **PostgreSQL** for data persistence and supports deployment to **Vercel** and **AWS Lambda**.

## Architecture & Patterns

### Layered Architecture

- **Routes** (`src/routes`): Define endpoints and middleware.
- **Validator** (`src/validator`): Define validators request.
- **DTOS** (`src/dtos`): Define interface request/response or zod type.
- **Controllers** (`src/controllers`): Handle HTTP requests, validation, and response formatting.
- **Services** (`src/services`): Contain business logic.
- **Repository** (`src/repository`): Contain database access layer.
- **Models** (`src/models`): Drizzle schema definitions.
- **Libs/Utils** (`src/libs`, `src/utils`): Shared utilities and external client wrappers.

### Routing Pattern

- Routes are defined in feature-specific files (e.g., `src/routes/auth/auth.routes.ts`).
- **Registration:** Routes are registered using a side-effect pattern.
    - Import `registerRoute` from `@/routes/register.routes`.
    - Call `registerRoute('/path', router, { ... })` at the end of the route file.
    - Import the route file in `src/routes/api.routes.ts` to trigger registration.
- **Async Handling:** Wrap routers with `globalAsyncHandler(router)` from `@/middleware/handler/handler.v2` to automatically catch async errors.

### Database (Drizzle ORM)

- **Schema:** Defined in `src/models/*.model.ts` using `pgTable`, `pgEnum`, etc.
- **Connection:** Use `db` from `@/libs/drizzleClient.lib`.
- **Migrations:** Managed via `drizzle-kit`.
- **Conventions:**
    - Use snake_case for database column names and camelCase for TypeScript property names (e.g., `createdAt: timestamp('created_at')`).
    - Export tables with `Table` suffix (e.g., `usersTable`).

### Error & Response Handling

- **Success:** Use `SuccessResponse` from `@/core/success`.
    - Example: `SuccessResponse.ok(res, data)` or `SuccessResponse.created(res, data)`.
- **Errors:** Throw custom errors from `@/core/error`.
    - Example: `throw new BadRequest('Invalid input')` or `throw new AuthenticationError('Unauthorized')`.
    - Do not send error responses manually (e.g., `res.status(400).json(...)`); let the global error handler manage it.

### Imports

- Use path aliases `@/` to reference `src/` (e.g., `import { logger } from '@/utils/logger'`).

## Developer Workflows

### Scripts

- **Development:** `npm run dev` (starts with nodemon).
- **Build:** `npm run build` (compiles TypeScript).
- **Testing:** `npm test` (runs Jest).
- **Linting:** `npm run lint`.

### Database Operations

- **Generate Migration:** `npm run db:generate:dev` (creates SQL files based on schema changes).
- **Run Migration:** `npm run db:migrate:dev` (applies SQL files to the database).
- **Docker DB:** `npm run docker:up:db:postgres` to start the local Postgres container.

### AWS Lambda

- Lambda code is built separately using `scripts/build-lambda.js`.
- **Build & Package:** `npm run lambda:generate:package`.
- **Deploy:** `npm run lambda:generate:deploy:dev`.

## Code Style & Conventions

- **Naming:** camelCase for variables/functions, PascalCase for classes/interfaces.
- **Type Safety:** Avoid `any`. Use explicit types for request bodies and service parameters.
- **Validation:** Validate input in controllers before passing to services.
- **Logging:** Use the global `logger` from `@/utils/logger` instead of `console.log`.
