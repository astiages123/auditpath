# AuditPath Architectural Rules

This project follows a flattened, service-oriented structure to improve maintainability and simplify dependency management.

## Tech Stack

- **Frontend**: React (with Vite)
- **Language**: TypeScript
- **Backend/Database**: Supabase
- **State Management/Data Fetching**: (Observe current patterns - likely React Query or similar)

## Architecture Principle

The core architectural requirement is **Hybrid (Simplified Feature)**.

**Asla src/features altında alt klasör (services, hooks, components) açılmayacak, her dosya düz bir listede duracak.**

## Directory Structure

We are moving away from traditional nested structures to a horizontal approach:

- `src/features/[feature-name]/`: Flat directory containing ALL files for a specific feature.
  - **NO subdirectories allowed** inside features (e.g., no `src/features/efficiency/hooks/`).
  - Files use descriptive suffixes: `[feature].service.ts`, `[feature].hook.ts`, `[feature].component.tsx`, etc.
- `src/shared/`: Cross-cutting concerns (UI kit, utils, global services).
- `src/app/`: Routing and main entry points.

## Rules

1.  **Feature Locality**: All feature-specific logic, UI, and hooks must reside in `src/features/[feature-name]`.
2.  **No Subdirectories**: Files must be flat inside the feature folder. Example: `src/features/efficiency/efficiency-charts.tsx`, NOT `src/features/efficiency/components/Charts.tsx`.
3.  **Naming Convention**: Use descriptive suffixes to distinguish file types:
    - `*.service.ts`: Business logic/API calls.
    - `*.hook.ts` or `use-*.ts`: React hooks.
    - `*.component.tsx`: Reusable internal components (optional suffix, can just use the name).
    - `*.types.ts`: Type definitions.
4.  **Shared Logic**: Only generic, cross-feature utilities and UI components go into `src/shared`.
5.  **Page Routes**: Main page components that are tied to routes can stay in `src/app/routes` or be defined as a `*.view.tsx` in a feature folder and imported into the router.
