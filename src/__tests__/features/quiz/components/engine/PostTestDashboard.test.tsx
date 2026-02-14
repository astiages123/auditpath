import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PostTestDashboard } from '@/features/quiz/components/engine/PostTestDashboard';
import { TestResultSummary } from '@/features/quiz/core/types';
import * as StrategyModule from '@/features/quiz/lib/engine/strategy';
import { ExamSubjectWeight } from '@/features/quiz/lib/engine/strategy';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// Mock Strategy Module
vi.mock('@/features/quiz/lib/engine/strategy', () => ({
  getSubjectStrategy: vi.fn(),
  // We need to keep other exports if they are used, but we are only mocking getSubjectStrategy here
  // typically we might want to use vi.importActual if we needed real values
}));

describe('PostTestDashboard', () => {
  const mockOnClose = vi.fn();

  const mockResults: TestResultSummary = {
    percentage: 85,
    masteryScore: 92,
    pendingReview: 3,
    totalTimeFormatted: '12:30',
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders summary stats correctly', async () => {
    await act(async () => {
      render(<PostTestDashboard results={mockResults} onClose={mockOnClose} />);
    });

    expect(screen.getByText('Test Tamamlandı!')).toBeInTheDocument();
    expect(screen.getByText('92/100')).toBeInTheDocument(); // Mastery
    expect(screen.getByText('3')).toBeInTheDocument(); // Pending Review
    expect(screen.getByText('12:30')).toBeInTheDocument(); // Total Time
  });

  it('animates percentage score correctly', async () => {
    await act(async () => {
      render(<PostTestDashboard results={mockResults} onClose={mockOnClose} />);
    });

    // Initial state might be 0
    expect(screen.getByText(/%0/)).toBeInTheDocument();

    // Advance timers to trigger animation
    await act(async () => {
      vi.runAllTimers();
    });

    // Should show 85%
    expect(screen.getByText('%85')).toBeInTheDocument();
  });

  it('applies correct color class for high percentage (>=70)', async () => {
    const highResults = { ...mockResults, percentage: 75 };

    await act(async () => {
      render(<PostTestDashboard results={highResults} onClose={mockOnClose} />);
    });

    // We need to check for the stroke class in the SVG circle
    // The component renders a circle with dynamic classes
    // Since we can't easily query by class in SVG, we check if the element exists in container
    const circles = document.querySelectorAll('circle');
    const progressCircle = Array.from(circles).find((c) =>
      c.getAttribute('class')?.includes('stroke-emerald-500')
    );

    expect(progressCircle).toBeTruthy();
  });

  it('applies correct color class for low percentage (<70)', async () => {
    const lowResults = { ...mockResults, percentage: 60 };

    await act(async () => {
      render(<PostTestDashboard results={lowResults} onClose={mockOnClose} />);
    });

    const circles = document.querySelectorAll('circle');
    const progressCircle = Array.from(circles).find((c) =>
      c.getAttribute('class')?.includes('stroke-amber-500')
    );

    expect(progressCircle).toBeTruthy();
  });

  it('renders strategy insights when courseName is provided', async () => {
    const mockStrategy: ExamSubjectWeight = {
      importance: 'high',
      examTotal: 12,
    };

    vi.mocked(StrategyModule.getSubjectStrategy).mockReturnValue(mockStrategy);

    await act(async () => {
      render(
        <PostTestDashboard
          results={mockResults}
          onClose={mockOnClose}
          courseName="Test Course"
        />
      );
    });

    expect(screen.getByText('Zeki Başarı Özeti')).toBeInTheDocument();
    expect(screen.getByText(/Kritik Ders Analizi/i)).toBeInTheDocument();
    expect(screen.getByText(/Önem: HIGH/i)).toBeInTheDocument();
  });

  it('renders default summary when no courseName is provided', async () => {
    vi.mocked(StrategyModule.getSubjectStrategy).mockReturnValue(undefined);

    await act(async () => {
      render(<PostTestDashboard results={mockResults} onClose={mockOnClose} />);
    });

    expect(screen.getByText('Özet Durum')).toBeInTheDocument();
    expect(screen.getByText(/tekrar listesine eklendi/)).toBeInTheDocument();
  });
});
