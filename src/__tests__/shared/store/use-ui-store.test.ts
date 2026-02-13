import { describe, expect, it, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useUIStore } from '@/shared/store/use-ui-store';

describe('useUIStore', () => {
  beforeEach(() => {
    act(() => {
      useUIStore.getState().actions.closeReference();
    });
  });

  describe('initial state', () => {
    it('should have closed drawer by default', () => {
      const state = useUIStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.chunkId).toBeNull();
      expect(state.highlightTerm).toBeNull();
    });

    it('should have actions object', () => {
      const state = useUIStore.getState();
      expect(state.actions).toBeDefined();
      expect(typeof state.actions.openReference).toBe('function');
      expect(typeof state.actions.closeReference).toBe('function');
    });
  });

  describe('openReference', () => {
    it('should open drawer with chunk ID', () => {
      act(() => {
        useUIStore.getState().actions.openReference('chunk-123');
      });

      const state = useUIStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.chunkId).toBe('chunk-123');
      expect(state.highlightTerm).toBeNull();
    });

    it('should open drawer with chunk ID and highlight term', () => {
      act(() => {
        useUIStore.getState().actions.openReference('chunk-456', 'test-term');
      });

      const state = useUIStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.chunkId).toBe('chunk-456');
      expect(state.highlightTerm).toBe('test-term');
    });

    it('should handle empty highlight term', () => {
      act(() => {
        useUIStore.getState().actions.openReference('chunk-789', '');
      });

      const state = useUIStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.chunkId).toBe('chunk-789');
      expect(state.highlightTerm).toBeNull();
    });

    it('should handle switching to different chunk', () => {
      act(() => {
        useUIStore.getState().actions.openReference('chunk-1');
      });

      expect(useUIStore.getState().chunkId).toBe('chunk-1');

      act(() => {
        useUIStore.getState().actions.openReference('chunk-2', 'term');
      });

      const state = useUIStore.getState();
      expect(state.chunkId).toBe('chunk-2');
      expect(state.highlightTerm).toBe('term');
    });
  });

  describe('closeReference', () => {
    it('should close drawer and reset state', () => {
      act(() => {
        useUIStore.getState().actions.openReference('chunk-123', 'term');
      });

      expect(useUIStore.getState().isOpen).toBe(true);

      act(() => {
        useUIStore.getState().actions.closeReference();
      });

      const state = useUIStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.chunkId).toBeNull();
      expect(state.highlightTerm).toBeNull();
    });

    it('should handle closing already closed drawer', () => {
      act(() => {
        useUIStore.getState().actions.closeReference();
      });

      const state = useUIStore.getState();
      expect(state.isOpen).toBe(false);
      expect(state.chunkId).toBeNull();
      expect(state.highlightTerm).toBeNull();
    });
  });

  describe('state transitions', () => {
    it('should handle multiple open/close cycles', () => {
      // First cycle
      act(() => {
        useUIStore.getState().actions.openReference('chunk-1', 'term-1');
      });
      expect(useUIStore.getState().chunkId).toBe('chunk-1');
      expect(useUIStore.getState().highlightTerm).toBe('term-1');

      act(() => {
        useUIStore.getState().actions.closeReference();
      });
      expect(useUIStore.getState().isOpen).toBe(false);

      // Second cycle
      act(() => {
        useUIStore.getState().actions.openReference('chunk-2');
      });
      expect(useUIStore.getState().chunkId).toBe('chunk-2');
      expect(useUIStore.getState().highlightTerm).toBeNull();

      act(() => {
        useUIStore.getState().actions.closeReference();
      });
      expect(useUIStore.getState().isOpen).toBe(false);
    });
  });
});
