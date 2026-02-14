import { vi } from 'vitest';
import type { QuizQuestion } from '@/shared/types/quiz';

// --- Mocks ---

// Mock Sonner
export const mockToast = {
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  dismiss: vi.fn(),
  loading: vi.fn(),
};

// Mock Auth
export const mockUser = { id: 'user-123', email: 'test@example.com' };
export const mockUseAuth = vi.fn(() => ({ user: mockUser }));

// Mock Repository
export const mockRepository = {
  getSessionInfo: vi.fn(),
  recordQuizProgress: vi.fn().mockResolvedValue({}),
  getQuotaInfo: vi.fn(),
  getContentVersion: vi.fn(),
  getCourseStats: vi.fn(),
  getChunkMastery: vi.fn().mockResolvedValue({ mastery_score: 50 }),
  fetchQuestionsByIds: vi.fn().mockResolvedValue([]),
};

// Mock Engine
export const mockEngine = {
  getReviewQueue: vi.fn(),
  checkAndTriggerBackgroundGeneration: vi.fn(),
  processBatchForUI: vi.fn().mockResolvedValue([]),
};

// Mock Storage
export const mockStorage = {
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
};

// Mock Logger
export const mockLogger = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  withPrefix: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  })),
};

// --- Helper Functions ---

export const createMockQuestion = (
  overrides: Partial<QuizQuestion> = {}
): QuizQuestion => ({
  type: 'multiple_choice',
  q: 'What is the capital of France?',
  o: ['London', 'Paris', 'Berlin', 'Madrid', 'Rome'],
  a: 1,
  exp: 'Paris is the capital of France.',
  id: 'q1',
  ...overrides,
});

export const resetMocks = () => {
  vi.clearAllMocks();
  mockStorage.get.mockReturnValue(null);
  mockStorage.set.mockReturnValue(undefined);
  mockStorage.remove.mockReturnValue(undefined);
  mockUseAuth.mockReturnValue({ user: mockUser });
};
