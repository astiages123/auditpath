# Components Reorganization TODO

Goal: Keep `src/features/*` structure as-is, but standardize each `components/` directory with one-level subfolders.

## Standard Component Subfolders

Common subfolders (use only needed ones per feature):

- `views/`
- `cards/`
- `charts/`
- `modals/`
- `navigation/`
- `forms/`
- `controls/`
- `layout/`
- `content/`
- `feedback/`
- `shared/`

Rules:

- Keep `src/features/<feature>/components/index.ts` as public export surface.
- Move files only one level deeper under `components/*`.
- Update all relative imports and barrel exports.
- Run tests after each completed step.

## Steps

- [x] 1. Prepare and approve mapping for all features (`feature -> component file -> target subfolder`).
- [x] 2. Reorganize `efficiency/components`, fix imports, run tests.
- [x] 3. Reorganize `quiz/components`, fix imports, run tests.
- [x] 4. Reorganize `courses/components` and `notes/components`, fix imports, run tests.
- [x] 5. Reorganize `pomodoro/components` and `analytics/components`, fix imports, run tests.
- [x] 6. Reorganize `auth/components` and `achievements/components`, fix imports, run tests.
- [x] 7. Run final full checks (`type-check`, `lint`, `test`) and report.

## Progress Log

- Created TODO and standard folder taxonomy.
- Defined feature mappings:
  - `efficiency`: `cards`, `charts`, `modals`, `content`, `shared`.
  - `quiz`: `views`, `controls`, `modals`, `layout`, `content`, `shared`.
  - `courses`: `cards`, `views`, `modals`, `layout`, `shared`.
  - `notes`: `layout`, `navigation`, `content`, `shared`.
  - `pomodoro`: `controls`, `layout`, `modals`, `shared`.
  - `analytics`: `charts`, `layout`, `modals`, `shared`.
  - `auth`: `forms`, `layout`, `modals`, `shared`.
  - `achievements`: `cards`, `views`, `modals`.
- Step 2 complete (`efficiency`): folder move + import fixes done. `type-check` passed. `src/__tests__/efficiency` has existing assertion failures unrelated to import resolution.
- Step 3 complete (`quiz`): folder move + import fixes done. `src/__tests__/quiz` passed.
- Step 4 complete (`courses` + `notes`): folder move + import fixes done. `type-check` passed. `src/__tests__/notes` has one existing assertion mismatch in `noteService.test.ts`.
- Step 5 complete (`pomodoro` + `analytics`): folder move + import fixes done. `src/__tests__/pomodoro` passed, `type-check` passed.
- Step 6 complete (`auth` + `achievements`): folder move + import fixes done. `type-check` passed. `src/__tests__/auth` has existing assertion failures in `AuthForms.test.tsx`, `src/__tests__/achievements` passed.
- Step 7 complete (final checks): `npm run lint` passed, `npm run type-check` passed, `npm run test` executed with existing failing assertions in `efficiency`, `notes`, and `auth` suites.
