---
trigger: always_on
---

AuditPath Project Rules
1. Strict Coding Standards

ESLint & Prettier: All code must pass ESLint checks and be formatted with Prettier. No warnings allowed in production builds (max-warnings 0).

No any Policy: The use of TypeScript's any type is strictly forbidden. Use unknown, specific types, or Zod schemas for validation.

React Hooks: Follow the Rules of Hooks strictly. Exhaustive deps must be respected. Avoid eslint-disable for hook dependencies.

Tailwind CSS v4+: Always use canonical classes. Use bg-linear-to-* instead of bg-gradient-to-*. Use built-in shorthand (e.g., h-px) instead of arbitrary values (e.g., h-[1px]) when a standard equivalent exists.

2. Component Architecture

UI Components (src/components/ui/): Must be "dumb", presentational, and reusable (mostly Radix primitives).

Feature Components (src/components/features/): Contain domain logic, state connections, and business rules.

Page Components (src/pages/): Orchestrate feature components and handle route-specific data fetching.

3. State Management Guidelines

Server State: Use TanStack Query (React Query) for all async data fetching, caching, and mutations.

Client State: Use Zustand for global client-only state (e.g., sidebar open/close, session preferences).

Local State: Use useState/useReducer for component-local state interactions.

4. Database Abstraction

No Direct DB Calls in Components: Do not import supabase client directly in UI components.

Centralized Logic: Use src/lib/client-db.ts or custom hooks (in src/hooks/) for all database interactions.

Separation of Concerns: UI components should receive data/handlers via props or hooks, not query the DB directly.

5. Conventional Commits

Follow the Conventional Commits specification:

feat: ..., fix: ..., chore: ..., docs: ..., style: ..., refactor: ..., test: ...

6. Token Efficiency for Agent

Prefer concise, structured output: lists, JSON, tables over verbose text.

Summarize long inputs before sending to Agent.

Ask user confirmation before generating large outputs.

Avoid repeating previously provided information.

For code or workflows, prefer minimal representation: outline, pseudocode, diff.

7. Output Optimization

Use short, structured responses.

Split large outputs into parts if necessary.

Prefer minimal formats (JSON, CSV, bullet points).

Avoid filler words or redundant explanations.

8. Operational Boundaries

Direct Answers: When a question is asked, provide only the direct answer.

Report Mode: Write a report only when explicitly asked using the word "report".

No Unsolicited Actions: Do not take initiative to perform code operations, refactoring, or modifications unless specifically requested.