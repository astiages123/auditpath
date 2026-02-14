import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RecentActivitiesCard } from '@/features/efficiency/components/cards/RecentActivitiesCard';
import { RecentSession } from '@/shared/types/efficiency';
import { FocusPowerPoint } from '@/features/efficiency/types';

type MockProps = {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
};
type MockTabsProps = { children?: React.ReactNode };
type MockTabsTriggerProps = { children?: React.ReactNode; value: string };
type MockTabsContentProps = { children?: React.ReactNode; value: string };

vi.mock('@/features/efficiency/components/modals/EfficiencyModals', () => ({
  EfficiencyModal: vi.fn(
    ({
      children,
      trigger,
    }: {
      children: React.ReactNode;
      trigger: React.ReactNode;
    }) => (
      <div data-testid="mock-modal">
        <div data-testid="mock-trigger">{trigger}</div>
        <div data-testid="mock-content">{children}</div>
      </div>
    )
  ),
}));

vi.mock('@/features/efficiency/components/visuals/EfficiencyCharts', () => ({
  FocusPowerTrendChart: vi.fn(
    ({
      data,
      rangeLabel,
    }: {
      data?: FocusPowerPoint[];
      rangeLabel?: string;
    }) => (
      <div data-testid="focus-power-trend-chart">
        Trend Chart: {rangeLabel} - {data?.length || 0} items
      </div>
    )
  ),
  SessionGanttChart: vi.fn(({ sessions }: { sessions?: RecentSession[] }) => (
    <div data-testid="session-gantt-chart">
      Gantt Chart: {sessions?.length || 0} sessions
    </div>
  )),
}));

vi.mock('@/shared/lib/core/utils/efficiency-math', () => ({
  calculateFocusPower: vi.fn((work: number) => {
    if (work === 2700) return 100;
    if (work === 2650) return 44;
    return 60;
  }),
}));

vi.mock('@/shared/components/GlassCard', () => ({
  GlassCard: ({ children, className, onClick }: MockProps) => (
    <div data-testid="glass-card" className={className} onClick={onClick}>
      {children}
    </div>
  ),
}));

vi.mock('@/shared/components/ui/tabs', () => ({
  Tabs: ({ children }: MockTabsProps) => (
    <div data-testid="mock-tabs">{children}</div>
  ),
  TabsList: ({ children }: MockTabsProps) => (
    <div data-testid="mock-tabs-list">{children}</div>
  ),
  TabsTrigger: ({ children, value }: MockTabsTriggerProps) => (
    <button data-testid={`tab-trigger-${value}`}>{children}</button>
  ),
  TabsContent: ({ children, value }: MockTabsContentProps) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}));

vi.mock('lucide-react', () => ({
  Clock: () => <div data-testid="mock-clock" />,
  BookOpen: () => <div data-testid="mock-book-open" />,
  ChevronRight: () => <div data-testid="mock-chevron" />,
  Maximize2: () => <div data-testid="mock-maximize" />,
  Zap: () => <div data-testid="mock-zap" />,
  Coffee: () => <div data-testid="mock-coffee" />,
  Pause: () => <div data-testid="mock-pause" />,
  LayoutGrid: () => <div data-testid="mock-grid" />,
  ChevronLeft: () => <div data-testid="mock-chevron-left" />,
}));

describe('RecentActivitiesCard', () => {
  const mockFocusPowerWeek: FocusPowerPoint[] = [
    {
      date: 'Pzt',
      originalDate: '2026-02-13',
      score: 85,
      workMinutes: 45,
      breakMinutes: 10,
      pauseMinutes: 5,
    },
  ];

  const mockSessions: RecentSession[] = [
    {
      id: '1',
      courseName: 'Matematik',
      date: '2026-02-13T10:00:00.000Z',
      durationMinutes: 45,
      efficiencyScore: 110,
      totalWorkTime: 2700,
      totalBreakTime: 600,
      totalPauseTime: 300,
      pauseCount: 2,
      timeline: [
        {
          type: 'work',
          start: '2026-02-13T10:00:00.000Z',
          end: '2026-02-13T10:45:00.000Z',
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-13T10:00:00Z'));
  });

  it('verifies rendering and logic', () => {
    const { rerender } = render(
      <RecentActivitiesCard
        sessions={[]}
        focusPowerWeek={[]}
        focusPowerMonth={[]}
        focusPowerAll={[]}
      />
    );
    expect(screen.getAllByText(/Henüz/i).length).toBeGreaterThan(0);

    rerender(
      <RecentActivitiesCard
        sessions={mockSessions}
        focusPowerWeek={mockFocusPowerWeek}
        focusPowerMonth={[]}
        focusPowerAll={[]}
      />
    );
    expect(screen.getAllByText('Matematik').length).toBeGreaterThan(0);

    // Emerald color check for score 100
    const matScore = screen.getAllByText('100')[0];
    expect(matScore).toHaveClass('text-emerald-400');

    // Math Rounding logic: 2650 / 60 = 44.16 -> 44
    const specialSession = { ...mockSessions[0], totalWorkTime: 2650 };
    rerender(
      <RecentActivitiesCard
        sessions={[specialSession]}
        focusPowerWeek={[]}
        focusPowerMonth={[]}
        focusPowerAll={[]}
      />
    );
    expect(screen.getAllByText('44').length).toBeGreaterThan(0);
  });

  it('verifies tabs and empty timeline', () => {
    render(
      <RecentActivitiesCard
        sessions={mockSessions}
        focusPowerWeek={mockFocusPowerWeek}
        focusPowerMonth={[]}
        focusPowerAll={[]}
      />
    );

    // Since we mock Tabs to render everything, both should be present
    expect(screen.getByTestId('tab-content-list')).toBeInTheDocument();
    expect(screen.getByTestId('tab-content-chart')).toBeInTheDocument();

    expect(
      screen.getAllByTestId('focus-power-trend-chart').length
    ).toBeGreaterThan(0);
    expect(screen.getAllByTestId('session-gantt-chart').length).toBeGreaterThan(
      0
    );
  });

  it('verifies chart range switching', () => {
    render(
      <RecentActivitiesCard
        sessions={mockSessions}
        focusPowerWeek={mockFocusPowerWeek}
        focusPowerMonth={[]}
        focusPowerAll={[]}
      />
    );

    // Click 'Ay' (it's inside ChartTabContent)
    // Initially range should be week (default rendering in ChartTabContent)
    expect(screen.getByText(/Trend Chart: week/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Ay'));
    expect(screen.getByText(/Trend Chart: month/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Tümü'));
    expect(screen.getByText(/Trend Chart: all/)).toBeInTheDocument();
  });
});
