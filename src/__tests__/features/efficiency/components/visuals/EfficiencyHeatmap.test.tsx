import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EfficiencyHeatmap } from '@/features/efficiency/components/visuals/EfficiencyHeatmap';
import { DayActivity } from '@/shared/types/efficiency';
import '@testing-library/jest-dom';

// 1. Preparation and Mocking
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock Tooltip to render content directly (avoids JSDOM timeouts/instability)
vi.mock('@/shared/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe('EfficiencyHeatmap', () => {
  beforeEach(() => {
    // Tarih Sabitleme: 2026-02-13
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-13'));
  });

  const mockData: DayActivity[] = [
    { date: '2026-02-13', totalMinutes: 0, count: 0, level: 0, intensity: 0 },
    { date: '2026-02-12', totalMinutes: 30, count: 1, level: 1, intensity: 10 },
    { date: '2026-02-11', totalMinutes: 75, count: 2, level: 2, intensity: 20 },
    {
      date: '2026-02-10',
      totalMinutes: 125,
      count: 3,
      level: 3,
      intensity: 30,
    },
    {
      date: '2026-02-09',
      totalMinutes: 175,
      count: 4,
      level: 4,
      intensity: 40,
    },
    {
      date: '2026-02-08',
      totalMinutes: 250,
      count: 5,
      level: 4,
      intensity: 50,
    },
  ];

  it('verifies all level styles are applied correctly', () => {
    const { container } = render(<EfficiencyHeatmap data={mockData} />);

    const cells = container.querySelectorAll('.aspect-square');
    expect(cells[0]).toHaveClass('bg-white/[0.02]');
    expect(cells[1]).toHaveClass('bg-green-400/10');
    expect(cells[2]).toHaveClass('bg-green-400/25');
    expect(cells[3]).toHaveClass('bg-green-400/45');
    expect(cells[4]).toHaveClass('bg-green-500/65');
    expect(cells[5]).toHaveClass('bg-green-500/85');
  });

  it('verifies date localization and level 0 dot style in tooltip', () => {
    const { container } = render(<EfficiencyHeatmap data={[mockData[0]]} />);

    // 2026-02-13 is Friday in Turkish: 13 Şubat Cuma
    expect(screen.getByText(/13 Şubat Cuma/i)).toBeInTheDocument();

    // Level 0 should have bg-white/10 dot
    const dot = container.querySelector('.rounded-full');
    expect(dot).toHaveClass('bg-white/10');
  });

  it('verifies emerald dot for level > 0 in tooltip', () => {
    const { container } = render(<EfficiencyHeatmap data={[mockData[1]]} />);

    expect(screen.getByText(/30 dk odaklanma/i)).toBeInTheDocument();

    // Level 1 should have bg-emerald-500 dot
    const dot = container.querySelector('.rounded-full');
    expect(dot).toHaveClass('bg-emerald-500');
  });

  it('handles empty or null totalMinutes without crashing', () => {
    const edgeCaseData: DayActivity[] = [
      {
        date: '2026-02-13',
        totalMinutes: null as never,
        count: 0,
        level: 0,
        intensity: 0,
      },
      {
        date: '2026-02-12',
        totalMinutes: undefined as never,
        count: 0,
        level: 0,
        intensity: 0,
      },
    ];

    const { container } = render(<EfficiencyHeatmap data={edgeCaseData} />);
    const cells = container.querySelectorAll('.aspect-square');

    expect(cells[0]).toHaveClass('bg-white/[0.02]');
    expect(cells[1]).toHaveClass('bg-white/[0.02]');
  });

  it('verifies legend contains 6 different level boxes', () => {
    render(<EfficiencyHeatmap data={[]} />);

    const legendContainer = screen.getByText(/Az/i).parentElement;
    const boxes = legendContainer?.querySelectorAll('.w-3\\.5.h-3\\.5');

    expect(boxes).toHaveLength(6);
    expect(boxes![0]).toHaveClass('bg-white/[0.02]');
    expect(boxes![1]).toHaveClass('bg-green-400/10');
    expect(boxes![2]).toHaveClass('bg-green-400/25');
    expect(boxes![3]).toHaveClass('bg-green-400/45');
    expect(boxes![4]).toHaveClass('bg-green-500/65');
    expect(boxes![5]).toHaveClass('bg-green-500/85');
  });

  it('handles invalid date gracefully in formatDate', () => {
    const invalidData: DayActivity[] = [
      {
        date: 'not-a-date',
        totalMinutes: 10,
        count: 1,
        level: 1,
        intensity: 10,
      },
    ];

    render(<EfficiencyHeatmap data={invalidData} />);

    // JS Date constructor with 'not-a-date' returns 'Invalid Date' in this environment
    expect(screen.getByText(/Invalid Date/i)).toBeInTheDocument();
  });
});
