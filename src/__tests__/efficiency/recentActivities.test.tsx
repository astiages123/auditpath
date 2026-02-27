// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecentActivitiesCard } from '@/features/efficiency/components/RecentActivitiesCard';
import { RecentActivitiesContainer } from '@/features/efficiency/components/RecentActivitiesContainer';
import { formatEfficiencyTime } from '@/features/efficiency/logic/efficiencyHelpers';
import { RecentSession } from '@/features/pomodoro/types/pomodoroTypes';

// === MOCKs: Karmaşık alt bileşenler ===

// EfficiencyModal: Trigger içeriğini ve children'ı doğrudan render eder,
// Radix Dialog portalını tetiklemez.
vi.mock('@/features/efficiency/components/EfficiencyModal', () => ({
  EfficiencyModal: ({
    trigger,
    children,
  }: {
    trigger: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div data-testid="efficiency-modal-mock">
      <div data-testid="modal-trigger">{trigger}</div>
      <div data-testid="modal-content">{children}</div>
    </div>
  ),
}));

// EfficiencyChartTab: Recharts ve karmaşık grafik bileşeni — stub.
vi.mock('@/features/efficiency/components/EfficiencyChartTab', () => ({
  EfficiencyChartTab: () => <div data-testid="efficiency-chart-tab-mock" />,
}));

// SessionGanttChart: Karmaşık SVG grafik bileşeni — stub.
vi.mock('@/features/efficiency/components/SessionGanttChart', () => ({
  SessionGanttChart: () => <div data-testid="session-gantt-chart-mock" />,
}));

// useVirtualizer: JSDOM'da layout bilgisi olmadığından getVirtualItems() boş döner.
// Biz getTotalSize() ve getVirtualItems()'ı basit şekilde stub'larız.
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
  }),
}));

// Skeleton ve Card: gerçek import, sadece DOM'a basit HTML render eder. Mock gerekmez.

// Hook mock'ları — Container testleri için
vi.mock('@/features/efficiency/hooks/useCognitiveInsights', () => ({
  useCognitiveInsights: vi.fn(),
}));
vi.mock('@/features/efficiency/hooks/useEfficiencyTrends', () => ({
  useEfficiencyTrends: vi.fn(),
}));

import { useCognitiveInsights } from '@/features/efficiency/hooks/useCognitiveInsights';
import { useEfficiencyTrends } from '@/features/efficiency/hooks/useEfficiencyTrends';

// === MOCK VERİ ===

/** 3 farklı derse ait mock RecentSession listesi */
const mockSessions: RecentSession[] = [
  {
    id: 'session-1',
    courseName: 'Anayasa',
    date: '2026-02-26T09:00:00.000Z',
    durationMinutes: 45,
    efficiencyScore: 88,
    timeline: [],
    totalWorkTime: 2700,
    totalBreakTime: 300,
    totalPauseTime: 0,
    pauseCount: 0,
  },
  {
    id: 'session-2',
    courseName: 'İktisat',
    date: '2026-02-26T11:00:00.000Z',
    durationMinutes: 70,
    efficiencyScore: 112,
    timeline: [],
    totalWorkTime: 4200,
    totalBreakTime: 600,
    totalPauseTime: 0,
    pauseCount: 1,
  },
  {
    id: 'session-3',
    courseName: 'Medeni Hukuk',
    date: '2026-02-26T14:00:00.000Z',
    durationMinutes: 30,
    efficiencyScore: 55,
    timeline: [],
    totalWorkTime: 1800,
    totalBreakTime: 0,
    totalPauseTime: 0,
    pauseCount: 0,
  },
];

const emptyFocusPower = {
  focusPowerWeek: [],
  focusPowerMonth: [],
  focusPowerAll: [],
};

// === YARDIMCI FONKSIYON TESTLERİ ===

describe('formatEfficiencyTime', () => {
  it('sadece dakika varsa "0sa Xdk" formatında döndürür', () => {
    expect(formatEfficiencyTime(45)).toBe('0sa 45dk');
  });

  it('tam saat varsa "1sa 0dk" formatında döndürür', () => {
    expect(formatEfficiencyTime(60)).toBe('1sa 0dk');
  });

  it('saat ve dakika karışık olunca "1sa 10dk" formatında döndürür', () => {
    expect(formatEfficiencyTime(70)).toBe('1sa 10dk');
  });

  it('0 dakika girildiğinde "0sa 0dk" döndürür', () => {
    expect(formatEfficiencyTime(0)).toBe('0sa 0dk');
  });
});

// === RecentActivitiesCard BİLEŞEN TESTLERİ ===

describe('RecentActivitiesCard', () => {
  it('3 farklı dersin adını listede render eder', () => {
    render(
      <RecentActivitiesCard
        sessions={mockSessions}
        focusPowerWeek={[]}
        focusPowerMonth={[]}
        focusPowerAll={[]}
      />
    );

    expect(screen.getByText('Anayasa')).toBeInTheDocument();
    expect(screen.getByText('İktisat')).toBeInTheDocument();
    expect(screen.getByText('Medeni Hukuk')).toBeInTheDocument();
  });

  it('her oturumun çalışma süresini "X dk" formatında render eder', () => {
    render(
      <RecentActivitiesCard
        sessions={mockSessions}
        focusPowerWeek={[]}
        focusPowerMonth={[]}
        focusPowerAll={[]}
      />
    );

    // SessionListItem "{durationMinutes} dk" olarak render eder
    expect(screen.getByText('45 dk')).toBeInTheDocument();
    expect(screen.getByText('70 dk')).toBeInTheDocument();
    expect(screen.getByText('30 dk')).toBeInTheDocument();
  });

  it('her oturumun efficiency skorunu listede gösterir', () => {
    render(
      <RecentActivitiesCard
        sessions={mockSessions}
        focusPowerWeek={[]}
        focusPowerMonth={[]}
        focusPowerAll={[]}
      />
    );

    // Skorlar "Odak Gücü" sütununda görünür
    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.getByText('112')).toBeInTheDocument();
    expect(screen.getByText('55')).toBeInTheDocument();
  });

  it('sessions boş olduğunda fallback metni "Henüz Çalışma Yok" gösterir', () => {
    render(
      <RecentActivitiesCard
        sessions={[]}
        focusPowerWeek={[]}
        focusPowerMonth={[]}
        focusPowerAll={[]}
      />
    );

    expect(screen.getByText('Henüz Çalışma Yok')).toBeInTheDocument();
    expect(
      screen.getByText('Son zamanlarda tamamlanan bir çalışma bulunamadı.')
    ).toBeInTheDocument();
  });

  it('sessions boş olmayan durumda fallback metni göstermez', () => {
    render(
      <RecentActivitiesCard
        sessions={mockSessions}
        focusPowerWeek={[]}
        focusPowerMonth={[]}
        focusPowerAll={[]}
      />
    );

    expect(screen.queryByText('Henüz Çalışma Yok')).not.toBeInTheDocument();
  });

  it('"Son Çalışmalar" başlığını ve "Tamamlanan son oturumlar" alt başlığını gösterir', () => {
    render(
      <RecentActivitiesCard
        sessions={mockSessions}
        focusPowerWeek={[]}
        focusPowerMonth={[]}
        focusPowerAll={[]}
      />
    );

    expect(screen.getByText('Son Çalışmalar')).toBeInTheDocument();
    expect(screen.getByText('Tamamlanan son oturumlar')).toBeInTheDocument();
  });

  it('Odak Gücü etiketini listede gösterir', () => {
    render(
      <RecentActivitiesCard
        sessions={mockSessions}
        focusPowerWeek={[]}
        focusPowerMonth={[]}
        focusPowerAll={[]}
      />
    );

    // Her SessionListItem "Odak Gücü" etiketi içerir; getAllByText ile kontrol edilir
    const labels = screen.getAllByText('Odak Gücü');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });
});

// === RecentActivitiesContainer BİLEŞEN TESTLERİ ===

describe('RecentActivitiesContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loading=true iken Skeleton gösterir, RecentActivitiesCard render etmez', () => {
    (useCognitiveInsights as ReturnType<typeof vi.fn>).mockReturnValue({
      loading: true,
      recentSessions: [],
    });
    (useEfficiencyTrends as ReturnType<typeof vi.fn>).mockReturnValue({
      loading: false,
      focusPowerWeek: [],
      focusPowerMonth: [],
      focusPowerAll: [],
    });

    render(<RecentActivitiesContainer />);

    // Yükleme sırasında ders adları görünmez
    expect(screen.queryByText('Anayasa')).not.toBeInTheDocument();
    expect(screen.queryByText('Son Çalışmalar')).not.toBeInTheDocument();
    expect(screen.queryByText('Henüz Çalışma Yok')).not.toBeInTheDocument();
  });

  it('loading=false iken RecentActivitiesCard render eder ve oturum listesi görünür', () => {
    (useCognitiveInsights as ReturnType<typeof vi.fn>).mockReturnValue({
      loading: false,
      recentSessions: mockSessions,
    });
    (useEfficiencyTrends as ReturnType<typeof vi.fn>).mockReturnValue({
      loading: false,
      ...emptyFocusPower,
    });

    render(<RecentActivitiesContainer />);

    expect(screen.getByText('Anayasa')).toBeInTheDocument();
    expect(screen.getByText('İktisat')).toBeInTheDocument();
    expect(screen.getByText('Medeni Hukuk')).toBeInTheDocument();
  });

  it('loading=false ve sessions=[] iken fallback gösterir', () => {
    (useCognitiveInsights as ReturnType<typeof vi.fn>).mockReturnValue({
      loading: false,
      recentSessions: [],
    });
    (useEfficiencyTrends as ReturnType<typeof vi.fn>).mockReturnValue({
      loading: false,
      ...emptyFocusPower,
    });

    render(<RecentActivitiesContainer />);

    expect(screen.getByText('Henüz Çalışma Yok')).toBeInTheDocument();
  });

  it('useEfficiencyTrends loading=true ise de Skeleton gösterir', () => {
    (useCognitiveInsights as ReturnType<typeof vi.fn>).mockReturnValue({
      loading: false,
      recentSessions: mockSessions,
    });
    (useEfficiencyTrends as ReturnType<typeof vi.fn>).mockReturnValue({
      loading: true,
      ...emptyFocusPower,
    });

    render(<RecentActivitiesContainer />);

    // Her iki hook da loading=false olana kadar kart render edilmez
    expect(screen.queryByText('Anayasa')).not.toBeInTheDocument();
  });
});
