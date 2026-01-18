---
name: implement architect workflow
description: Comprehensive guide for coding workflow, naming conventions, architectural principles, and API implementation patterns.
---

##  API Implementation Workflow

### a. Error Handling & Response Strategy

*   **No Try-Catch Blocks**:
    *   **Do not** use `try-catch` blocks in **Controllers**, **Services**, or **Repositories**.
    *   **Reason**: All router methods are wrapped with a `globalAsyncHandler` that automatically catches errors and passes them to the global error middleware.
*   **Throwing Errors**:
    *   Use specific Error classes (extending `AppError`) to handle invalid input or logic failures.
    *   *Common Errors*: `BadRequest`, `NotFoundError`, `AuthenticationError`.
    *   *Import*: `import { ... } from '@/core/error';`
*   **Success Responses**:
    *   Exclusively use the `SuccessResponse` class to return generic success results.
    *   *Import*: `import { SuccessResponse } from '@/core/success';`

### b. Router Registration Process

When creating a new route file (e.g., `feature.routes.ts`), follow these steps sequentially:

1.  **Initialize & Apply Handler**:
    *   Create the router instance.
    *   **Immediately** apply `globalAsyncHandler`.
    ```typescript
    const router = express.Router();
    globalAsyncHandler(router);
    ```

2.  **Define Routes & Middleware**:
    *   Apply local middleware if needed: `router.use(middleware)`.
    *   Map HTTP methods to controllers:
    ```typescript
    router.get('/', handleFeatureController);
    router.post('/', handleCreateFeatureController);
    ```

3.  **Register Module**:
    *   Use `registerRoute` to expose the router to the main application app at `src/routes/api.routes.ts`.
    ```typescript
    registerRoute('/feature', router, {
      description: 'Feature API endpoints',
      version: 'v1',
      isEnabled: true,
    });
    ```

### c. Layered Implementation Guide

Follow the **Controller-Service-Repository** pattern. Refer to `/api/demo` for a live example.

#### 1. Controller Layer (`*.controller.ts`)
*   **Role**: Entry point for HTTP requests.
*   **Tasks**:
    *   Receive `Request` and `Response`.
    *   Call the appropriate **Service** function.
    *   Return a result using `SuccessResponse`.
*   **Code Example**:
    ```typescript
    export const handleDemoController = async (req: Request, res: Response) => {
      // No try-catch here
      const data = await handleServiceDemo(req.body);
      SuccessResponse.ok(res, data);
    };
    ```

#### 2. Service Layer (`*.service.ts`)
*   **Role**: Business logic and orchestrator.
*   **Tasks**:
    *   Validate inputs (Throw `BadRequest` if invalid).
    *   Call **Repository** functions to interact with data.
    *   Handle business rules (e.g., check if data exists, throw `NotFoundError`).
*   **Applies**: Functional programming style.
*   **Code Example**:
    ```typescript
    export const handleServiceDemo = async (param) => {
      if (!param) throw new BadRequest('Param is required'); // Validation

      const data = await handleRepositoryDemo(param);

      if (!data) throw new DatabaseError('Data retrieval failed');

      return data; // Return data to controller
    };
    ```

#### 3. Repository Layer (`*.repo.ts`)
*   **Role**: Direct interface with the database.
*   **Tasks**:
    *   Execute queries (Drizzle ORM, SQL, etc.).
    *   Return raw data entities or `null`/`undefined`.
*   **Code Example**:
    ```typescript
    export const handleRepositoryDemo = async (param: any) => {
      // Database interaction
      return await db.query.users.findMany(...);
    };
    ```

