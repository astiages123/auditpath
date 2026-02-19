import { create } from 'zustand';

interface UIStore {
  // Global loading states
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (isLoading: boolean, message?: string) => void;

  // Sidebar state
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  // Loading
  isLoading: false,
  loadingMessage: '',
  setLoading: (isLoading, message = '') =>
    set({ isLoading, loadingMessage: message }),

  // Sidebar
  isSidebarOpen: true,
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
}));
