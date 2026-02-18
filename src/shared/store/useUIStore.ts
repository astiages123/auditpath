import { create } from 'zustand';

export interface UIStore {
  isReferenceDrawerOpen: boolean;
  referenceChunkId: string | null;
  referenceHighlightTerm: string | null;

  actions: {
    openReference: (chunkId: string, highlightTerm?: string) => void;
    closeReference: () => void;
  };
}

export const useUIStore = create<UIStore>()((set) => ({
  isReferenceDrawerOpen: false,
  referenceChunkId: null,
  referenceHighlightTerm: null,

  actions: {
    openReference: (chunkId, highlightTerm) =>
      set({
        isReferenceDrawerOpen: true,
        referenceChunkId: chunkId,
        referenceHighlightTerm: highlightTerm || null,
      }),
    closeReference: () =>
      set({
        isReferenceDrawerOpen: false,
        referenceChunkId: null,
        referenceHighlightTerm: null,
      }),
  },
}));
