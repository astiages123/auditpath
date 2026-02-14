import { renderHook } from '@testing-library/react';
import { useFaviconManager } from '@/features/pomodoro/hooks/use-favicon-manager';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/shared/lib/core/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.stubGlobal(
  'getComputedStyle',
  vi.fn(() => ({
    getPropertyValue: vi.fn((prop: string) => {
      const vars: Record<string, string> = {
        '--destructive': '0.6368 0.2078 25.3313',
        '--primary': '0.8554 0.1969 158.6115',
        '--muted-foreground': '82.968% 0.00009 271.152',
      };
      return vars[prop] || '';
    }),
  }))
);

describe('useFaviconManager', () => {
  let capturedImgOnLoad: (() => void) | null = null;
  let capturedImgOnError: (() => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedImgOnLoad = null;
    capturedImgOnError = null;
    document.title = 'AuditPath';

    vi.stubGlobal(
      'createElement',
      vi.fn((tag: string) => {
        if (tag === 'canvas') {
          return document.createElement('canvas');
        }
        if (tag === 'link') {
          const link = document.createElement('link');
          return link;
        }
        if (tag === 'img') {
          const img = document.createElement('img');
          Object.defineProperty(img, 'onload', {
            set: (cb: (() => void) | null) => {
              capturedImgOnLoad = cb;
            },
            get: () => capturedImgOnLoad,
          });
          Object.defineProperty(img, 'onerror', {
            set: (cb: (() => void) | null) => {
              capturedImgOnError = cb;
            },
            get: () => capturedImgOnError,
          });
          return img;
        }
        return document.createElement(tag);
      })
    );

    vi.stubGlobal(
      'querySelector',
      vi.fn((_selector: string) => null)
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create favicon link element on render', () => {
    const createElementSpy = vi.spyOn(document, 'createElement');
    renderHook(() => useFaviconManager(1500, 1500, true, 'work', true));

    expect(createElementSpy).toHaveBeenCalledWith('link');
  });

  it('should create canvas element on render', () => {
    const createElementSpy = vi.spyOn(document, 'createElement');
    renderHook(() => useFaviconManager(1500, 1500, true, 'work', true));

    expect(createElementSpy).toHaveBeenCalledWith('canvas');
  });

  it('should update document title with work mode', () => {
    renderHook(() => useFaviconManager(1500, 1500, true, 'work', true));

    expect(document.title).toContain('Odaklanıyor');
    expect(document.title).toContain('🔴');
  });

  it('should update document title with break mode', () => {
    renderHook(() => useFaviconManager(1500, 1500, true, 'break', true));

    expect(document.title).toContain('Mola');
    expect(document.title).toContain('🟢');
  });

  it('should add pause prefix when not active', () => {
    renderHook(() => useFaviconManager(1500, 1500, false, 'work', true));

    expect(document.title).toContain('⏸️');
  });

  it('should format time as MM:SS', () => {
    renderHook(() => useFaviconManager(125, 1500, true, 'work', true));

    expect(document.title).toContain('02:05');
  });

  it('should add overtime prefix when timeLeft is negative', () => {
    renderHook(() => useFaviconManager(-60, 1500, true, 'work', true));

    expect(document.title).toContain('+01:00');
  });

  it('should reset title when enabled is false', () => {
    const { rerender } = renderHook(
      ({ timeLeft, totalTime, isActive, mode, enabled }) =>
        useFaviconManager(timeLeft, totalTime, isActive, mode, enabled),
      {
        initialProps: {
          timeLeft: 1500,
          totalTime: 1500,
          isActive: true,
          mode: 'work' as const,
          enabled: true,
        },
      }
    );

    expect(document.title).toContain('Odaklanıyor');

    rerender({
      timeLeft: 1500,
      totalTime: 1500,
      isActive: true,
      mode: 'work' as const,
      enabled: false,
    });

    expect(document.title).toBe('AuditPath');
  });

  it('should cleanup and reset title on unmount', () => {
    const { unmount } = renderHook(() =>
      useFaviconManager(1500, 1500, true, 'work', true)
    );

    expect(document.title).toContain('Odaklanıyor');

    unmount();

    expect(document.title).toBe('AuditPath');
  });

  it('should trigger onload callback when image loads', () => {
    renderHook(() => useFaviconManager(1500, 1500, true, 'work', true));

    expect(capturedImgOnLoad).toBeDefined();
    if (capturedImgOnLoad) {
      capturedImgOnLoad();
    }
  });

  it('should log warning when image fails to load', async () => {
    const { logger } = await import('@/shared/lib/core/utils/logger');

    renderHook(() => useFaviconManager(1500, 1500, true, 'work', true));

    expect(capturedImgOnError).toBeDefined();
    if (capturedImgOnError) {
      capturedImgOnError();
      expect(logger.warn).toHaveBeenCalledWith(
        'Favicon image could not be loaded, drawing only progress ring.'
      );
    }
  });
});
