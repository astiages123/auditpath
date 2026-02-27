import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  isProgramOpen: boolean;
  setProgramOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      isMobileMenuOpen: false,
      setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),
      toggleMobileMenu: () =>
        set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
      isProgramOpen: false,
      setProgramOpen: (open) => set({ isProgramOpen: open }),
      isSidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) =>
        set({ isSidebarCollapsed: collapsed }),
      toggleSidebar: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
    }),
    {
      name: 'auditpath-ui-storage',
      partialize: (state) => ({ isSidebarCollapsed: state.isSidebarCollapsed }),
    }
  )
);
