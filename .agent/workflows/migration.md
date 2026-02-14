---
description: migration workflow for moving files from src/features to the new horizontal structure
---

# Migration Workflow

Apply this workflow when moving files from the old `src/features` structure to the new flattened structure.

## Steps

1.  **Create/Prepare Feature Folder**: Ensure `src/features/[feature-name]` exists and is empty of subdirectories.
2.  **Move & Rename Files**:
    - Move files from legacy structure to the flat feature folder.
    - Rename to follow the `[feature].[type].[ext]` or `[feature]-[name].[ext]` pattern.
    - Example: `efficiency-service.ts` -> `efficiency.service.ts`.
3.  **Update Import Paths**:
    - Search for all files importing the moved file.
    - Update those imports to the new relative path.
    - Update imports _within_ the moved file itself.

4.  **Verify Build**:
    // turbo
    - Run `npm run dev` or `npm run build` to ensure no compilation errors.
    - Check the console for any runtime errors.

5.  **Commit Changes**:
    - Commit the move and import updates as a single atomic change.
