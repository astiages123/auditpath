import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateStreak,
  calculateStreakMilestones,
} from '@/features/achievements/logic/streakLogic';

vi.mock('@/utils/dateHelpers', () => ({
  formatDateKey: (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  getVirtualDate: vi.fn((date?: Date) => {
    const d = date ? new Date(date) : new Date();
    if (d.getHours() < 4) {
      d.setDate(d.getDate() - 1);
    }
    return d;
  }),
}));

import { getVirtualDate } from '@/utils/dateHelpers';
const mockedGetVirtualDate = getVirtualDate as ReturnType<typeof vi.fn>;

describe('streakLogic - calculateStreak', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Cuma aktivite, Cumartesi boş, Pazar boş, Pazartesi tekrar aktif - streak 2 olarak devam eder', () => {
    mockedGetVirtualDate.mockReturnValue(new Date('2026-02-16T12:00:00'));
    const activeDays = new Set(['2026-02-13', '2026-02-16', '2026-02-17']);
    const result = calculateStreak(activeDays, '2026-02-13');
    expect(result).toBe(2);
  });

  it('Cumartesi aktivite, Pazar boş, Pazartesi aktif - streak 2', () => {
    mockedGetVirtualDate.mockReturnValue(new Date('2026-02-17T12:00:00'));
    const activeDays = new Set(['2026-02-14', '2026-02-16']);
    const result = calculateStreak(activeDays, '2026-02-14');
    expect(result).toBe(2);
  });

  it('hafta içi bir gün boşluk streak i bozar', () => {
    mockedGetVirtualDate.mockReturnValue(new Date('2026-02-12T12:00:00'));
    const activeDays = new Set(['2026-02-10', '2026-02-12']);
    const result = calculateStreak(activeDays, '2026-02-10');
    expect(result).toBe(1);
  });

  it('ardışık günlerde streak doğru artar', () => {
    mockedGetVirtualDate.mockReturnValue(new Date('2026-02-10T12:00:00'));
    const activeDays = new Set([
      '2026-02-05',
      '2026-02-06',
      '2026-02-07',
      '2026-02-08',
      '2026-02-09',
      '2026-02-10',
    ]);
    const result = calculateStreak(activeDays, '2026-02-05');
    expect(result).toBe(6);
  });
});

describe('streakLogic - calculateStreakMilestones', () => {
  it('boş dizi için 0 döner', () => {
    const result = calculateStreakMilestones([]);
    expect(result.maxStreak).toBe(0);
    expect(result.first7DayStreakDate).toBeNull();
  });

  it('hafta sonu dahil edilerek streak hesaplar', () => {
    const activeDays = [
      '2026-02-09',
      '2026-02-10',
      '2026-02-11',
      '2026-02-12',
      '2026-02-13',
      '2026-02-14',
      '2026-02-16',
    ];
    const result = calculateStreakMilestones(activeDays);
    expect(result.maxStreak).toBe(7);
  });

  it('hafta içi boşluk streak i böler', () => {
    const activeDays = ['2026-02-09', '2026-02-10', '2026-02-12', '2026-02-13'];
    const result = calculateStreakMilestones(activeDays);
    expect(result.maxStreak).toBe(2);
  });
});
