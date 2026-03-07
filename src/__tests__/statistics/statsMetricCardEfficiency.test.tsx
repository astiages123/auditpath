// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Zap, Coffee, BookOpen } from 'lucide-react';

// Bileşenler
import { StatsMetricCard } from '@/features/statistics/components/cards/StatsMetricCard';
import {
  StatCard as DashStatCard,
  TrendBadge,
} from '@/features/statistics/components/shared/CardElements';
import { MasteryProgressNavigator } from '@/features/statistics/components/content/MasteryProgressNavigator';
import { FocusHubCard } from '@/features/statistics/components/cards/FocusHubCard';

vi.mock('@/features/statistics/components/modals/StatisticsModal', () => ({
  StatisticsModal: ({
    trigger,
    children,
  }: {
    trigger: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div>{trigger}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock('@/features/statistics/components/shared/GoalProgressRing', () => ({
  GoalProgressRing: () => <div data-testid="goal-ring-mock" />,
}));

vi.mock('@/features/statistics/components/content/FocusStreamHub', () => ({
  FocusStreamHub: () => <div data-testid="focus-stream-mock" />,
}));

vi.mock(
  '@/features/statistics/components/shared/CardElements',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('@/features/statistics/components/shared/CardElements')
      >();
    return {
      ...actual,
      // CardHeader'ı stubla (TrendBadge ve StatCard orijinal kalır)
      CardHeader: ({
        title,
        subtitle,
      }: {
        title: string;
        subtitle: string;
      }) => (
        <div>
          <span>{title}</span>
          <span>{subtitle}</span>
        </div>
      ),
    };
  }
);

vi.mock('@/features/statistics/hooks/useDailyMetrics', () => ({
  useDailyMetrics: vi.fn(),
}));

vi.mock('@/features/statistics/hooks/useStatisticsTrends', () => ({
  useStatisticsTrends: vi.fn(),
}));

vi.mock('@/features/statistics/hooks/useStatistics', () => ({
  useStatisticsLogic: vi.fn(),
}));

import { useStatisticsLogic } from '@/features/statistics/hooks/useStatistics';
import { type DailyMetrics } from '@/features/statistics/hooks/useDailyMetrics';
import { type DailyEfficiencySummary } from '@/features/statistics/types/statisticsTypes';

const mockEfficiencyLogic = (overrides = {}) => {
  (useStatisticsLogic as ReturnType<typeof vi.fn>).mockReturnValue({
    learningFlow: 0.5,
    flowState: 'deep',
    isWarning: true,
    goalProgress: 30,
    goalMinutes: 200,
    currentMinutes: 60,
    formattedCurrentTime: '1sa 0dk',
    ...overrides,
  });
};

describe('StatsMetricCard (StatsMetricCard.tsx)', () => {
  it('label ve value değerlerini doğru render eder', () => {
    render(
      <StatsMetricCard
        icon={Zap}
        iconBg="bg-accent/10"
        iconColor="text-accent"
        label="Odaklanma"
        value="45 dk"
      />
    );

    expect(screen.getByText('Odaklanma')).toBeInTheDocument();
    expect(screen.getByText('45 dk')).toBeInTheDocument();
  });

  it('farklı label/value çiftlerini bağımsız olarak render eder', () => {
    render(
      <StatsMetricCard
        icon={Coffee}
        iconBg="bg-emerald-500/10"
        iconColor="text-emerald-400"
        label="Mola"
        value="10 dk"
      />
    );

    expect(screen.getByText('Mola')).toBeInTheDocument();
    expect(screen.getByText('10 dk')).toBeInTheDocument();
  });

  it("iconColor class'ını ikon elementine uygular", () => {
    const { container } = render(
      <StatsMetricCard
        icon={BookOpen}
        iconBg="bg-sky-500/10"
        iconColor="text-sky-400"
        label="Durdurma"
        value="3 Adet"
      />
    );

    // svg element "w-4 h-4 text-sky-400" class'larına sahip olmalı
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('text-sky-400');
  });
});

describe('StatCard (CardElements.tsx)', () => {
  it('title ve value değerlerini doğru render eder', () => {
    render(<DashStatCard title="Odak Gücü" value="85" />);

    expect(screen.getByText('Odak Gücü')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('subtitle varsa gösterir', () => {
    render(
      <DashStatCard title="Toplam Çalışma" value="60 dk" subtitle="bugün" />
    );

    expect(screen.getByText('Toplam Çalışma')).toBeInTheDocument();
    expect(screen.getByText('60 dk')).toBeInTheDocument();
    expect(screen.getByText('bugün')).toBeInTheDocument();
  });

  it('trend "+" ile başlıyorsa yeşil CSS class\'ı verilir', () => {
    const { container } = render(
      <DashStatCard
        title="Verimlilik"
        value="92"
        trend="+15"
        trendLabel="bu hafta"
      />
    );

    const trendSpan = container.querySelector('span[class*="bg-emerald"]');
    expect(trendSpan).toBeInTheDocument();
    expect(trendSpan).toHaveTextContent('+15');
  });

  it('trend "-" ile başlıyorsa kırmızı CSS class\'ı verilir', () => {
    const { container } = render(
      <DashStatCard
        title="Verimlilik"
        value="40"
        trend="-10"
        trendLabel="geçen haftaya göre"
      />
    );

    const trendSpan = container.querySelector('span[class*="bg-rose"]');
    expect(trendSpan).toBeInTheDocument();
    expect(trendSpan).toHaveTextContent('-10');
  });

  it('loading=true iken value metni render edilmez', () => {
    render(<DashStatCard title="Odak Gücü" value="85" loading={true} />);

    expect(screen.queryByText('85')).not.toBeInTheDocument();
  });

  it('loading=true iken title metni de render edilmez', () => {
    render(<DashStatCard title="Odak Gücü" value="85" loading={true} />);

    expect(screen.queryByText('Odak Gücü')).not.toBeInTheDocument();
  });
});

describe('TrendBadge (CardElements.tsx)', () => {
  it('pozitif yüzdede yeşil class ile render edilir', () => {
    const { container } = render(<TrendBadge percentage={20} />);
    const badge = container.querySelector('div[class*="bg-emerald"]');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('%20');
  });

  it('negatif yüzdede kırmızı class ile render edilir', () => {
    const { container } = render(<TrendBadge percentage={-15} />);
    const badge = container.querySelector('div[class*="bg-rose"]');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('%15');
  });

  it('yüzde 0 olduğunda hiçbir şey render etmez', () => {
    const { container } = render(<TrendBadge percentage={0} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('MasteryProgressNavigator — skor / renk mantığı', () => {
  const baseSessions = [
    {
      lessonId: 'l1',
      title: 'Anayasa',
      mastery: 85,
      videoProgress: 90,
      questionProgress: 80,
    },
    {
      lessonId: 'l2',
      title: 'İktisat',
      mastery: 45,
      videoProgress: 50,
      questionProgress: 40,
    },
    {
      lessonId: 'l3',
      title: 'Medeni Hukuk',
      mastery: 65,
      videoProgress: 70,
      questionProgress: 60,
    },
  ];

  it('mastery ≥ 80 olan derste yeşil class (text-emerald-400) kullanılır', () => {
    const { container } = render(
      <MasteryProgressNavigator sessions={baseSessions} />
    );

    // "85" metninin bulunduğu span'ı doğrula
    const scoreSpan = Array.from(container.querySelectorAll('span')).find(
      (el) => el.textContent?.trim() === '%85'
    );
    expect(scoreSpan).toHaveClass('text-emerald-400');
  });

  it('mastery < 50 olan derste kırmızı class (text-rose-400) kullanılır', () => {
    const { container } = render(
      <MasteryProgressNavigator sessions={baseSessions} />
    );

    const scoreSpan = Array.from(container.querySelectorAll('span')).find(
      (el) => el.textContent?.trim() === '%45'
    );
    expect(scoreSpan).toHaveClass('text-rose-400');
  });

  it('mastery ≥ 50 ve < 80 olan derste primary class (text-primary) kullanılır', () => {
    const { container } = render(
      <MasteryProgressNavigator sessions={baseSessions} />
    );

    const scoreSpan = Array.from(container.querySelectorAll('span')).find(
      (el) => el.textContent?.trim() === '%65'
    );
    expect(scoreSpan).toHaveClass('text-primary');
  });

  it('progress bar mastery ≥ 80 için yeşil (bg-emerald-500) arka plan kullanır', () => {
    const { container } = render(
      <MasteryProgressNavigator
        sessions={[
          {
            lessonId: 'l1',
            title: 'Anayasa',
            mastery: 85,
            videoProgress: 90,
            questionProgress: 80,
          },
        ]}
      />
    );

    const bar = container.querySelector('div[class*="bg-emerald-500"]');
    expect(bar).toBeInTheDocument();
  });

  it('progress bar mastery < 50 için kırmızı (bg-rose-500) arka plan kullanır', () => {
    const { container } = render(
      <MasteryProgressNavigator
        sessions={[
          {
            lessonId: 'l2',
            title: 'İktisat',
            mastery: 45,
            videoProgress: 50,
            questionProgress: 40,
          },
        ]}
      />
    );

    const bar = container.querySelector('div[class*="bg-rose-500"]');
    expect(bar).toBeInTheDocument();
  });

  it('ders başlıklarını render eder', () => {
    render(<MasteryProgressNavigator sessions={baseSessions} />);

    expect(screen.getByText('Anayasa')).toBeInTheDocument();
    expect(screen.getByText('İktisat')).toBeInTheDocument();
    expect(screen.getByText('Medeni Hukuk')).toBeInTheDocument();
  });
});

describe('FocusHubCard', () => {
  const defaultMetrics: DailyMetrics = {
    efficiencySummary: {
      efficiencyScore: 85,
      netWorkTimeSeconds: 3600, // 3600 sn = 60 dk
      totalBreakTimeSeconds: 600,
      totalPauseTimeSeconds: 0,
      pauseCount: 0,
      totalCycles: 4,
      sessions: [],
    } as DailyEfficiencySummary,
    dailyGoalMinutes: 200,
    todayVideoMinutes: 30,
    todayReadingMinutes: 0,
    todayVideoCount: 2,
    pagesRead: 0,
    videoTrendPercentage: 10,
    trendPercentage: 5,
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockEfficiencyLogic();
  });

  it('netWorkTimeSeconds=3600 → UI\'da "60" değeri "Günlük Odak" altında görünür', () => {
    render(<FocusHubCard dailyMetrics={defaultMetrics} efficiencyTrend={[]} />);

    // FocusHubCard: currentWorkMinutes = Math.round(3600/60) = 60
    // Bunu "Günlük Odak" bölümünde gösterir
    expect(screen.getByText('Günlük Odak')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument();
  });

  it('netWorkTimeSeconds=0 → UI\'da "0" değeri render edilir', () => {
    const metrics = {
      ...defaultMetrics,
      efficiencySummary: {
        ...defaultMetrics.efficiencySummary!,
        netWorkTimeSeconds: 0,
      },
    };

    render(<FocusHubCard dailyMetrics={metrics} efficiencyTrend={[]} />);

    expect(screen.getByText('Günlük Odak')).toBeInTheDocument();
    // 0/60 = 0
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('netWorkTimeSeconds=5400 → UI\'da "90" değeri render edilir (1.5 saat = 90 dk)', () => {
    const metrics = {
      ...defaultMetrics,
      efficiencySummary: {
        ...defaultMetrics.efficiencySummary!,
        netWorkTimeSeconds: 5400,
      },
    };

    render(<FocusHubCard dailyMetrics={metrics} efficiencyTrend={[]} />);

    expect(screen.getByText('90')).toBeInTheDocument();
  });

  it('Video İzleme verisini doğru render eder', () => {
    const metrics = {
      ...defaultMetrics,
      todayVideoCount: 3,
      todayVideoMinutes: 45,
    };

    render(<FocusHubCard dailyMetrics={metrics} efficiencyTrend={[]} />);

    expect(screen.getByText('Video İzleme')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('45 dk toplam')).toBeInTheDocument();
  });

  it('goal miktarını "/ Xdk" formatında gösterir', () => {
    const metrics = {
      ...defaultMetrics,
      dailyGoalMinutes: 200,
    };

    render(<FocusHubCard dailyMetrics={metrics} efficiencyTrend={[]} />);

    expect(screen.getByText('/ 200dk')).toBeInTheDocument();
  });
});
