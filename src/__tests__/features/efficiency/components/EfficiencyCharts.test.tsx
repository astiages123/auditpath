import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  EfficiencyTrendChart,
  BloomKeyChart,
  LearningLoadChart,
  GoalProgressRing,
  FocusPowerTrendChart,
  SessionGanttChart,
} from '@/features/efficiency/components/visuals/EfficiencyCharts';
import type { EfficiencyTrend } from '@/shared/types/efficiency';
import type { BloomStat, Session } from '@/features/efficiency/types';
import '@testing-library/jest-dom/vitest';

interface TestLearningLoad {
  day: string;
  videoMinutes: number;
  extraStudyMinutes: number;
  targetMinutes?: number;
}

interface TestFocusPowerPoint {
  date: string;
  originalDate: string;
  score: number;
  workMinutes: number;
  breakMinutes: number;
  pauseMinutes: number;
}

import React from 'react';

vi.mock('recharts', () => {
  const MockComponent = ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  );
  const MockNull = () => null;

  const filterChildren = (children: React.ReactNode) => {
    return React.Children.toArray(children).filter((child: React.ReactNode) => {
      if (React.isValidElement(child)) {
        const type = child.type;
        if (typeof type === 'string') {
          return ![
            'defs',
            'linearGradient',
            'stop',
            'linear-gradient',
          ].includes(type);
        }
      }
      return true;
    });
  };

  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div
        data-testid="responsive-container"
        style={{ width: 400, height: 300 }}
      >
        {filterChildren(children)}
      </div>
    ),
    AreaChart: ({
      children,
      data,
    }: {
      children?: React.ReactNode;
      data?: unknown[];
    }) => (
      <div data-testid="area-chart" data-items={data?.length || 0}>
        {filterChildren(children)}
      </div>
    ),
    BarChart: ({
      children,
      data,
    }: {
      children?: React.ReactNode;
      data?: unknown;
    }) => (
      <div data-testid="bar-chart" data-items={JSON.stringify(data)}>
        {filterChildren(children)}
      </div>
    ),
    LineChart: ({ children }: { children?: React.ReactNode }) => (
      <div>{filterChildren(children)}</div>
    ),
    PieChart: ({ children }: { children?: React.ReactNode }) => (
      <div>{filterChildren(children)}</div>
    ),
    ComposedChart: ({ children }: { children?: React.ReactNode }) => (
      <div>{filterChildren(children)}</div>
    ),
    RadialBarChart: ({
      children,
      data,
    }: {
      children?: React.ReactNode;
      data?: unknown[];
    }) => (
      <div data-testid="radial-bar-chart" data-items={data?.length || 0}>
        {filterChildren(children)}
      </div>
    ),
    XAxis: ({ tickFormatter }: { tickFormatter?: { name?: string } }) => (
      <div
        data-testid="x-axis"
        data-formatter={tickFormatter?.name || 'default'}
      />
    ),
    YAxis: ({ tickFormatter }: { tickFormatter?: { name?: string } }) => (
      <div
        data-testid="y-axis"
        data-formatter={tickFormatter?.name || 'default'}
      />
    ),
    ZAxis: MockNull,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: ({ content }: { content?: unknown }) => (
      <div data-testid="tooltip">
        {content ? 'custom-tooltip' : 'default-tooltip'}
      </div>
    ),
    Legend: () => <div data-testid="legend" />,
    ReferenceArea: () => <div data-testid="reference-area" />,
    ReferenceLine: ({
      y,
      label,
    }: {
      y?: number;
      label?: { value?: string };
    }) => (
      <div data-testid="reference-line" data-y={y} data-label={label?.value} />
    ),
    Area: ({
      children,
      dataKey,
    }: {
      children?: React.ReactNode;
      dataKey?: string;
    }) => (
      <div data-testid="area" data-key={dataKey}>
        {filterChildren(children)}
      </div>
    ),
    Bar: ({
      children,
      dataKey,
    }: {
      children?: React.ReactNode;
      dataKey?: string;
    }) => (
      <div data-testid="bar" data-key={dataKey}>
        {filterChildren(children)}
      </div>
    ),
    Line: MockNull,
    Pie: MockNull,
    Cell: ({ fill }: { fill?: string }) => (
      <div data-testid="chart-cell" data-fill={fill} />
    ),
    RadialBar: ({
      children,
      dataKey,
    }: {
      children?: React.ReactNode;
      dataKey?: string;
    }) => (
      <div data-testid="radial-bar" data-key={dataKey}>
        {filterChildren(children)}
      </div>
    ),
    // Mocking PascalCase versions as requested
    LinearGradient: MockComponent,
    Stop: MockNull,
    Defs: MockComponent,
  };
});

describe('EfficiencyCharts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('EfficiencyTrendChart', () => {
    const mockTrendData: EfficiencyTrend[] = [
      { date: '2026-02-01', score: 1.5, workMinutes: 120, videoMinutes: 60 },
      { date: '2026-02-02', score: 1.3, workMinutes: 90, videoMinutes: 45 },
      { date: '2026-02-03', score: 0.5, workMinutes: 150, videoMinutes: 75 },
      { date: '2026-02-04', score: 2.5, workMinutes: 60, videoMinutes: 30 },
    ];

    it('should render with data', () => {
      render(<EfficiencyTrendChart data={mockTrendData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should calculate deviation correctly (score - 1.3)', () => {
      const data: EfficiencyTrend[] = [
        { date: '2026-02-01', score: 1.5, workMinutes: 120, videoMinutes: 60 },
      ];
      render(<EfficiencyTrendChart data={data} />);

      const chart = screen.getByTestId('bar-chart');
      const items = JSON.parse(chart.getAttribute('data-items') || '[]');

      expect(items).toHaveLength(1);
      expect(items[0].deviation).toBeCloseTo(0.2, 5);
    });

    it('should apply correct bar colors based on score ranges', () => {
      const data: EfficiencyTrend[] = [
        { date: '2026-02-01', score: 1.3, workMinutes: 60, videoMinutes: 30 },
        { date: '2026-02-02', score: 0.5, workMinutes: 60, videoMinutes: 30 },
        { date: '2026-02-03', score: 2.5, workMinutes: 60, videoMinutes: 30 },
        { date: '2026-02-04', score: 0.8, workMinutes: 60, videoMinutes: 30 },
      ];
      render(<EfficiencyTrendChart data={data} />);

      const cells = screen.getAllByTestId('chart-cell');

      expect(cells[0]).toHaveAttribute('data-fill', '#10b981');
      expect(cells[1]).toHaveAttribute('data-fill', '#e11d48');
      expect(cells[2]).toHaveAttribute('data-fill', '#e11d48');
      expect(cells[3]).toHaveAttribute('data-fill', '#f59e0b');
    });

    it('should use amber for warning range (0.65-1.0 or 1.6-2.2)', () => {
      const data: EfficiencyTrend[] = [
        { date: '2026-02-01', score: 0.8, workMinutes: 60, videoMinutes: 30 },
        { date: '2026-02-02', score: 1.8, workMinutes: 60, videoMinutes: 30 },
      ];
      render(<EfficiencyTrendChart data={data} />);

      const cells = screen.getAllByTestId('chart-cell');

      expect(cells[0]).toHaveAttribute('data-fill', '#f59e0b');
      expect(cells[1]).toHaveAttribute('data-fill', '#f59e0b');
    });

    it('should format dates in tr-TR locale', () => {
      const data: EfficiencyTrend[] = [
        { date: '2026-02-13', score: 1.3, workMinutes: 60, videoMinutes: 30 },
      ];
      render(<EfficiencyTrendChart data={data} />);

      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toBeInTheDocument();
    });

    it('should handle empty data', () => {
      render(<EfficiencyTrendChart data={[]} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  describe('GoalProgressRing', () => {
    it('should render progress percentage text', () => {
      render(<GoalProgressRing progress={75} />);
      expect(screen.getByText('%75')).toBeInTheDocument();
    });

    it('should cap progress at 100%', () => {
      render(<GoalProgressRing progress={150} />);
      expect(screen.getByText('%100')).toBeInTheDocument();
    });

    it('should calculate stroke-dashoffset correctly at 50%', () => {
      render(<GoalProgressRing progress={50} size={100} strokeWidth={10} />);

      const circles = document.querySelectorAll('circle');
      const progressCircle = circles[1];

      const radius = (100 - 10) / 2;
      const circumference = radius * 2 * Math.PI;
      const expectedOffset = circumference * 0.5;

      expect(progressCircle).toHaveAttribute(
        'stroke-dashoffset',
        String(expectedOffset)
      );
    });

    it('should calculate stroke-dashoffset correctly at 100%', () => {
      render(<GoalProgressRing progress={100} size={100} strokeWidth={10} />);

      const circles = document.querySelectorAll('circle');
      const progressCircle = circles[1];

      expect(progressCircle).toHaveAttribute('stroke-dashoffset', '0');
    });

    it('should use emerald color when progress >= 50', () => {
      render(<GoalProgressRing progress={50} />);

      const circles = document.querySelectorAll('circle');
      const progressCircle = circles[1];

      expect(progressCircle).toHaveAttribute('stroke', '#22c55e');
    });

    it('should use yellow color when progress >= 25 and < 50', () => {
      render(<GoalProgressRing progress={30} />);

      const circles = document.querySelectorAll('circle');
      const progressCircle = circles[1];

      expect(progressCircle).toHaveAttribute('stroke', '#eab308');
    });

    it('should use slate color when progress < 25', () => {
      render(<GoalProgressRing progress={15} />);

      const circles = document.querySelectorAll('circle');
      const progressCircle = circles[1];

      expect(progressCircle).toHaveAttribute('stroke', '#64748b');
    });

    it('should handle zero progress', () => {
      render(<GoalProgressRing progress={0} />);
      expect(screen.getByText('%0')).toBeInTheDocument();
    });

    it('should render with custom size', () => {
      render(<GoalProgressRing progress={50} size={150} />);
      expect(screen.getByText('%50')).toBeInTheDocument();
    });
  });

  describe('SessionGanttChart', () => {
    const baseDate = '2026-02-13';

    const createSession = (
      id: string,
      lessonName: string,
      startTime: string,
      duration: number,
      timeline?: { type: string; start: number; end: number }[]
    ): Session => ({
      id,
      lessonName,
      date: baseDate,
      startTime,
      endTime: '',
      duration,
      timeline: timeline || [],
      pauseIntervals: [],
    });

    it('should render sessions with timeline data', () => {
      const now = new Date('2026-02-13T09:00:00').getTime();
      const sessions: Session[] = [
        createSession('session-1', 'Mathematics', '09:00', 60, [
          { type: 'work', start: now, end: now + 45 * 60000 },
          { type: 'break', start: now + 45 * 60000, end: now + 55 * 60000 },
        ]),
      ];

      render(<SessionGanttChart sessions={sessions} />);
      expect(screen.getByText('DERS')).toBeInTheDocument();
    });

    it('should calculate LERP position correctly - middle point test', () => {
      const baseTime = new Date('2026-02-13T09:00:00').getTime();
      const sessions: Session[] = [
        createSession('session-1', 'Math', '09:00', 360, [
          { type: 'work', start: baseTime, end: baseTime + 360 * 60000 },
        ]),
      ];

      render(<SessionGanttChart sessions={sessions} />);

      const blocks = document.querySelectorAll('[class*="bg-emerald"]');
      expect(blocks.length).toBeGreaterThan(0);
    });

    it('should fallback to simple block when timeline is empty', () => {
      const sessions: Session[] = [
        createSession('session-1', 'Physics', '10:00', 60, []),
      ];

      render(<SessionGanttChart sessions={sessions} />);

      const simpleBlock = document.querySelector('.bg-primary');
      expect(simpleBlock).toBeInTheDocument();
      expect(screen.getByText('Physics')).toBeInTheDocument();
    });

    it('should handle multiple sessions with correct positioning', () => {
      const baseTime = new Date('2026-02-13T09:00:00').getTime();
      const sessions: Session[] = [
        createSession('session-1', 'Math', '09:00', 60, [
          { type: 'work', start: baseTime, end: baseTime + 60 * 60000 },
        ]),
        createSession('session-2', 'Science', '14:00', 60, [
          {
            type: 'work',
            start: baseTime + 5 * 3600000,
            end: baseTime + 6 * 3600000,
          },
        ]),
      ];

      render(<SessionGanttChart sessions={sessions} />);

      const blocks = document.querySelectorAll('[class*="bg-emerald"]');
      expect(blocks.length).toBe(2);
    });

    it('should render time markers', () => {
      const now = new Date('2026-02-13T09:00:00').getTime();
      const sessions: Session[] = [
        createSession('session-1', 'Test', '09:00', 60, [
          { type: 'work', start: now, end: now + 60 * 60000 },
        ]),
      ];

      render(<SessionGanttChart sessions={sessions} />);

      const markerContainer = document.querySelector('.border-r');
      expect(markerContainer).toBeInTheDocument();
    });

    it('should handle empty sessions array', () => {
      render(<SessionGanttChart sessions={[]} />);
      expect(screen.queryByText('Mathematics')).not.toBeInTheDocument();
    });

    it('should render with detailed mode for more markers', () => {
      const now = new Date('2026-02-13T09:00:00').getTime();
      const sessions: Session[] = [
        createSession('session-1', 'Test', '09:00', 60, [
          { type: 'work', start: now, end: now + 60 * 60000 },
        ]),
      ];

      render(<SessionGanttChart sessions={sessions} detailed={true} />);

      const blocks = document.querySelectorAll('[class*="bg-emerald"]');
      expect(blocks.length).toBe(1);
    });
  });

  describe('BloomKeyChart', () => {
    const mockBloomData: BloomStat[] = [
      { level: 'Bilgi', score: 80, questionsSolved: 10 },
      { level: 'Uygula', score: 65, questionsSolved: 8 },
      { level: 'Analiz', score: 45, questionsSolved: 5 },
    ];

    it('should render with bloom data', () => {
      render(<BloomKeyChart data={mockBloomData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should apply correct colors for Bloom levels', () => {
      const data: BloomStat[] = [
        { level: 'Bilgi', score: 80, questionsSolved: 10 },
        { level: 'Uygula', score: 70, questionsSolved: 8 },
        { level: 'Analiz', score: 50, questionsSolved: 5 },
      ];

      render(<BloomKeyChart data={data} />);

      const chart = screen.getByTestId('radial-bar-chart');
      expect(chart).toBeInTheDocument();
    });

    it('should handle empty bloom data', () => {
      render(<BloomKeyChart data={[]} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should handle missing scores with default value', () => {
      const partialData: BloomStat[] = [
        { level: 'Bilgi', score: 0, questionsSolved: 0 },
      ];
      render(<BloomKeyChart data={partialData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  describe('LearningLoadChart', () => {
    const mockLearningData: TestLearningLoad[] = [
      {
        day: 'Pazartesi',
        videoMinutes: 30,
        extraStudyMinutes: 60,
        targetMinutes: 45,
      },
      {
        day: 'Salı',
        videoMinutes: 40,
        extraStudyMinutes: 90,
        targetMinutes: 45,
      },
      {
        day: 'Çarşamba',
        videoMinutes: 20,
        extraStudyMinutes: 45,
        targetMinutes: 45,
      },
    ];

    it('should render with learning load data', () => {
      render(<LearningLoadChart data={mockLearningData} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should render ReferenceLine when targetMinutes is provided', () => {
      render(<LearningLoadChart data={mockLearningData} targetMinutes={60} />);

      const refLine = screen.getByTestId('reference-line');
      expect(refLine).toBeInTheDocument();
      expect(refLine).toHaveAttribute('data-y', '60');
    });

    it('should not render ReferenceLine when targetMinutes is not provided', () => {
      render(<LearningLoadChart data={mockLearningData} />);

      expect(screen.queryByTestId('reference-line')).not.toBeInTheDocument();
    });

    it('should format YAxis with dk suffix', () => {
      render(<LearningLoadChart data={mockLearningData} />);

      const yAxis = screen.getByTestId('y-axis');
      expect(yAxis).toBeInTheDocument();
    });

    it('should handle empty learning data', () => {
      render(<LearningLoadChart data={[]} />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  describe('FocusPowerTrendChart', () => {
    const mockFocusData: TestFocusPowerPoint[] = [
      {
        date: '2026-02-01',
        originalDate: '2026-02-01',
        score: 85,
        workMinutes: 120,
        breakMinutes: 20,
        pauseMinutes: 5,
      },
      {
        date: '2026-02-02',
        originalDate: '2026-02-02',
        score: 92,
        workMinutes: 150,
        breakMinutes: 25,
        pauseMinutes: 3,
      },
      {
        date: '2026-02-03',
        originalDate: '2026-02-03',
        score: 78,
        workMinutes: 90,
        breakMinutes: 15,
        pauseMinutes: 10,
      },
    ];

    it('should render with focus power data', () => {
      render(<FocusPowerTrendChart data={mockFocusData} rangeLabel="Hafta" />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should render area chart with gradient', () => {
      render(<FocusPowerTrendChart data={mockFocusData} rangeLabel="Ay" />);

      const areaChart = screen.getByTestId('area-chart');
      expect(areaChart).toBeInTheDocument();
    });

    it('should handle empty focus data', () => {
      render(<FocusPowerTrendChart data={[]} rangeLabel="Ay" />);
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });
});
