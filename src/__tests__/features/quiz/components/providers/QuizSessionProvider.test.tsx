import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, act, fireEvent } from '@testing-library/react';
import { useQuizSession } from '@/features/quiz/components/contexts/QuizSessionContext';
import * as Repository from '@/features/quiz/api/repository';
import { getReviewQueue } from '@/features/quiz/core/engine';
import {
  renderWithQuizProvider,
  mockRepository,
  mockStorage,
  mockUseAuth,
  mockToast,
  resetMocks,
} from '@/__tests__/utils/quiz-test-utils';
import React, { useEffect } from 'react';

// Re-mock modules to use the shared mocks
vi.mock('@/features/auth', async () => {
  const utils = await import('../../../../utils/quiz-mocks');
  return { useAuth: utils.mockUseAuth };
});

vi.mock('@/features/quiz/api/repository', async () => {
  const utils = await import('@/__tests__/utils/quiz-mocks');
  return utils.mockRepository;
});

vi.mock('@/features/quiz/core/engine', () => ({
  getReviewQueue: vi.fn(),
}));

vi.mock('@/shared/lib/core/services/storage.service', async () => {
  const utils = await import('@/__tests__/utils/quiz-mocks');
  return { storage: utils.mockStorage };
});

vi.mock('sonner', async () => {
  const utils = await import('@/__tests__/utils/quiz-mocks');
  return { toast: utils.mockToast };
});

vi.mock('@/shared/lib/core/utils/logger', async () => {
  const utils = await import('@/__tests__/utils/quiz-mocks');
  return { logger: utils.mockLogger };
});

const TestComponent = () => {
  const {
    state,
    initializeSession,
    recordResponse,
    getNextReviewItem,
    markReviewComplete,
    advanceBatch,
    injectScaffolding,
  } = useQuizSession();

  return (
    <div>
      <div data-testid="is-initialized">{state.isInitialized.toString()}</div>
      <div data-testid="is-loading">{state.isLoading.toString()}</div>
      <div data-testid="error">{state.error || 'no-error'}</div>
      <div data-testid="current-review-index">{state.currentReviewIndex}</div>
      <div data-testid="current-batch-index">{state.currentBatchIndex}</div>
      <div data-testid="total-batches">{state.totalBatches}</div>
      <div data-testid="review-queue-length">{state.reviewQueue.length}</div>
      <div data-testid="batches-length">{state.batches.length}</div>
      <button
        data-testid="init-session"
        onClick={() => initializeSession('course-123')}
      >
        Init Session
      </button>
      <button
        data-testid="record-response"
        onClick={() => recordResponse('q1', 'chunk-1', 'correct', 0, 5000)}
      >
        Record Response
      </button>
      <button data-testid="get-next" onClick={() => getNextReviewItem()}>
        Get Next
      </button>
      <button data-testid="mark-complete" onClick={() => markReviewComplete()}>
        Mark Complete
      </button>
      <button data-testid="advance-batch" onClick={() => advanceBatch()}>
        Advance Batch
      </button>
      <button
        data-testid="inject-scaffolding"
        onClick={() => injectScaffolding('q-new', 'chunk-new')}
      >
        Inject Scaffolding
      </button>
    </div>
  );
};

const TestGetNext = ({ onResult }: { onResult: (item: unknown) => void }) => {
  const { getNextReviewItem } = useQuizSession();

  useEffect(() => {
    const item = getNextReviewItem();
    onResult(item);
  }, [getNextReviewItem, onResult]);

  return <div data-testid="get-next-called">called</div>;
};

describe('QuizSessionProvider', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      renderWithQuizProvider(<TestComponent />);

      expect(screen.getByTestId('is-initialized')).toHaveTextContent('false');
      expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('no-error');
      expect(screen.getByTestId('current-review-index')).toHaveTextContent('0');
    });
  });

  describe('initializeSession', () => {
    it('should set error when user is not available', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockUseAuth.mockReturnValue({ user: null } as any);

      renderWithQuizProvider(<TestComponent />);

      fireEvent.click(screen.getByTestId('init-session'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).not.toHaveTextContent('no-error');
      });
    });

    it('should fetch session info, quota, stats and create batches correctly', async () => {
      mockRepository.getSessionInfo.mockResolvedValue({
        currentSession: 1,
        totalSessions: 1,
        courseId: 'course-123',
      });

      mockRepository.getQuotaInfo.mockResolvedValue({
        dailyQuota: 10,
        used: 0,
        pendingReviewCount: 0,
        isMaintenanceMode: false,
        reviewQuota: 10,
      });

      mockRepository.getCourseStats.mockResolvedValue({
        totalQuestionsSolved: 100,
        averageMastery: 75,
      });

      mockRepository.getContentVersion.mockResolvedValue('2024-01-01');

      vi.mocked(getReviewQueue).mockResolvedValue([
        {
          questionId: 'q1',
          status: 'active',
          chunkId: 'chunk-1',
          courseId: 'course-123',
          priority: 1,
        },
        {
          questionId: 'q2',
          status: 'active',
          chunkId: 'chunk-1',
          courseId: 'course-123',
          priority: 2,
        },
        {
          questionId: 'q3',
          status: 'pending',
          chunkId: 'chunk-1',
          courseId: 'course-123',
          priority: 3,
        },
      ]);

      renderWithQuizProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('init-session').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-initialized')).toHaveTextContent('true');
      });

      expect(Repository.getSessionInfo).toHaveBeenCalledWith(
        'user-123',
        'course-123'
      );
      expect(Repository.getQuotaInfo).toHaveBeenCalled();
      expect(Repository.getCourseStats).toHaveBeenCalled();
      expect(Repository.getContentVersion).toHaveBeenCalled();
      expect(getReviewQueue).toHaveBeenCalled();

      expect(screen.getByTestId('review-queue-length')).toHaveTextContent('3');
      expect(screen.getByTestId('batches-length')).toHaveTextContent('1');
      expect(screen.getByTestId('total-batches')).toHaveTextContent('1');
    });

    it('should create multiple batches when queue has more than 10 items', async () => {
      mockRepository.getSessionInfo.mockResolvedValue({
        currentSession: 1,
        totalSessions: 1,
        courseId: 'course-123',
      });

      mockRepository.getQuotaInfo.mockResolvedValue({
        dailyQuota: 30,
        used: 0,
        pendingReviewCount: 0,
        isMaintenanceMode: false,
        reviewQuota: 30,
      });

      const queue = Array.from({ length: 25 }, (_, i) => ({
        questionId: `q${i + 1}`,
        status: 'active',
        chunkId: 'chunk-1',
        courseId: 'course-123',
        priority: i + 1,
      }));

      vi.mocked(getReviewQueue).mockResolvedValue(queue);

      renderWithQuizProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('init-session').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('batches-length')).toHaveTextContent('3');
      });

      expect(screen.getByTestId('total-batches')).toHaveTextContent('3');
    });

    it('should restore session from storage when sessionId matches', async () => {
      mockRepository.getSessionInfo.mockResolvedValue({
        currentSession: 1,
        totalSessions: 1,
        courseId: 'course-123',
      });

      mockRepository.getQuotaInfo.mockResolvedValue({
        dailyQuota: 10,
        used: 0,
        pendingReviewCount: 0,
        isMaintenanceMode: false,
        reviewQuota: 10,
      });

      const savedQueue = [
        {
          questionId: 'q1',
          status: 'active',
          chunkId: 'chunk-1',
          courseId: 'course-123',
          priority: 1,
        },
      ];

      mockStorage.get.mockImplementation((key: string) => {
        if (key.includes('version')) {
          return '2024-01-01';
        }
        if (key.includes('queue')) {
          return savedQueue;
        }
        if (key.includes('user-123_course-123')) {
          return { sessionId: 1, currentReviewIndex: 5 };
        }
        return null;
      });

      renderWithQuizProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('init-session').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-initialized')).toHaveTextContent('true');
      });

      expect(screen.getByTestId('current-review-index')).toHaveTextContent('5');
    });

    it('should clear storage when sessionId does not match', async () => {
      mockRepository.getSessionInfo.mockResolvedValue({
        currentSession: 2,
        totalSessions: 2,
        courseId: 'course-123',
      });

      mockRepository.getQuotaInfo.mockResolvedValue({
        dailyQuota: 10,
        used: 0,
        pendingReviewCount: 0,
        isMaintenanceMode: false,
        reviewQuota: 10,
      });

      vi.mocked(getReviewQueue).mockResolvedValue([
        {
          questionId: 'q1',
          status: 'active',
          chunkId: 'chunk-1',
          courseId: 'course-123',
          priority: 1,
        },
      ]);

      mockStorage.get.mockImplementation((key: string) => {
        if (key.includes('version')) {
          return '2024-01-01';
        }
        if (key.includes('queue')) {
          return [];
        }
        if (key.includes('user-123_course-123')) {
          return { sessionId: 1, currentReviewIndex: 0 };
        }
        return null;
      });

      renderWithQuizProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('init-session').click();
      });

      await waitFor(() => {
        expect(mockStorage.remove).toHaveBeenCalled();
      });
    });

    it('should show version warning when content version changes', async () => {
      mockRepository.getSessionInfo.mockResolvedValue({
        currentSession: 1,
        totalSessions: 1,
        courseId: 'course-123',
      });

      mockRepository.getQuotaInfo.mockResolvedValue({
        dailyQuota: 10,
        used: 0,
        pendingReviewCount: 0,
        isMaintenanceMode: false,
        reviewQuota: 10,
      });

      mockRepository.getContentVersion.mockResolvedValue('2024-02-01');

      mockStorage.get.mockImplementation((key: string) => {
        if (key.includes('version')) {
          return '2024-01-01';
        }
        return null;
      });

      renderWithQuizProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('init-session').click();
      });

      await waitFor(() => {
        expect(mockToast.warning).toHaveBeenCalled();
      });
    });

    it('should handle API errors gracefully', async () => {
      mockRepository.getSessionInfo.mockRejectedValue(
        new Error('Network error')
      );

      renderWithQuizProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('init-session').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).not.toHaveTextContent('no-error');
      });
    });
  });

  describe('recordResponse', () => {
    it('should not record when user or sessionInfo is missing', async () => {
      renderWithQuizProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('record-response').click();
      });

      expect(Repository.recordQuizProgress).not.toHaveBeenCalled();
    });

    it('should record response when session is initialized', async () => {
      // Initialize mocks for session
      mockRepository.getSessionInfo.mockResolvedValue({
        currentSession: 1,
        totalSessions: 1,
        courseId: 'course-123',
      });
      mockRepository.getQuotaInfo.mockResolvedValue({
        dailyQuota: 10,
        reviewQuota: 10,
      });
      mockRepository.getContentVersion.mockResolvedValue('2024-01-01');
      vi.mocked(getReviewQueue).mockResolvedValue([
        {
          questionId: 'q1',
          status: 'active',
          chunkId: 'chunk-1',
          courseId: 'course-123',
          priority: 1,
        },
      ]);

      renderWithQuizProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('init-session').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-initialized')).toHaveTextContent('true');
      });

      await act(async () => {
        screen.getByTestId('record-response').click();
      });

      expect(Repository.recordQuizProgress).toHaveBeenCalled();
    });
  });

  describe('getNextReviewItem', () => {
    it('should return null when queue is empty', async () => {
      mockRepository.getSessionInfo.mockResolvedValue({
        currentSession: 1,
        totalSessions: 1,
        courseId: 'course-123',
      });
      mockRepository.getQuotaInfo.mockResolvedValue({
        dailyQuota: 10,
        reviewQuota: 10,
      });
      vi.mocked(getReviewQueue).mockResolvedValue([]);

      renderWithQuizProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('init-session').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('review-queue-length')).toHaveTextContent(
          '0'
        );
      });

      let result: unknown = null;
      const callback = (item: unknown) => {
        result = item;
      };

      // We need to render the hook within the context, which TestComponent provides via TestGetNext
      renderWithQuizProvider(<TestGetNext onResult={callback} />);

      await waitFor(() => {
        expect(screen.getByTestId('get-next-called')).toBeInTheDocument();
      });

      expect(result).toBeNull();
    });

    it('should return next item when queue has items', async () => {
      mockRepository.getSessionInfo.mockResolvedValue({
        currentSession: 1,
        totalSessions: 1,
        courseId: 'course-123',
      });
      mockRepository.getQuotaInfo.mockResolvedValue({
        dailyQuota: 10,
        reviewQuota: 10,
      });

      vi.mocked(getReviewQueue).mockResolvedValue([
        {
          questionId: 'q1',
          status: 'active',
          chunkId: 'chunk-1',
          courseId: 'course-123',
          priority: 1,
        },
      ]);

      // Note: TestGetNext must be rendered *inside* the Provider.
      // But renderWithQuizProvider creates a new provider.
      // So we need to put the initialization logic inside the same provider or simulate state.
      // Easier is to mock getReviewQueue and ensure the provider initializes properly.

      // Actually, cleaner is to use a component that initializes AND tries to get next.

      const CombinedTest = () => {
        const { initializeSession, getNextReviewItem, state } =
          useQuizSession();

        useEffect(() => {
          initializeSession('course-123');
        }, [initializeSession]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [item, setItem] = React.useState<any>(null);

        useEffect(() => {
          if (state.isInitialized) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setItem(getNextReviewItem());
          }
        }, [state.isInitialized, getNextReviewItem]);

        return (
          <div>
            <div data-testid="is-initialized">
              {state.isInitialized.toString()}
            </div>
            <div data-testid="next-item-id">{item?.questionId}</div>
          </div>
        );
      };

      renderWithQuizProvider(<CombinedTest />);

      await waitFor(() => {
        expect(screen.getByTestId('is-initialized')).toHaveTextContent('true');
      });

      await waitFor(() => {
        expect(screen.getByTestId('next-item-id')).toHaveTextContent('q1');
      });
    });
  });

  describe('markReviewComplete', () => {
    it('should increment currentReviewIndex and update storage', async () => {
      mockRepository.getSessionInfo.mockResolvedValue({
        currentSession: 1,
        totalSessions: 1,
        courseId: 'course-123',
      });
      mockRepository.getQuotaInfo.mockResolvedValue({
        dailyQuota: 10,
        reviewQuota: 10,
      });

      vi.mocked(getReviewQueue).mockResolvedValue([
        {
          questionId: 'q1',
          status: 'active',
          chunkId: 'chunk-1',
          courseId: 'course-123',
          priority: 1,
        },
        {
          questionId: 'q2',
          status: 'active',
          chunkId: 'chunk-1',
          courseId: 'course-123',
          priority: 2,
        },
      ]);

      renderWithQuizProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('init-session').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-review-index')).toHaveTextContent(
          '0'
        );
      });

      await act(async () => {
        screen.getByTestId('mark-complete').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-review-index')).toHaveTextContent(
          '1'
        );
      });

      expect(mockStorage.set).toHaveBeenCalled();
    });

    it('should clear storage when session is complete', async () => {
      mockRepository.getSessionInfo.mockResolvedValue({
        currentSession: 1,
        totalSessions: 1,
        courseId: 'course-123',
      });
      mockRepository.getQuotaInfo.mockResolvedValue({
        dailyQuota: 10,
        reviewQuota: 10,
      });

      vi.mocked(getReviewQueue).mockResolvedValue([
        {
          questionId: 'q1',
          status: 'active',
          chunkId: 'chunk-1',
          courseId: 'course-123',
          priority: 1,
        },
      ]);

      renderWithQuizProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('init-session').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-review-index')).toHaveTextContent(
          '0'
        );
      });

      await act(async () => {
        screen.getByTestId('mark-complete').click();
      });

      await waitFor(() => {
        expect(mockStorage.remove).toHaveBeenCalled();
      });
    });
  });

  describe('advanceBatch', () => {
    it('should increment currentBatchIndex', async () => {
      mockRepository.getSessionInfo.mockResolvedValue({
        currentSession: 1,
        totalSessions: 1,
        courseId: 'course-123',
      });
      mockRepository.getQuotaInfo.mockResolvedValue({
        dailyQuota: 20,
        reviewQuota: 20,
      });

      // Create enough items for 2 batches (batch size is 10)
      const queue = Array.from({ length: 15 }, (_, i) => ({
        questionId: `q${i + 1}`,
        status: 'active',
        chunkId: 'chunk-1',
        courseId: 'course-123',
        priority: i + 1,
      }));
      vi.mocked(getReviewQueue).mockResolvedValue(queue);

      renderWithQuizProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('init-session').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-batch-index')).toHaveTextContent(
          '0'
        );
      });

      await act(async () => {
        screen.getByTestId('advance-batch').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-batch-index')).toHaveTextContent(
          '1'
        );
      });
    });

    it('should not increment if at last batch', async () => {
      mockRepository.getSessionInfo.mockResolvedValue({
        currentSession: 1,
        totalSessions: 1,
        courseId: 'course-123',
      });
      mockRepository.getQuotaInfo.mockResolvedValue({
        dailyQuota: 10,
        reviewQuota: 10,
      });

      vi.mocked(getReviewQueue).mockResolvedValue([
        {
          questionId: 'q1',
          status: 'active',
          chunkId: 'chunk-1',
          courseId: 'course-123',
          priority: 1,
        },
      ]);

      renderWithQuizProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('init-session').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('current-batch-index')).toHaveTextContent(
          '0'
        );
      });

      await act(async () => {
        screen.getByTestId('advance-batch').click();
      });

      // Should still be 0
      expect(screen.getByTestId('current-batch-index')).toHaveTextContent('0');
    });
  });

  describe('injectScaffolding (Waterfall)', () => {
    it('should insert new item into reviewQueue and updates storage', async () => {
      mockRepository.getSessionInfo.mockResolvedValue({
        currentSession: 1,
        totalSessions: 1,
        courseId: 'course-123',
      });
      mockRepository.getQuotaInfo.mockResolvedValue({
        dailyQuota: 10,
        reviewQuota: 10,
      });

      vi.mocked(getReviewQueue).mockResolvedValue([
        {
          questionId: 'q1',
          status: 'active',
          chunkId: 'chunk-1',
          courseId: 'course-123',
          priority: 1,
        },
        {
          questionId: 'q2',
          status: 'active',
          chunkId: 'chunk-1',
          courseId: 'course-123',
          priority: 2,
        },
      ]);

      renderWithQuizProvider(<TestComponent />);

      await act(async () => {
        screen.getByTestId('init-session').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('review-queue-length')).toHaveTextContent(
          '2'
        );
      });

      await act(async () => {
        screen.getByTestId('inject-scaffolding').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('review-queue-length')).toHaveTextContent(
          '3'
        );
      });

      expect(mockStorage.set).toHaveBeenCalled();
    });
  });
});
