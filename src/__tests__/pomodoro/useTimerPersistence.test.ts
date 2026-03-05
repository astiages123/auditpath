// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockSaveSessionBeacon, mockSaveSessionToLocalQueue } = vi.hoisted(
  () => ({
    mockSaveSessionBeacon: vi.fn(),
    mockSaveSessionToLocalQueue: vi.fn(),
  })
);

vi.mock('@/features/pomodoro/services/pomodoroService', () => ({
  saveSessionBeacon: mockSaveSessionBeacon,
  saveSessionToLocalQueue: mockSaveSessionToLocalQueue,
}));

vi.mock('@/utils/env', () => ({
  env: {
    supabase: {
      url: 'https://example.supabase.co',
      anonKey: 'anon-key',
    },
  },
}));

import { useTimerPersistence } from '@/features/pomodoro/hooks/useTimerPersistence';

describe('useTimerPersistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-06T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('saves a closed session through beacon on beforeunload when access token exists', () => {
    renderHook(() =>
      useTimerPersistence({
        userId: 'user-1',
        sessionId: 'session-1',
        selectedCourse: { id: 'course-1', name: 'Audit' },
        timeline: [
          {
            type: 'work',
            start: Date.parse('2026-03-06T09:30:00.000Z'),
            end: Date.parse('2026-03-06T09:45:00.000Z'),
          },
          {
            type: 'pause',
            start: Date.parse('2026-03-06T09:45:00.000Z'),
            end: null,
          },
        ],
        startTime: Date.parse('2026-03-06T09:30:00.000Z'),
        originalStartTime: Date.parse('2026-03-06T09:25:00.000Z'),
        accessToken: 'token-123',
      })
    );

    window.dispatchEvent(new Event('beforeunload'));

    expect(mockSaveSessionBeacon).toHaveBeenCalledTimes(1);
    expect(mockSaveSessionToLocalQueue).not.toHaveBeenCalled();

    const [payload, supabaseUrl, supabaseKey, accessToken] =
      mockSaveSessionBeacon.mock.calls[0];

    expect(supabaseUrl).toBe('https://example.supabase.co');
    expect(supabaseKey).toBe('anon-key');
    expect(accessToken).toBe('token-123');
    expect(payload).toMatchObject({
      id: 'session-1',
      user_id: 'user-1',
      course_id: 'course-1',
      course_name: 'Audit',
      started_at: '2026-03-06T09:25:00.000Z',
      ended_at: '2026-03-06T10:00:00.000Z',
      total_work_time: 900,
      total_break_time: 0,
      total_pause_time: 900,
      is_completed: false,
    });
    expect(payload.timeline).toEqual([
      {
        type: 'work',
        start: Date.parse('2026-03-06T09:30:00.000Z'),
        end: Date.parse('2026-03-06T09:45:00.000Z'),
      },
      {
        type: 'pause',
        start: Date.parse('2026-03-06T09:45:00.000Z'),
        end: Date.parse('2026-03-06T10:00:00.000Z'),
      },
    ]);
  });

  it('falls back to local queue when access token is missing', () => {
    renderHook(() =>
      useTimerPersistence({
        userId: 'user-2',
        sessionId: 'session-2',
        selectedCourse: { id: 'course-2', name: 'Finance' },
        timeline: [
          {
            type: 'work',
            start: Date.parse('2026-03-06T09:55:00.000Z'),
            end: null,
          },
        ],
        startTime: Date.parse('2026-03-06T09:55:00.000Z'),
        originalStartTime: null,
        accessToken: undefined,
      })
    );

    window.dispatchEvent(new Event('beforeunload'));

    expect(mockSaveSessionToLocalQueue).toHaveBeenCalledTimes(1);
    expect(mockSaveSessionBeacon).not.toHaveBeenCalled();
    expect(mockSaveSessionToLocalQueue.mock.calls[0][0]).toMatchObject({
      id: 'session-2',
      user_id: 'user-2',
      total_work_time: 300,
      total_break_time: 0,
      total_pause_time: 0,
    });
  });

  it('does not persist when required state is incomplete', () => {
    renderHook(() =>
      useTimerPersistence({
        userId: 'user-3',
        sessionId: 'session-3',
        selectedCourse: { id: 'course-3', name: 'Law' },
        timeline: [],
        startTime: null,
        originalStartTime: null,
        accessToken: 'token',
      })
    );

    window.dispatchEvent(new Event('beforeunload'));

    expect(mockSaveSessionBeacon).not.toHaveBeenCalled();
    expect(mockSaveSessionToLocalQueue).not.toHaveBeenCalled();
  });
});
