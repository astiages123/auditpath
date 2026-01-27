import { create } from 'zustand';

interface ReferenceDrawerState {
  isOpen: boolean;
  chunkId: string | null;
  highlightTerm: string | null;
  actions: {
    openReference: (chunkId: string, highlightTerm?: string) => void;
    closeReference: () => void;
  };
}

export const useUIStore = create<ReferenceDrawerState>((set) => ({
  isOpen: false,
  chunkId: null,
  highlightTerm: null,
  actions: {
    openReference: (chunkId, highlightTerm) =>
      set({ isOpen: true, chunkId, highlightTerm: highlightTerm || null }),
    closeReference: () =>
      set({ isOpen: false, chunkId: null, highlightTerm: null }),
  },
}));
