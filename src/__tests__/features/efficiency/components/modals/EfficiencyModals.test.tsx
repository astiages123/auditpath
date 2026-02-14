import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, Mock } from 'vitest';
import {
  FocusHubContent,
  LearningLoadContent,
  MasteryNavigatorContent,
} from '@/features/efficiency/components/modals/EfficiencyModals';
import { Session, LearningLoad } from '@/features/efficiency/types';
import { EfficiencyTrend } from '@/shared/types/efficiency';

// Mock Charts to avoid complex rendering
vi.mock('@/features/efficiency/components/visuals/EfficiencyCharts', () => ({
  LearningLoadChart: () => <div data-testid="learning-load-chart" />,
  EfficiencyTrendChart: () => <div data-testid="efficiency-trend-chart" />,
}));

// Mock Calculation Helper
vi.mock('@/shared/lib/core/utils/efficiency-math', () => ({
  calculateFocusPower: vi.fn(),
}));

import { calculateFocusPower } from '@/shared/lib/core/utils/efficiency-math';

// Mock Radix UI Tabs to fix interaction tests in JSDOM
vi.mock('@radix-ui/react-tabs', async () => {
  const React = await import('react');
  const TabsContext = React.createContext({
    value: '',
    setValue: (_v: string) => {},
  });

  type TabsProps = {
    defaultValue?: string;
    children: React.ReactNode;
    'data-testid'?: string;
    [key: string]: unknown;
  };

  const Tabs = ({ defaultValue = '', children, ...props }: TabsProps) => {
    const [value, setValue] = React.useState(defaultValue);
    return (
      <TabsContext.Provider value={{ value, setValue }}>
        <div data-testid="tabs-root" {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  };

  type TabsListProps = {
    children: React.ReactNode;
    [key: string]: unknown;
  };

  const TabsList = ({ children, ...props }: TabsListProps) => (
    <div {...props}>{children}</div>
  );

  type TabsTriggerProps = {
    value: string;
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    'data-state'?: string;
    [key: string]: unknown;
  };

  const TabsTrigger = ({
    value,
    children,
    onClick,
    ...props
  }: TabsTriggerProps) => {
    const context = React.useContext(TabsContext);
    const state = context.value === value ? 'active' : 'inactive';
    return (
      <button
        data-state={state}
        onClick={(e) => {
          context.setValue(value);
          onClick?.(e);
        }}
        {...props}
      >
        {children}
      </button>
    );
  };

  type TabsContentProps = {
    value: string;
    children: React.ReactNode;
    [key: string]: unknown;
  };

  const TabsContent = ({ value, children, ...props }: TabsContentProps) => {
    const context = React.useContext(TabsContext);
    if (context.value !== value) return null;
    return <div {...props}>{children}</div>;
  };

  return {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    // Add aliases for Radix Primitives
    Root: Tabs,
    List: TabsList,
    Trigger: TabsTrigger,
    Content: TabsContent,
  };
});

describe('EfficiencyModals Components', () => {
  describe('FocusHubContent & DistractionAnalysis', () => {
    const mockSessions: Session[] = [
      {
        id: '1',
        lessonName: 'Math',
        date: '2024-01-01',
        startTime: '10:00',
        endTime: '11:00',
        duration: 60,
        timeline: [
          { type: 'work', start: 0, end: 1000, duration: 10 },
          { type: 'pause', start: 1000, end: 2000, duration: 5 },
        ],
        pauseIntervals: [],
      },
    ];
    const mockTrend: EfficiencyTrend[] = [];

    it('should render DistractionAnalysis by default', () => {
      (calculateFocusPower as Mock).mockReturnValue(80);
      render(<FocusHubContent sessions={mockSessions} trendData={mockTrend} />);

      expect(screen.getByText('Odak Gücü')).toBeInTheDocument();
      expect(screen.getByText('Toplam Duraklatma')).toBeInTheDocument();
      expect(screen.getByText('Kayıp Zaman')).toBeInTheDocument();
      expect(screen.getByText('80')).toBeInTheDocument();
    });

    it('should apply correct color class based on focus score', () => {
      // High Score >= 100 -> emerald-400
      (calculateFocusPower as Mock).mockReturnValue(100);
      const { rerender, getByText } = render(
        <FocusHubContent sessions={mockSessions} trendData={mockTrend} />
      );
      expect(getByText('100')).toHaveClass('text-emerald-400');

      // Medium Score >= 70 -> amber-400
      (calculateFocusPower as Mock).mockReturnValue(75);
      rerender(
        <FocusHubContent sessions={mockSessions} trendData={mockTrend} />
      );
      expect(getByText('75')).toHaveClass('text-amber-400');

      // Low Score < 70 -> rose-400
      (calculateFocusPower as Mock).mockReturnValue(40);
      rerender(
        <FocusHubContent sessions={mockSessions} trendData={mockTrend} />
      );
      expect(getByText('40')).toHaveClass('text-rose-400');
    });

    it('should switch tabs correctly', async () => {
      render(<FocusHubContent sessions={mockSessions} trendData={mockTrend} />);

      // Initially Analysis tab (DistractionAnalysis) is visible
      expect(screen.getByText('Odak Gücü')).toBeInTheDocument();
      // Trend chart should NOT be visible (or hidden)
      expect(
        screen.queryByTestId('efficiency-trend-chart')
      ).not.toBeInTheDocument();

      // Click "Öğrenme Akışı Geçmişi"
      const historyTab = screen.getByText('Öğrenme Akışı Geçmişi');
      fireEvent.click(historyTab);

      // Verify content change
      await waitFor(() => {
        expect(
          screen.getByTestId('efficiency-trend-chart')
        ).toBeInTheDocument();
      });
    });
  });

  describe('LearningLoadContent', () => {
    const mockData: LearningLoad[] = [];

    it('should render tabs and default content', () => {
      render(
        <LearningLoadContent
          dayData={mockData}
          weekData={mockData}
          monthData={mockData}
          allData={mockData}
        />
      );

      expect(screen.getByText('Gün')).toBeInTheDocument();
      expect(screen.getByText('Hafta')).toBeInTheDocument();
      expect(screen.getByText('Ay')).toBeInTheDocument();
      expect(screen.getByText('Tümü')).toBeInTheDocument();

      // Default is "week" -> "Haftalık Çalışma Trendi" text in that tab
      expect(screen.getByText('Haftalık Çalışma Trendi')).toBeInTheDocument();
      expect(screen.getByTestId('learning-load-chart')).toBeInTheDocument();
    });

    it('should switch to Day tab', async () => {
      render(
        <LearningLoadContent
          dayData={mockData}
          weekData={mockData}
          monthData={mockData}
          allData={mockData}
        />
      );

      fireEvent.click(screen.getByText('Gün'));

      await waitFor(() => {
        expect(screen.getByText('Bugünkü Çalışma Süresi')).toBeInTheDocument();
      });
    });
  });

  describe('MasteryNavigatorContent', () => {
    const mockLessons = [
      {
        lessonId: '1',
        title: 'Physics',
        mastery: 85,
        videoProgress: 90,
        questionProgress: 80,
      },
      {
        lessonId: '2',
        title: 'Chemistry',
        mastery: 40,
        videoProgress: 30,
        questionProgress: 50,
      },
    ];

    it('should render lesson list with correct progress', () => {
      render(<MasteryNavigatorContent sessions={mockLessons} />);

      expect(screen.getByText('Physics')).toBeInTheDocument();
      expect(screen.getByText('%85')).toBeInTheDocument();
      expect(screen.getByText('Chemistry')).toBeInTheDocument();
      expect(screen.getByText('%40')).toBeInTheDocument();
    });
  });
});
