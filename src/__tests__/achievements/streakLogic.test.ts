import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('Cuma aktivite, Cumartesi boş, Pazar boş, Pazartesi tekrar aktif - hem Cts hem Pzr boş olduğu için streak kırılır', () => {
    mockedGetVirtualDate.mockReturnValue(new Date('2026-02-16T12:00:00'));
    const activeDays = new Set(['2026-02-13', '2026-02-16']);
    const result = calculateStreak(activeDays, '2026-02-13');
    expect(result).toBe(1); // Sadece Pazartesi aktif kalır
  });

  it('Cumartesi aktivite, Pazar boş, Pazartesi aktif - hafta sonundan bir gün dolu olduğu için streak devam eder', () => {
    mockedGetVirtualDate.mockReturnValue(new Date('2026-02-16T12:00:00'));
    const activeDays = new Set(['2026-02-14', '2026-02-16']);
    const result = calculateStreak(activeDays, '2026-02-14');
    expect(result).toBe(2);
  });

  it('Salı, Çarşamba, Perşembe boş olsa bile streak bozulmaz', () => {
    mockedGetVirtualDate.mockReturnValue(new Date('2026-02-13T12:00:00')); // Cuma
    // Pazartesi(9) aktif, Salı(10), Çar(11), Per(12) boş, Cuma(13) aktif
    const activeDays = new Set(['2026-02-09', '2026-02-13']);
    const result = calculateStreak(activeDays, '2026-02-09');
    expect(result).toBe(2);
  });

  it('Hafta içi normal gün (Pazartesi) boşluk streak i bozar', () => {
    mockedGetVirtualDate.mockReturnValue(new Date('2026-02-13T12:00:00')); // Cuma
    // Cuma(13) aktif, Per-Sal arası izinli olsa da Pazartesi(09) boşsa seri 1'dir
    const activeDays = new Set(['2026-02-06', '2026-02-13']);
    const result = calculateStreak(activeDays, '2026-02-06');
    expect(result).toBe(1);
  });

  it('ardışık günlerde streak doğru artar', () => {
    mockedGetVirtualDate.mockReturnValue(new Date('2026-02-10T12:00:00'));
    const activeDays = new Set(['2026-02-09', '2026-02-10']);
    const result = calculateStreak(activeDays, '2026-02-09');
    expect(result).toBe(2);
  });
});

describe('streakLogic - calculateStreakMilestones', () => {
  it('boş dizi için 0 döner', () => {
    const result = calculateStreakMilestones([]);
    expect(result.maxStreak).toBe(0);
    expect(result.first7DayStreakDate).toBeNull();
  });

  it('hafta sonu ikisi birden boşsa streak kırılır', () => {
    const activeDays = [
      '2026-02-09', // Pzt
      '2026-02-13', // Cum
      '2026-02-16', // Pzt
    ];
    const result = calculateStreakMilestones(activeDays);
    expect(result.maxStreak).toBe(1); // Mon(16) tek başına 1. Mon(9)-Fri(13) arası 2 ama Cts-Pzr boş olunca kırıldı.
  });

  it('hafta sonu en az bir gün doluysa streak devam eder', () => {
    const activeDays = [
      '2026-02-13', // Cum
      '2026-02-14', // Cts
      '2026-02-16', // Pzt
    ];
    const result = calculateStreakMilestones(activeDays);
    expect(result.maxStreak).toBe(3);
  });

  it('izinli günler (Sal-Çar-Per) streak i bozmaz', () => {
    const activeDays = [
      '2026-02-09', // Pzt
      '2026-02-13', // Cum
      '2026-02-14', // Cts
    ];
    const result = calculateStreakMilestones(activeDays);
    expect(result.maxStreak).toBe(3);
  });
});
