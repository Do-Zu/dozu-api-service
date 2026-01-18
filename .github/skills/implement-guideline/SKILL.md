---
name: implement guide line
description: Coding guidelines, naming conventions, and architectural principles for the project.
---

# Skill Instructions

## 1. Naming Conventions

### a. File, Folder, and Module Naming

*   **File Names**:
    *   Follow the pattern: `[module].[layer].ts` to ensure consistency.
    *   Module names should use `camelCase`.
    *   File names should reflect the function or object they represent.
    *   *Examples*: `user.controller.ts`, `user.service.ts`, `user.repository.ts`, `user.model.ts`, `user.utils.ts`
*   **Folder Names**:
    *   Use `kebab-case` for folder names.
    *   *Examples*: `controllers`, `middlewares`, `services`, `models`, `auth-third-party`.

### b. Variables, Functions, and Classes

*   **Variables and Functions**:
    *   Use `camelCase` for variable and function names.
    *   *Examples*: `getUser`, `userService`.
*   **Classes and Interfaces**:
    *   Use `PascalCase` for class names (e.g., `UserController`, `AuthService`).
    *   Interfaces should be prefixed with `I` or suffixed with `Interface` (e.g., `IUser`, `UserInterface`).
*   **Constants**:
    *   Constants should be in `UPPER_SNAKE_CASE`.
    *   *Examples*: `DEFAULT_LIMIT`, `MAX_LOGIN_ATTEMPTS`.

## 2. Coding Style

*   **Controller and Service Layers**:
    *   Code must be written in a **functional style**.
    *   *Example (userService.ts)*:
        ```typescript
        export const getUserById = async (id: string): Promise<User | null> => {
          // implementation...
        };
        ```
*   **OOP Style (If used)**:
    *   Must apply **IoC (Inversion of Control) Containers**. (*Note: Future implementation/update*).

## 3. Software Design Principles

### a. SOLID Principles

*   **Single Responsibility Principle (SRP)**:
    *   Each module, class, or function should have exactly one responsibility.
    *   *Example*: A `UserController` handles request/response only. Business logic goes to `UserService`, data access to `UserRepository`.
*   **Open/Closed Principle (OCP)**:
    *   Entities should be open for extension but closed for modification.
    *   *Example*: Extend functionality via inheritance or interfaces rather than modifying existing code.
*   **Liskov Substitution Principle (LSP)**:
    *   Subtypes must be substitutable for their base types.
    *   *Example*: `EmailNotification` and `SMSNotification` implementing `INotification` should be interchangeable.
*   **Interface Segregation Principle (ISP)**:
    *   Clients should not be forced to depend on interfaces they do not use. Split large interfaces into smaller, specific ones.
    *   *Example*: Split `UserOperations` into `ILogin`, `IRegister`, `IUpdateProfile`.
*   **Dependency Inversion Principle (DIP)**:
    *   High-level modules should not depend on low-level modules. Both should depend on abstractions.
    *   *Example*: Inject `IUserRepository` into `UserService` instead of instantiating `UserRepository`.

### b. DRY (Don't Repeat Yourself)

*   **Goal**: Avoid code duplication.
*   **Implementation**:
    *   **Reuse**: Encapsulate logic into reusable functions, modules, or components.
    *   **Shared Libraries**: Use shared modules for common tasks (auth, formatting, etc.).

### c. KISS (Keep It Simple, Stupid)

*   **Goal**: Simplicity is key.
*   **Implementation**:
    *   **Simple Solutions**: Choose the simplest solution that works.
    *   **Decomposition**: Break complex problems into smaller steps.
    *   **Avoid Over-engineering**: Do not add unnecessary complexity or abstractions prematurely.

### d. Separation of Concerns (SoC)

*   **Goal**: Separate distinct sections of the application.
*   **Layers**:
    *   **Presentation Layer**: UI and presentation logic (views, UI components).
    *   **Business Logic Layer**: Business rules and calculations (services, controllers).
    *   **Data Access Layer**: Database interactions (repositories, models).
*   **Implementation**:
    *   UI logic should not exist in business or data layers.
    *   Modules should communicate via defined interfaces/APIs.

## 4. Folder Structure

Ensure files are placed in the correct directories based on their role:

*   **controllers**: Handling request/response logic.
*   **routes**: Route definitions connecting to controllers.
*   **middlewares**: Request processing, error handling, auth, logging.
*   **services**: Business logic and repository orchestration.
*   **models**: Data schemas (ORM entities) or data objects.
*   **repositories**: Data access layer.
*   **utils**: Shared utility functions (logger, helpers).
*   **types**: Data types and interface definitions.
*   **config**:  configuration.
