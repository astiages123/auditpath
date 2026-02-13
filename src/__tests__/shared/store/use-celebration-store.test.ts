import { describe, expect, it, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useCelebrationStore } from '@/shared/store/use-celebration-store';

describe('useCelebrationStore', () => {
  beforeEach(() => {
    act(() => {
      useCelebrationStore.getState().clear();
    });
  });

  describe('initial state', () => {
    it('should have empty queue and no current event', () => {
      const state = useCelebrationStore.getState();
      expect(state.queue).toEqual([]);
      expect(state.current).toBeNull();
      expect(state.isOpen).toBe(false);
    });
  });

  describe('enqueue', () => {
    it('should show event immediately when queue is empty', () => {
      const event = {
        id: 'TEST:1',
        title: 'Test Event',
        description: 'Test Description',
        variant: 'achievement' as const,
      };

      act(() => {
        useCelebrationStore.getState().enqueue(event);
      });

      const state = useCelebrationStore.getState();
      expect(state.current).toEqual(event);
      expect(state.isOpen).toBe(true);
      expect(state.queue).toEqual([]);
    });

    it('should add to queue when current event exists', () => {
      const event1 = {
        id: 'TEST:1',
        title: 'First Event',
        description: 'First Description',
        variant: 'achievement' as const,
      };

      const event2 = {
        id: 'TEST:2',
        title: 'Second Event',
        description: 'Second Description',
        variant: 'rank' as const,
      };

      act(() => {
        useCelebrationStore.getState().enqueue(event1);
        useCelebrationStore.getState().enqueue(event2);
      });

      const state = useCelebrationStore.getState();
      expect(state.current).toEqual(event1);
      expect(state.queue).toEqual([event2]);
      expect(state.isOpen).toBe(true);
    });

    it('should prevent duplicate events', () => {
      const event = {
        id: 'TEST:1',
        title: 'Test Event',
        description: 'Test Description',
        variant: 'achievement' as const,
      };

      act(() => {
        useCelebrationStore.getState().enqueue(event);
        useCelebrationStore.getState().enqueue(event);
      });

      const state = useCelebrationStore.getState();
      expect(state.queue).toEqual([]);
    });

    it('should prevent duplicate IDs in queue', () => {
      const event1 = {
        id: 'TEST:1',
        title: 'First Event',
        description: 'First Description',
        variant: 'achievement' as const,
      };

      const event2 = {
        id: 'TEST:2',
        title: 'Second Event',
        description: 'Second Description',
        variant: 'rank' as const,
      };

      const duplicate = {
        id: 'TEST:2',
        title: 'Duplicate',
        description: 'Duplicate Description',
        variant: 'course' as const,
      };

      act(() => {
        useCelebrationStore.getState().enqueue(event1);
        useCelebrationStore.getState().enqueue(event2);
        useCelebrationStore.getState().enqueue(duplicate);
      });

      const state = useCelebrationStore.getState();
      expect(state.queue).toHaveLength(1);
      expect(state.queue[0].title).toBe('Second Event');
    });

    it('should handle events with metadata', () => {
      const event = {
        id: 'TEST:1',
        title: 'Test Event',
        description: 'Test Description',
        variant: 'achievement' as const,
        metadata: { key: 'value', count: 42 },
      };

      act(() => {
        useCelebrationStore.getState().enqueue(event);
      });

      const state = useCelebrationStore.getState();
      expect(state.current?.metadata).toEqual({ key: 'value', count: 42 });
    });

    it('should handle events with callbacks', () => {
      const callback = vi.fn();
      const event = {
        id: 'TEST:1',
        title: 'Test Event',
        description: 'Test Description',
        variant: 'achievement' as const,
        onClose: callback,
      };

      act(() => {
        useCelebrationStore.getState().enqueue(event);
      });

      const state = useCelebrationStore.getState();
      expect(state.current?.onClose).toBe(callback);
    });
  });

  describe('next', () => {
    it('should show next event from queue', () => {
      const event1 = {
        id: 'TEST:1',
        title: 'First Event',
        description: 'First Description',
        variant: 'achievement' as const,
      };

      const event2 = {
        id: 'TEST:2',
        title: 'Second Event',
        description: 'Second Description',
        variant: 'rank' as const,
      };

      act(() => {
        useCelebrationStore.getState().enqueue(event1);
        useCelebrationStore.getState().enqueue(event2);
        useCelebrationStore.getState().next();
      });

      const state = useCelebrationStore.getState();
      expect(state.current).toEqual(event2);
      expect(state.queue).toEqual([]);
      expect(state.isOpen).toBe(true);
    });

    it('should close when queue is empty', () => {
      const event = {
        id: 'TEST:1',
        title: 'Test Event',
        description: 'Test Description',
        variant: 'achievement' as const,
      };

      act(() => {
        useCelebrationStore.getState().enqueue(event);
        useCelebrationStore.getState().next();
      });

      const state = useCelebrationStore.getState();
      expect(state.current).toBeNull();
      expect(state.isOpen).toBe(false);
    });

    it('should handle multiple next calls', () => {
      const events = Array.from({ length: 3 }, (_, i) => ({
        id: `TEST:${i + 1}`,
        title: `Event ${i + 1}`,
        description: `Description ${i + 1}`,
        variant: 'achievement' as const,
      }));

      act(() => {
        events.forEach((e) => useCelebrationStore.getState().enqueue(e));
      });

      expect(useCelebrationStore.getState().current?.id).toBe('TEST:1');

      act(() => {
        useCelebrationStore.getState().next();
      });
      expect(useCelebrationStore.getState().current?.id).toBe('TEST:2');

      act(() => {
        useCelebrationStore.getState().next();
      });
      expect(useCelebrationStore.getState().current?.id).toBe('TEST:3');

      act(() => {
        useCelebrationStore.getState().next();
      });
      expect(useCelebrationStore.getState().current).toBeNull();
      expect(useCelebrationStore.getState().isOpen).toBe(false);
    });
  });

  describe('close', () => {
    it('should trigger next when closing', () => {
      const event1 = {
        id: 'TEST:1',
        title: 'First Event',
        description: 'First Description',
        variant: 'achievement' as const,
      };

      const event2 = {
        id: 'TEST:2',
        title: 'Second Event',
        description: 'Second Description',
        variant: 'rank' as const,
      };

      act(() => {
        useCelebrationStore.getState().enqueue(event1);
        useCelebrationStore.getState().enqueue(event2);
        useCelebrationStore.getState().close();
      });

      const state = useCelebrationStore.getState();
      expect(state.current).toEqual(event2);
    });

    it('should close modal when no more events', () => {
      const event = {
        id: 'TEST:1',
        title: 'Test Event',
        description: 'Test Description',
        variant: 'achievement' as const,
      };

      act(() => {
        useCelebrationStore.getState().enqueue(event);
        useCelebrationStore.getState().close();
      });

      const state = useCelebrationStore.getState();
      expect(state.current).toBeNull();
      expect(state.isOpen).toBe(false);
    });
  });

  describe('clear', () => {
    it('should reset all state', () => {
      const event1 = {
        id: 'TEST:1',
        title: 'First Event',
        description: 'First Description',
        variant: 'achievement' as const,
      };

      const event2 = {
        id: 'TEST:2',
        title: 'Second Event',
        description: 'Second Description',
        variant: 'rank' as const,
      };

      act(() => {
        useCelebrationStore.getState().enqueue(event1);
        useCelebrationStore.getState().enqueue(event2);
      });

      expect(useCelebrationStore.getState().queue).toHaveLength(1);

      act(() => {
        useCelebrationStore.getState().clear();
      });

      const state = useCelebrationStore.getState();
      expect(state.queue).toEqual([]);
      expect(state.current).toBeNull();
      expect(state.isOpen).toBe(false);
    });

    it('should work on empty state', () => {
      act(() => {
        useCelebrationStore.getState().clear();
      });

      const state = useCelebrationStore.getState();
      expect(state.queue).toEqual([]);
      expect(state.current).toBeNull();
      expect(state.isOpen).toBe(false);
    });
  });

  describe('variants', () => {
    it('should handle all celebration variants', () => {
      const variants = ['course', 'rank', 'achievement', 'group'] as const;

      variants.forEach((variant, index) => {
        act(() => {
          useCelebrationStore.getState().enqueue({
            id: `TEST:${index}`,
            title: `${variant} Event`,
            description: `Test ${variant}`,
            variant,
          });
        });

        if (index === 0) {
          expect(useCelebrationStore.getState().current?.variant).toBe(variant);
        } else {
          expect(
            useCelebrationStore
              .getState()
              .queue.some((e) => e.variant === variant)
          ).toBe(true);
        }
      });
    });
  });
});
