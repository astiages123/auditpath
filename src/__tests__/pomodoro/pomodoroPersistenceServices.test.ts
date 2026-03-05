// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const localStorageMock = vi.hoisted(() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {},
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import {
  saveSessionBeacon,
  saveSessionToLocalQueue,
  type PomodoroBeaconPayload,
} from '@/features/pomodoro/services/pomodoroService';

describe('pomodoro persistence services', () => {
  const payload: PomodoroBeaconPayload = {
    id: 'session-1',
    user_id: 'user-1',
    course_id: 'course-1',
    course_name: 'Audit',
    timeline: [],
    started_at: '2026-03-06T09:00:00.000Z',
    ended_at: '2026-03-06T10:00:00.000Z',
    total_work_time: 1800,
    total_break_time: 300,
    total_pause_time: 120,
    is_completed: false,
  };

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock);
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the beacon request with keepalive and auth headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    saveSessionBeacon(
      payload,
      'https://example.supabase.co',
      'anon-key',
      'token-123'
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/pomodoro_sessions',
      expect.objectContaining({
        method: 'POST',
        keepalive: true,
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          apikey: 'anon-key',
          Authorization: 'Bearer token-123',
          Prefer: 'resolution=merge-duplicates',
        }),
        body: JSON.stringify(payload),
      })
    );
  });

  it('does not store duplicate sessions in the local queue', () => {
    saveSessionToLocalQueue(payload);
    saveSessionToLocalQueue(payload);

    expect(
      JSON.parse(localStorage.getItem('pomodoro_pending_sessions') || '[]')
    ).toEqual([payload]);
  });
});
