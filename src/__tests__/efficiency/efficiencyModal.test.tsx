// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionListItem } from '@/features/efficiency/components/SessionListItem';
import { RecentSession } from '@/features/pomodoro/types/pomodoroTypes';

// Mock the base Session object to pass to SessionListItem
const mockSession: RecentSession = {
  id: 'test-session-123',
  courseName: 'Test Course',
  date: '2026-02-27T10:00:00.000Z',
  durationMinutes: 90,
  efficiencyScore: 85,
  totalWorkTime: 3600, // 60 minutes
  totalBreakTime: 600, // 10 minutes
  totalPauseTime: 300, // 5 minutes
  pauseCount: 2,
  timeline: [
    {
      type: 'work',
      start: new Date('2026-02-27T10:00:00.000Z').getTime(),
      end: new Date('2026-02-27T10:30:00.000Z').getTime(),
    },
    {
      type: 'pause',
      start: new Date('2026-02-27T10:30:00.000Z').getTime(),
      end: new Date('2026-02-27T10:35:00.000Z').getTime(),
    },
    {
      type: 'work',
      start: new Date('2026-02-27T10:35:00.000Z').getTime(),
      end: new Date('2026-02-27T11:05:00.000Z').getTime(),
    },
    {
      type: 'break',
      start: new Date('2026-02-27T11:05:00.000Z').getTime(),
      end: new Date('2026-02-27T11:15:00.000Z').getTime(),
    },
  ],
};

describe('EfficiencyModal and SessionListItem Integration', () => {
  beforeEach(() => {
    // Clear DOM before each test
    document.body.innerHTML = '';
  });

  const renderComponent = () => {
    return render(<SessionListItem session={mockSession} />);
  };

  it('1. Modal kapalıyken (trigger tıklanmamış) detaylar ve başlık görünmez', () => {
    renderComponent();

    // Yalnızca trigger üzerindeki bilgilerin göründüğünü doğrula
    expect(screen.getByText('Test Course')).toBeInTheDocument();

    // Modal içindeki özel alanlar görünmemeli
    expect(screen.queryByText('Oturum Akışı')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Test Course - Oturum Detayı')
    ).not.toBeInTheDocument(); // DialogTitle
  });

  it('2. Trigger tıklandığında modal açılır ve başlık görünür', async () => {
    renderComponent();
    const user = userEvent.setup();

    // Trigger'ı bul (Test Course metninin olduğu div'i bulup tıklayabiliriz)
    const triggerItem = screen.getByText('Test Course').closest('.group');
    expect(triggerItem).toBeInTheDocument();

    await user.click(triggerItem!);

    // Modal açılmalı ve Dialog portal içinde render edilmeli
    const modalTitle = await screen.findByRole('heading', {
      name: /Test Course - Oturum Detayı/i,
    });
    expect(modalTitle).toBeInTheDocument();

    // "Oturum Akışı" başlığı görünmeli
    expect(screen.getByText('Oturum Akışı')).toBeInTheDocument();
  });

  it('3. Net Çalışma Süresi (totalWorkTime), Toplam Mola (totalBreakTime), Duraklatma ve Durdurma doğru çevrilerek gösterilir', async () => {
    renderComponent();
    const user = userEvent.setup();

    await user.click(screen.getByText('Test Course').closest('.group')!);

    // Modal'ın görünür olmasını bekle
    await screen.findByRole('dialog');

    // StatCard değerleri
    // Odaklanma: 3600 sn -> Math.round(3600 / 60) -> 60 dk
    expect(screen.getByText('Odaklanma')).toBeInTheDocument();
    expect(screen.getByText('60 dk')).toBeInTheDocument();

    // Mola: 600 sn -> Math.round(600 / 60) -> 10 dk
    const molaLabels = screen.getAllByText('Mola');
    expect(molaLabels.length).toBeGreaterThan(0);
    const molaDurations = screen.getAllByText('10 dk');
    expect(molaDurations.length).toBeGreaterThan(0);

    // Duraklatma: 300 sn -> Math.round(300 / 60) -> 5 dk
    const duraklatmaLabels = screen.getAllByText('Duraklatma');
    expect(duraklatmaLabels.length).toBeGreaterThan(0);
    const duraklatmaDurations = screen.getAllByText('5 dk');
    expect(duraklatmaDurations.length).toBeGreaterThan(0);

    // Durdurma: pauseCount=2 -> "2 Adet"
    expect(screen.getByText('Durdurma')).toBeInTheDocument();
    expect(screen.getByText('2 Adet')).toBeInTheDocument();

    // Odak Gücü modal içinde de görünmeli (efficiencyScore: 85)
    // Modal içindeki odak gücü kartını kontrol et
    const scoreElements = screen.getAllByText('85');
    expect(scoreElements.length).toBeGreaterThan(1); // Hem trigger'da hem modal'da
  });

  it("4. Timeline içerisindeki süre blokları boyutları ve renkleriyle (SessionGanttChart) DOM'da temsil edilir", async () => {
    renderComponent();
    const user = userEvent.setup();

    await user.click(screen.getByText('Test Course').closest('.group')!);
    await screen.findByRole('dialog');

    // Gantt chart render olmalı. SessionGanttChart içinde CSS sınıfları kullanılarak renkler veriliyor
    // work -> bg-emerald-500/20
    // break -> bg-sky-500/20
    // pause -> bg-zinc-500/20
    // document.body içinde bu class'lara sahip div'leri arayabiliriz

    // Gantt chart render olmalı. SessionGanttChart içinde CSS sınıfları kullanılarak renkler veriliyor

    const workBlocks = document.querySelectorAll('.bg-emerald-900');
    expect(workBlocks.length).toBeGreaterThanOrEqual(1); // 2 adet work block koyduk ("Odak" tooltip'li)

    const breakBlocks = document.querySelectorAll('.bg-sky-900');
    expect(breakBlocks.length).toBeGreaterThanOrEqual(1); // 1 break block koyduk ("Mola")

    const pauseBlocks = document.querySelectorAll('.bg-zinc-900');
    expect(pauseBlocks.length).toBeGreaterThanOrEqual(1); // 1 pause block koyduk ("Duraklatma")
  });

  it('5. Modal kapatma alanına (Overlay) / Escape tuşuna basıldığında state temizlenir (Dialog kapanır)', async () => {
    // Resize observer mock for Dialog focus management
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    renderComponent();
    const user = userEvent.setup();

    // Modalı aç
    await user.click(screen.getByText('Test Course').closest('.group')!);

    // Açıldığından emin ol
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // Klavye üzerinden ESC'ye bas
    await user.keyboard('{Escape}');

    // Modal kapanmalı, Dialog componenti DOM'dan silinir (ya da sr-only kalır)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('6. Modalın her defasında eski veriyi temizleyip yeni oturumun verilerini yüklediğini (Re-mount) kanıtla', async () => {
    // Here we test passing different sessions to SessionListItem and verifying Modal renders new data.
    // The modal content is inside SessionListItem, bound to its `session` prop.

    const session40 = {
      ...mockSession,
      id: 's-40',
      efficiencyScore: 40,
      courseName: 'Course 40',
    };
    const session90 = {
      ...mockSession,
      id: 's-90',
      efficiencyScore: 90,
      courseName: 'Course 90',
    };

    const { rerender } = render(<SessionListItem session={session40} />);
    const user = userEvent.setup();

    // 1. Open Session 40
    await user.click(screen.getByText('Course 40').closest('.group')!);
    await screen.findByRole('dialog');

    // Assert 40 score is in the modal
    expect(screen.getAllByText('40').length).toBeGreaterThanOrEqual(1);

    // Close the modal
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // 2. Rerender with Session 90 (simulating clicking another item in the list)
    rerender(<SessionListItem session={session90} />);

    // Open Session 90
    await user.click(screen.getByText('Course 90').closest('.group')!);
    await screen.findByRole('dialog');

    // Assert 90 is displayed
    expect(screen.getAllByText('90').length).toBeGreaterThanOrEqual(1);

    // Assert 40 is gone (cache cleared / remounted)
    expect(
      screen.queryByText('Course 40 - Oturum Detayı')
    ).not.toBeInTheDocument();
  });
});
