// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import { QuizPageContent } from '@/features/quiz/components/layout/QuizPageContent';
import { AuthContext } from '@/features/auth/hooks/useAuth';
import type { AuthContextType } from '@/features/auth/types';

const {
  mockGetCourseBySlug,
  mockGetCourseTopicsWithCounts,
  mockGetCourseProgress,
  mockGetTopicCompletionStatus,
  mockGetChunkQuotaStatus,
  mockGetFirstChunkIdForTopic,
  mockStartQuizSession,
  mockGetReviewQueue,
  mockFetchQuestionsByIds,
  mockFetchQuestionsByCourse,
  mockSubmitQuizAnswer,
  mockGenerateForChunk,
} = vi.hoisted(() => ({
  mockGetCourseBySlug: vi.fn(),
  mockGetCourseTopicsWithCounts: vi.fn(),
  mockGetCourseProgress: vi.fn(),
  mockGetTopicCompletionStatus: vi.fn(),
  mockGetChunkQuotaStatus: vi.fn(),
  mockGetFirstChunkIdForTopic: vi.fn(),
  mockStartQuizSession: vi.fn(),
  mockGetReviewQueue: vi.fn(),
  mockFetchQuestionsByIds: vi.fn(),
  mockFetchQuestionsByCourse: vi.fn(),
  mockSubmitQuizAnswer: vi.fn(),
  mockGenerateForChunk: vi.fn(),
}));

vi.mock('@/features/courses/services/courseService', () => ({
  getCourseBySlug: mockGetCourseBySlug,
}));

vi.mock('@/features/quiz/services/quizStatusService', () => ({
  getCourseTopicsWithCounts: mockGetCourseTopicsWithCounts,
  getCourseProgress: mockGetCourseProgress,
  getTopicCompletionStatus: mockGetTopicCompletionStatus,
  getChunkQuotaStatus: mockGetChunkQuotaStatus,
}));

vi.mock('@/features/quiz/services/quizChunkService', () => ({
  getFirstChunkIdForTopic: mockGetFirstChunkIdForTopic,
}));

vi.mock('@/features/quiz/services/quizHistoryService', () => ({
  startQuizSession: mockStartQuizSession,
  getReviewQueue: mockGetReviewQueue,
}));

vi.mock('@/features/quiz/services/quizReadService', () => ({
  fetchQuestionsByIds: mockFetchQuestionsByIds,
}));

vi.mock('@/features/quiz/services/quizRepository', () => ({
  fetchQuestionsByCourse: mockFetchQuestionsByCourse,
}));

vi.mock('@/features/quiz/services/quizSubmissionService', () => ({
  submitQuizAnswer: mockSubmitQuizAnswer,
}));

vi.mock('@/features/quiz/logic/quizParser', () => ({
  generateForChunk: mockGenerateForChunk,
}));

vi.mock('@/shared/services/pomodoroAdapter', () => ({
  pomodoroAdapter: {
    associateQuizWithPomodoro: vi.fn(),
  },
}));

vi.mock('@/shared/services/storageService', () => ({
  storage: {
    get: vi.fn(() => null),
    set: vi.fn(),
    remove: vi.fn(),
    cleanup: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

const authValue: AuthContextType = {
  user: {
    id: 'user-1',
    email: 'user@test.com',
  } as User,
  session: null,
  loading: false,
  error: null,
  signOut: vi.fn(),
  clearError: vi.fn(),
};

function renderQuizFlow(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/quiz/:courseSlug" element={<QuizPageContent />} />
            <Route
              path="/quiz/:courseSlug/:topicSlug"
              element={<QuizPageContent />}
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe('Quiz user flow integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetCourseBySlug.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Sapiera',
      course_slug: 'sapiera',
    });

    mockGetCourseTopicsWithCounts.mockResolvedValue([
      {
        title: 'Genel Esaslar',
        count: 12,
      },
    ]);

    mockGetCourseProgress.mockResolvedValue({
      total: 120,
      solved: 48,
      percentage: 40,
    });

    mockGetFirstChunkIdForTopic.mockResolvedValue(
      '660e8400-e29b-41d4-a716-446655440000'
    );

    mockGetChunkQuotaStatus.mockResolvedValue({
      status: 'READY',
      used: 10,
      total: 10,
      conceptCount: 1,
    });

    mockGetTopicCompletionStatus.mockResolvedValue({
      completed: false,
      antrenman: {
        solved: 8,
        total: 10,
        quota: 10,
        existing: 10,
      },
      deneme: {
        solved: 0,
        total: 5,
        quota: 5,
        existing: 0,
      },
      mistakes: {
        solved: 0,
        total: 0,
        existing: 0,
      },
      aiLogic: {
        suggested_quotas: {
          antrenman: 10,
          deneme: 5,
        },
      },
      concepts: [
        {
          baslik: 'Risk değerlendirmesi',
          seviye: 'Analiz',
        },
      ],
      difficultyIndex: 4,
    });

    mockStartQuizSession.mockResolvedValue({
      userId: 'user-1',
      courseId: '550e8400-e29b-41d4-a716-446655440000',
      sessionNumber: 3,
      isNewSession: true,
    });

    mockGetReviewQueue.mockResolvedValue([
      {
        questionId: '770e8400-e29b-41d4-a716-446655440000',
      },
    ]);

    mockFetchQuestionsByIds.mockResolvedValue([
      {
        id: '770e8400-e29b-41d4-a716-446655440000',
        question_data: {
          q: 'İlk kontrol adımı nedir?',
          exp: 'Risk odaklı planlama ile başlanır.',
          o: ['Planlama', 'Raporlama', 'İzleme', 'Test', 'Arşiv'],
          a: 0,
          type: 'multiple_choice',
        },
      },
    ]);

    mockFetchQuestionsByCourse.mockResolvedValue([]);
  });

  it('resolves course, selects topic, opens briefing and starts the quiz session', async () => {
    const user = userEvent.setup();

    renderQuizFlow('/quiz/sapiera');

    await screen.findByText('Başlamaya Hazır Mısın?');
    expect(screen.getAllByText('Sapiera').length).toBeGreaterThan(0);

    await user.click(
      await screen.findByRole('button', { name: /Genel Esaslar/i })
    );

    await screen.findByText('Kavram Matrisi');
    expect(screen.getByText('Risk değerlendirmesi')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /ANTRENMANA BAŞLA/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ANTRENMANA BAŞLA/i }));

    await waitFor(() => {
      expect(screen.getByText('İlk kontrol adımı nedir?')).toBeInTheDocument();
    });

    expect(
      screen.getByText((_, element) => element?.textContent === 'Soru 1 / 1')
    ).toBeInTheDocument();
    expect(screen.getByText('Planlama')).toBeInTheDocument();
    expect(mockStartQuizSession).toHaveBeenCalledWith(
      'user-1',
      '550e8400-e29b-41d4-a716-446655440000'
    );
    expect(mockGetReviewQueue).toHaveBeenCalled();
    expect(mockFetchQuestionsByIds).toHaveBeenCalledWith([
      '770e8400-e29b-41d4-a716-446655440000',
    ]);
  });
});
