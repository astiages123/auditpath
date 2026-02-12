# ESLint Error Fix Plan

## Overview

This plan addresses 65 ESLint errors preventing git commit. The errors are categorized into 4 types:

| Error Type                             | Count | Files Affected |
| -------------------------------------- | ----- | -------------- |
| `@typescript-eslint/no-unused-vars`    | 15    | 9 files        |
| `@typescript-eslint/no-explicit-any`   | 28    | 9 files        |
| `@typescript-eslint/no-namespace`      | 1     | 1 file         |
| `no-restricted-syntax` (as unknown as) | 8     | 3 files        |

---

## Category 1: Unused Variables/Imports (15 errors)

### 1.1 Remove Unused Imports

| File                                                         | Line  | Variable             | Action             |
| ------------------------------------------------------------ | ----- | -------------------- | ------------------ |
| `scripts/manual-sync.ts`                                     | 7:8   | `path`               | Remove import      |
| `src/__tests__/features/auth/services/AuthProvider.test.tsx` | 6:15  | `ReactNode`          | Remove import      |
| `src/features/achievements/lib/achievements.test.ts`         | 9:8   | `GuildType`          | Remove import      |
| `src/features/achievements/lib/achievements.test.ts`         | 10:8  | `Achievement`        | Remove import      |
| `src/features/quiz/api/repository.ts`                        | 13:3  | `isValid`            | Remove import      |
| `src/features/quiz/api/repository.ts`                        | 21:3  | `QuizQuestionSchema` | Remove import      |
| `src/features/quiz/components/ui/GenerateQuestionButton.tsx` | 17:3  | `ScrollText`         | Remove import      |
| `src/features/quiz/core/engine.ts`                           | 21:15 | `ChunkMetadata`      | Remove from import |
| `src/features/quiz/core/engine.ts`                           | 22:10 | `isValid`            | Remove from import |
| `src/features/quiz/core/factory.ts`                          | 12:15 | `ChunkMetadata`      | Remove from import |
| `src/shared/lib/core/services/pomodoro.service.ts`           | 2:15  | `Database`           | Remove import      |
| `src/shared/lib/core/services/quiz.service.ts`               | 20:15 | `Json`               | Remove import      |
| `src/shared/lib/core/services/user-stats.service.ts`         | 2:15  | `Category`           | Remove import      |
| `src/shared/services/exchange-rate-service.ts`               | 2:10  | `ExchangeRate`       | Remove import      |

### 1.2 Remove or Prefix Unused Variables

| File                                                            | Line   | Variable             | Action                    |
| --------------------------------------------------------------- | ------ | -------------------- | ------------------------- |
| `src/__tests__/features/notes/hooks/useNotesNavigation.test.ts` | 21:7   | `mockScrollTo`       | Prefix with `_` or remove |
| `src/__tests__/features/notes/hooks/useNotesNavigation.test.ts` | 22:7   | `mockScrollIntoView` | Prefix with `_` or remove |
| `src/features/achievements/lib/achievements.test.ts`            | 39:19  | `guild`              | Prefix with `_`           |
| `src/features/achievements/lib/achievements.test.ts`            | 474:19 | `key`                | Prefix with `_`           |
| `src/features/achievements/lib/achievements.test.ts`            | 487:19 | `key`                | Prefix with `_`           |
| `src/features/achievements/lib/achievements.test.ts`            | 579:19 | `guild`              | Prefix with `_`           |
| `src/__tests__/shared/services/quiz.service.test.ts`            | 365:11 | `callCount`          | Prefix with `_` or remove |

---

## Category 2: Explicit `any` Types (28 errors)

### 2.1 Test Files - Use Proper Type Assertions

**`src/__tests__/features/auth/hooks/use-auth.test.tsx`**

- Lines 63:27, 64:33: Use proper Supabase User/Session types or create mock types

**`src/__tests__/features/notes/hooks/useTableOfContents.test.ts`**

- Line 46:8: Define proper mock type

**`src/__tests__/features/quiz/api/repository.test.ts`**

- Lines 85, 105, 135, 166, 200, 227, 263, 273, 295, 306, 338: Use Database types from `@/shared/types/supabase`

**`src/__tests__/shared/services/quiz.service.test.ts`**

- Lines 344, 430, 467, 512, 569: Use proper types from the service

### 2.2 Source Files - Define Proper Types

**`src/shared/lib/core/services/pomodoro.service.ts`**

- Lines 215, 221, 239: Define proper timeline event types

**`src/shared/lib/core/services/quiz.service.ts`**

- Lines 217, 581, 582, 726: Use Json type or define specific types

**`src/shared/lib/core/services/user-stats.service.ts`**

- Lines 52, 55, 61, 64, 131, 264: Define proper record types

**`src/shared/lib/core/utils.ts`**

- Lines 21:46, 34:10: Use generics with proper constraints

**`src/shared/services/exchange-rate-service.ts`**

- Line 30:54: Define API response type

**`src/shared/types/tracking.ts`**

- Line 9:14: Define proper event payload types

---

## Category 3: Namespace Usage (1 error)

**`src/config/env.ts`** - Line 3:3

The file uses `namespace NodeJS` to extend ProcessEnv interface. Options:

1. **Add eslint-disable comment** (recommended for this case):

   ```typescript
   // Extend NodeJS namespace to support process.env in TypeScript
   declare global {
     // eslint-disable-next-line @typescript-eslint/no-namespace
     namespace NodeJS {
   ```

2. **Alternative**: Move to a separate `.d.ts` file with proper configuration

---

## Category 4: Type Assertions `as unknown as` (8 errors)

### 4.1 Test Files - Use Type-Only Imports

**`src/__tests__/features/quiz/core/engine.test.ts`**

- Lines 66:68, 86:77, 101:65, 130:61

These are mock type assertions. Solutions:

1. Create proper mock factory functions that return typed data
2. Use `vi.mocked()` with proper generics
3. Add inline eslint-disable comments with justification

### 4.2 Source Files - Use Runtime Validation

**`src/features/quiz/components/modal/hooks/useQuizManager.ts`**

- Lines 210:26, 263:28

Replace `as unknown as` with Zod validation:

```typescript
// Before
const question = result as unknown as QuizQuestion;

// After
const question = parseOrThrow(QuizQuestionSchema, result);
```

**`src/features/achievements/lib/achievements.test.ts`**

- Line 448:27: Test file - use proper mock types or add eslint-disable

---

## Implementation Order

1. **Phase 1: Unused Imports** (Quick wins)
   - Remove all unused imports
   - Prefix unused variables with `_`

2. **Phase 2: Namespace** (Single file)
   - Add eslint-disable comment to `src/config/env.ts`

3. **Phase 3: Type Assertions in Source Files**
   - Fix `useQuizManager.ts` with proper validation

4. **Phase 4: Explicit `any` Types**
   - Start with source files (higher priority)
   - Then fix test files

5. **Phase 5: Test File Type Assertions**
   - Create mock factory functions or add justified eslint-disable comments

---

## Verification

After all fixes:

```bash
npm run lint
```

All 65 errors should be resolved.
