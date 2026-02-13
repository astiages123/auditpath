import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import type { User, Session } from '@supabase/supabase-js';
import '@testing-library/jest-dom/vitest';

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/shared/lib/core/client-db', () => ({
  getVideoProgress: vi.fn(),
  toggleVideoProgress: vi.fn(),
  toggleVideoProgressBatch: vi.fn(),
}));

vi.mock('@/features/courses/data/courses.json', () => ({
  default: [
    {
      category: 'Test Kategori',
      slug: 'TEST',
      courses: [
        {
          id: 'test-course',
          name: 'Test Course',
          instructor: 'Test Instructor',
          totalVideos: 5,
          totalHours: 2,
          playlistUrl: 'https://youtube.com',
          videos: [
            { id: 1, title: 'Video 1', duration: '10:00', durationMinutes: 10 },
            { id: 2, title: 'Video 2', duration: '15:00', durationMinutes: 15 },
            { id: 3, title: 'Video 3', duration: '20:00', durationMinutes: 20 },
            { id: 4, title: 'Video 4', duration: '25:00', durationMinutes: 25 },
            { id: 5, title: 'Video 5', duration: '30:00', durationMinutes: 30 },
          ],
        },
        {
          id: 'empty-course',
          name: 'Empty Course',
          instructor: 'Test Instructor',
          totalVideos: 0,
          totalHours: 0,
          playlistUrl: 'https://youtube.com',
          videos: [],
        },
      ],
    },
  ],
}));

vi.mock('@/shared/lib/core/client-db', () => ({
  getVideoProgress: vi.fn(),
  toggleVideoProgress: vi.fn(),
  toggleVideoProgressBatch: vi.fn(),
}));

vi.mock('@/features/courses/data/courses.json', () => ({
  default: [
    {
      category: 'Test Kategori',
      slug: 'TEST',
      courses: [
        {
          id: 'test-course',
          name: 'Test Course',
          instructor: 'Test Instructor',
          totalVideos: 5,
          totalHours: 2,
          playlistUrl: 'https://youtube.com',
          videos: [
            { id: 1, title: 'Video 1', duration: '10:00', durationMinutes: 10 },
            { id: 2, title: 'Video 2', duration: '15:00', durationMinutes: 15 },
            { id: 3, title: 'Video 3', duration: '20:00', durationMinutes: 20 },
            { id: 4, title: 'Video 4', duration: '25:00', durationMinutes: 25 },
            { id: 5, title: 'Video 5', duration: '30:00', durationMinutes: 30 },
          ],
        },
        {
          id: 'empty-course',
          name: 'Empty Course',
          instructor: 'Test Instructor',
          totalVideos: 0,
          totalHours: 0,
          playlistUrl: 'https://youtube.com',
          videos: [],
        },
      ],
    },
  ],
}));

const mockUser: User = {
  id: 'test-user-123',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
} as User;

const mockSession: Session = {
  access_token: 'test-token',
  refresh_token: 'test-refresh',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser,
} as Session;

const mockAuthContext = {
  user: mockUser,
  session: mockSession,
  loading: false,
  signOut: vi.fn().mockResolvedValue(undefined),
};

const mockProgressContext = {
  stats: {
    completedVideos: 0,
    totalVideos: 100,
    completedHours: 0,
    totalHours: 50,
    streak: 0,
    categoryProgress: {},
    courseProgress: {},
  },
  refreshProgress: vi.fn(),
  isLoading: false,
  streak: 0,
  updateProgressOptimistically: vi.fn(),
};

import { VideoList } from '@/features/courses/components/sections/VideoList';
import { AuthContext } from '@/features/auth/hooks/use-auth';
import { ProgressContext } from '@/shared/hooks/use-progress';
import {
  getVideoProgress,
  toggleVideoProgress,
  toggleVideoProgressBatch,
} from '@/shared/lib/core/client-db';
import { toast } from 'sonner';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <ProgressContext.Provider value={mockProgressContext}>
        {ui}
      </ProgressContext.Provider>
    </AuthContext.Provider>
  );
};

describe('VideoList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getVideoProgress as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (toggleVideoProgress as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined
    );
    (toggleVideoProgressBatch as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner on initial render', async () => {
      (getVideoProgress as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithProviders(
        <VideoList
          courseId="test-course"
          dbCourseId="test-course"
          categoryColor="emerald"
        />
      );

      expect(
        screen.getByText(
          (content, element) =>
            element?.classList.contains('animate-spin') ?? false
        )
      ).toBeInTheDocument();
    });
  });

  describe('Initial Render', () => {
    it('should render video list after data loads', async () => {
      (getVideoProgress as ReturnType<typeof vi.fn>).mockResolvedValue({});

      renderWithProviders(
        <VideoList
          courseId="test-course"
          dbCourseId="test-course"
          categoryColor="emerald"
        />
      );

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons).toHaveLength(5);
      });

      expect(screen.getByText('Video 1')).toBeInTheDocument();
      expect(screen.getByText('Video 5')).toBeInTheDocument();
    });

    it('should show empty message for non-existent course', async () => {
      renderWithProviders(
        <VideoList
          courseId="non-existent"
          dbCourseId="non-existent"
          categoryColor="emerald"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Video bulunamadı')).toBeInTheDocument();
      });
    });
  });

  describe('Batch Mark (without modifier)', () => {
    it('should mark videos 1, 2, 3 when clicking video 3 without modifier', async () => {
      (getVideoProgress as ReturnType<typeof vi.fn>).mockResolvedValue({});

      renderWithProviders(
        <VideoList
          courseId="test-course"
          dbCourseId="test-course"
          categoryColor="emerald"
        />
      );

      await waitFor(() => {
        expect(screen.getAllByRole('button')).toHaveLength(5);
      });

      const video3Button = screen.getAllByRole('button')[2]; // 0-indexed
      await act(async () => {
        fireEvent.click(video3Button);
      });

      await waitFor(() => {
        expect(toggleVideoProgressBatch).toHaveBeenCalledWith(
          'test-user-123',
          'test-course',
          [1, 2, 3],
          true
        );
      });

      expect(
        mockProgressContext.updateProgressOptimistically
      ).toHaveBeenCalledWith(
        'test-course',
        3,
        0.75 // 10 + 15 + 20 minutes = 45 / 60
      );
    });
  });

  describe('Batch Unmark (without modifier)', () => {
    it('should unmark videos 2, 3, 4, 5 when unchecking video 2', async () => {
      (getVideoProgress as ReturnType<typeof vi.fn>).mockResolvedValue({
        '1': true,
        '2': true,
        '3': true,
        '4': true,
        '5': true,
      });

      renderWithProviders(
        <VideoList
          courseId="test-course"
          dbCourseId="test-course"
          categoryColor="emerald"
        />
      );

      await waitFor(() => {
        expect(screen.getAllByRole('button')).toHaveLength(5);
      });

      const video2Button = screen.getAllByRole('button')[1];
      await act(async () => {
        fireEvent.click(video2Button);
      });

      await waitFor(() => {
        expect(toggleVideoProgressBatch).toHaveBeenCalledWith(
          'test-user-123',
          'test-course',
          [2, 3, 4, 5],
          false
        );
      });
    });
  });

  describe('Single Toggle (with modifier key)', () => {
    it('should toggle only the clicked video when metaKey is pressed', async () => {
      (getVideoProgress as ReturnType<typeof vi.fn>).mockResolvedValue({});

      renderWithProviders(
        <VideoList
          courseId="test-course"
          dbCourseId="test-course"
          categoryColor="emerald"
        />
      );

      await waitFor(() => {
        expect(screen.getAllByRole('button')).toHaveLength(5);
      });

      const video2Button = screen.getAllByRole('button')[1];
      await act(async () => {
        fireEvent.click(video2Button, { metaKey: true });
      });

      await waitFor(() => {
        expect(toggleVideoProgress).toHaveBeenCalledWith(
          'test-user-123',
          'test-course',
          2,
          true
        );
      });

      expect(toggleVideoProgressBatch).not.toHaveBeenCalled();
    });

    it('should toggle only the clicked video when ctrlKey is pressed', async () => {
      (getVideoProgress as ReturnType<typeof vi.fn>).mockResolvedValue({});

      renderWithProviders(
        <VideoList
          courseId="test-course"
          dbCourseId="test-course"
          categoryColor="emerald"
        />
      );

      await waitFor(() => {
        expect(screen.getAllByRole('button')).toHaveLength(5);
      });

      const video4Button = screen.getAllByRole('button')[3];
      await act(async () => {
        fireEvent.click(video4Button, { ctrlKey: true });
      });

      await waitFor(() => {
        expect(toggleVideoProgress).toHaveBeenCalledWith(
          'test-user-123',
          'test-course',
          4,
          true
        );
      });

      expect(toggleVideoProgressBatch).not.toHaveBeenCalled();
    });
  });

  describe('No User Scenario', () => {
    it('should show error and not call API when user is not logged in', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      const noUserContext = {
        user: null,
        session: null,
        loading: false,
        signOut: vi.fn().mockResolvedValue(undefined),
      };

      render(
        <AuthContext.Provider value={noUserContext}>
          <ProgressContext.Provider value={mockProgressContext}>
            <VideoList
              courseId="test-course"
              dbCourseId="test-course"
              categoryColor="emerald"
            />
          </ProgressContext.Provider>
        </AuthContext.Provider>
      );

      await waitFor(() => {
        expect(screen.getAllByRole('button')).toHaveLength(5);
      });

      const video1Button = screen.getAllByRole('button')[0];
      await act(async () => {
        fireEvent.click(video1Button);
      });

      expect(toast.error).toHaveBeenCalledWith(
        'İlerleme durumu kaydedilmesi için giriş yapmalısınız.'
      );
      expect(toggleVideoProgress).not.toHaveBeenCalled();
      expect(toggleVideoProgressBatch).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Optimistic UI Revert', () => {
    it('should revert UI and show error when API call fails', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      (getVideoProgress as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (toggleVideoProgressBatch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );

      renderWithProviders(
        <VideoList
          courseId="test-course"
          dbCourseId="test-course"
          categoryColor="emerald"
        />
      );

      await waitFor(() => {
        expect(screen.getAllByRole('button')).toHaveLength(5);
      });

      const video3Button = screen.getAllByRole('button')[2];
      await act(async () => {
        fireEvent.click(video3Button);
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('İlerleme kaydedilemedi.');
      });

      expect(
        mockProgressContext.updateProgressOptimistically
      ).toHaveBeenCalledTimes(2);
      expect(mockProgressContext.refreshProgress).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Batch Filter - Already Completed Videos', () => {
    it('should NOT include already completed videos in batch API call', async () => {
      // Video 1 is already completed in the backend
      (getVideoProgress as ReturnType<typeof vi.fn>).mockResolvedValue({
        '1': true, // Already completed
      });

      renderWithProviders(
        <VideoList
          courseId="test-course"
          dbCourseId="test-course"
          categoryColor="emerald"
        />
      );

      await waitFor(() => {
        expect(screen.getAllByRole('button')).toHaveLength(5);
      });

      // Click video 3 to mark videos 1, 2, 3 as completed
      const video3Button = screen.getAllByRole('button')[2];
      await act(async () => {
        fireEvent.click(video3Button);
      });

      // Should be called with [2, 3] NOT [1, 2, 3]
      expect(toggleVideoProgressBatch).toHaveBeenCalledWith(
        'test-user-123',
        'test-course',
        [2, 3],
        true
      );

      // Verify that '1' was NOT included
      expect(toggleVideoProgressBatch).not.toHaveBeenCalledWith(
        'test-user-123',
        'test-course',
        expect.arrayContaining([1]),
        true
      );
    });

    it('should NOT include non-completed videos in unmark batch', async () => {
      // Videos 1, 2 are completed; 3, 4, 5 are not
      (getVideoProgress as ReturnType<typeof vi.fn>).mockResolvedValue({
        '1': true,
        '2': true,
        '3': true,
      });

      renderWithProviders(
        <VideoList
          courseId="test-course"
          dbCourseId="test-course"
          categoryColor="emerald"
        />
      );

      await waitFor(() => {
        expect(screen.getAllByRole('button')).toHaveLength(5);
      });

      // Click video 2 to unmark videos 2 and onwards
      const video2Button = screen.getAllByRole('button')[1];
      await act(async () => {
        fireEvent.click(video2Button);
      });

      // Should be called with [2, 3] - only completed videos
      expect(toggleVideoProgressBatch).toHaveBeenCalledWith(
        'test-user-123',
        'test-course',
        [2, 3],
        false
      );
    });
  });

  describe('Empty Course', () => {
    it('should show "Video bulunamadı" for course with no videos', async () => {
      renderWithProviders(
        <VideoList
          courseId="empty-course"
          dbCourseId="empty-course"
          categoryColor="emerald"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Video bulunamadı')).toBeInTheDocument();
      });
    });
  });
});
