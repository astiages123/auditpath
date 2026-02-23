import { create, StateCreator } from 'zustand';

/**
 * Creates a generic base store to reduce boilerplate.
 * @param creator The state creator function (standard Zustand pattern)
 * @returns A Zustand store hook
 */
export const createBaseStore = <T extends object>(
  creator: StateCreator<T, [], []>
) => create<T>()(creator);
