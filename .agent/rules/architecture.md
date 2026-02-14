# Architecture & Naming Standards

This document outlines the architectural patterns and naming conventions that MUST be followed across the AuditPath codebase. These standards were established during major refactorings (e.g., the Quiz feature overhaul) to ensure maintainability, scalability, and type safety.

## 1. Feature-Based Layered Architecture

All new and refactored features must reside in `src/features/[feature-name]/` and follow a layered functional structure.

### Layer Responsibilities

| Layer          | Path          | Responsibility                                                      |
| :------------- | :------------ | :------------------------------------------------------------------ |
| **Components** | `components/` | UI components (views, cards, modals). Use PascalCase for filenames. |
| **Logic**      | `logic/`      | Core business logic, domain engines, calculations, and utilities.   |
| **Services**   | `services/`   | Data access (Supabase), API clients, and external integrations.     |
| **Types**      | `types/`      | TypeScript interfaces, types, and Zod schemas.                      |
| **Context**    | `context/`    | React Context providers and state management logic.                 |
| **Hooks**      | `hooks/`      | Feature-specific React hooks.                                       |

### Architectural Rules

- **Layered Isolation**: Logic should be separated from UI. Components should delegate complex state transitions or calculations to the `logic` layer.
- **Barrel Files**: Every subdirectory in a feature must have an `index.ts` file that exports its public API.
- **Cross-Layer Imports**:
  - Within the same layer: Use relative imports (e.g., `import { util } from './utils'`).
  - Across layers within a feature: Use absolute aliases (e.g., `import { type } from '@/features/quiz/types'`).
  - Cross-feature imports: MUST use the feature's public API (barrel files) whenever possible.

## 2. Naming Conventions

### File & Directory Naming

- **Directories**: kebab-case or camelCase (be consistent with surrounding folders).
- **React Components**: PascalCase (`QuizCard.tsx`, `AuditModal.tsx`).
- **Hooks**: camelCase with `use` prefix (`useQuizSession.ts`).
- **Logic / Utils / Services**: camelCase (`quizLogic.ts`, `supabaseClient.ts`).
- **Styles**: kebab-case (`global.css`, `component-styles.css`).

### Variable & Type Naming

- **Interfaces/Types**: PascalCase (`QuizQuestion`, `UserProgress`).
- **Zod Schemas**: PascalCase with `Schema` suffix (`QuestionSchema`).
- **Constants**: UPPER_SNAKE_CASE for global constants; camelCase for local ones.
- **Functions**: camelCase.

## 3. SRS & Mastery System (Domain Specific)

When working with the Spaced Repetition System (SRS), adhere to the following terminology:

- **Mastery**: Refers to the level of understanding of a "Chunk".
- **Shelf System**: The logic governing how chunks move through different review intervals.
- **Queue Logic**: Prioritize "due" items as defined in the `quizLogic.ts`.

## 4. General Code Standards (from AGENTS.md)

- **Strict Types**: NO `any` usage. Prefer Zod for runtime validation over `as unknown as` casting.
- **Error Handling**: Use the namespaced `logger` utility (`@/utils/logger`).
- **Supabase**: Use typed queries. Run `npm run update-types` if schema changes occur.
- **Imports**:
  - Use `@/` path aliases.
  - Order: React -> External Libs -> Internal Imports -> Type Imports.
- **ESLint**: Prefix unused variables with `_`.

## 5. Prohibited Patterns

- **No Inline Styles**: Use Tailwind CSS 4 classes.
- **No Console Logs**: Except in `scripts/` or `supabase/` folders. Use `logger` instead.
- **No Deep Nesting**: Use early returns to reduce cognitive load.
- **No Loops for DB Calls**: Use Supabase batching for multiple records.
