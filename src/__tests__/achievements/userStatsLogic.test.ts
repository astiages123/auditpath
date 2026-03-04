import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getUserStats } from '@/features/achievements/services/userStatsService';
import { type Category } from '@/features/courses/types/courseTypes';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() =>
          Promise.resolve({ data: mockCategories, error: null })
        ),
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockProgress, error: null })),
        })),
      })),
    })),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    withPrefix: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

interface MockCourse {
  id: string;
  type: string;
  total_videos: number;
  total_hours: number;
  course_slug: string;
  total_pages?: number;
}

interface MockCategory {
  id: string;
  name: string;
  total_hours: number;
  courses: MockCourse[];
}

const mockCategories: MockCategory[] = [
  {
    id: 'cat1',
    name: 'Kategori 1',
    total_hours: 10,
    courses: [
      {
        id: 'course1',
        type: 'video',
        total_videos: 10,
        total_hours: 5,
        course_slug: 'c1',
      },
      {
        id: 'course2',
        type: 'reading',
        total_videos: 5,
        total_pages: 50,
        total_hours: 5,
        course_slug: 'c2',
      },
    ],
  },
];

const mockProgress: unknown[] = [];

describe('getUserStats Rank Calculation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (mockProgress as unknown[]).length = 0; // Keeping the reference but clearing
  });

  it('should assign Sürgün rank even with 0 progress', async () => {
    const stats = await getUserStats('user123', mockCategories as Category[]);
    expect(stats?.currentRank?.name).toBe('Sürgün');
    expect(stats?.progressPercentage).toBe(0);
    expect(stats?.nextRank?.name).toBe('Yazıcı');
  });

  it('should calculate rank correctly with only reading progress', async () => {
    // Mock 1 completed reading item (2 hours duration mocked via video link)
    const newProgress = [
      {
        completed_at: new Date().toISOString(),
        video: {
          duration_minutes: 120, // 2 hours
          course_id: 'course2',
          duration: '10 sayfa',
        },
      },
    ];
    (mockProgress as unknown[]).push(...newProgress);

    const stats = await getUserStats('user123', mockCategories as Category[]);

    // total hours = 10, completed = 2 -> 20%
    expect(stats?.progressPercentage).toBe(20);
    expect(stats?.completedReadings).toBe(1);
    expect(stats?.completedPages).toBe(10);
    expect(stats?.completedVideos).toBe(0);

    // 20% should still be 'Sürgün' (milestone 2 is at 25%)
    expect(stats?.currentRank?.name).toBe('Sürgün');
    expect(stats?.nextRank?.name).toBe('Yazıcı');
    // rankProgress calculation: (20 - 0) / (25 - 0) * 100 = 80%
    expect(stats?.rankProgress).toBe(80);
  });

  it('should reach next rank with enough reading progress', async () => {
    // Mock 3 completed reading items (6 hours total)
    const newProgress = [
      {
        video: {
          duration_minutes: 120,
          course_id: 'course2',
          duration: '10 sayfa',
        },
      },
      {
        video: {
          duration_minutes: 120,
          course_id: 'course2',
          duration: '10 sayfa',
        },
      },
      {
        video: {
          duration_minutes: 120,
          course_id: 'course2',
          duration: '10 sayfa',
        },
      },
    ];
    (mockProgress as unknown[]).push(...newProgress);

    const stats = await getUserStats('user123', mockCategories as Category[]);

    // total = 10, completed = 6 -> 60%
    expect(stats?.progressPercentage).toBe(60);
    // 60% should be 'Sınır Muhafızı' (>= 50%)
    expect(stats?.currentRank?.name).toBe('Sınır Muhafızı');
  });
});
