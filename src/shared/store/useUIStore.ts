import { createBaseStore } from '@/shared/store/baseStore';

interface UIStore {
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  isProgramOpen: boolean;
  setProgramOpen: (open: boolean) => void;
  isJourneyOpen: boolean;
  setJourneyOpen: (open: boolean) => void;
}

export const useUIStore = createBaseStore<UIStore>((set) => ({
  isMobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
  toggleMobileMenu: () =>
    set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  isProgramOpen: false,
  setProgramOpen: (open) => set({ isProgramOpen: open }),
  isJourneyOpen: false,
  setJourneyOpen: (open) => set({ isJourneyOpen: open }),
}));
