import { describe, expect, it, vi, beforeEach, Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { CognitiveInsightsCard } from '@/features/efficiency/components/cards/CognitiveInsightsCard';
import { useEfficiencyData } from '@/features/efficiency/hooks/use-efficiency-data';
import '@testing-library/jest-dom/vitest';

const mockUseEfficiencyData = useEfficiencyData as Mock;

// 1. Mock useEfficiencyData
vi.mock('@/features/efficiency/hooks/use-efficiency-data', () => ({
  useEfficiencyData: vi.fn(),
}));

// 2. Mock lucide-react with data-testid
vi.mock('lucide-react', () => ({
  Brain: () => <div data-testid="icon-brain" />,
  AlertTriangle: () => <div data-testid="icon-alert-triangle" />,
  Lightbulb: () => <div data-testid="icon-lightbulb" />,
  Zap: () => <div data-testid="icon-zap" />,
}));

// Mock CardHeader if needed, but it seems simple enough to keep
// Mock GlassCard if needed
vi.mock('../../../../shared/components/GlassCard', () => ({
  GlassCard: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="glass-card" className={className}>
      {children}
    </div>
  ),
}));

describe('CognitiveInsightsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Loading State: shows loading spinner and text', () => {
    mockUseEfficiencyData.mockReturnValue({
      loading: true,
      cognitiveAnalysis: null,
    });

    render(<CognitiveInsightsCard />);

    expect(screen.getByText('Analizler yükleniyor...')).toBeInTheDocument();
    expect(screen.getByTestId('icon-brain')).toBeInTheDocument();
  });

  it('Empty State: shows Zekanı Konuştur! when cognitiveAnalysis is null', () => {
    mockUseEfficiencyData.mockReturnValue({
      loading: false,
      cognitiveAnalysis: null,
    });

    render(<CognitiveInsightsCard />);

    expect(screen.getByText('Zekanı Konuştur!')).toBeInTheDocument();
  });

  it('Empty State: shows Zekanı Konuştur! when hasData is false', () => {
    mockUseEfficiencyData.mockReturnValue({
      loading: false,
      cognitiveAnalysis: {
        hasData: false,
      },
    });

    render(<CognitiveInsightsCard />);

    expect(screen.getByText('Zekanı Konuştur!')).toBeInTheDocument();
    expect(
      screen.getByText(/İlk quizlerini tamamladığında/)
    ).toBeInTheDocument();
  });

  it('Empty State: shows Zekanı Konuştur! when data is empty', () => {
    mockUseEfficiencyData.mockReturnValue({
      loading: false,
      cognitiveAnalysis: {
        hasData: true,
        topConfused: [],
        recentInsights: [],
      },
    });

    render(<CognitiveInsightsCard />);

    expect(screen.getByText('Zekanı Konuştur!')).toBeInTheDocument();
  });

  describe('Score Color Logic', () => {
    const renderWithScore = (score: number) => {
      mockUseEfficiencyData.mockReturnValue({
        loading: false,
        cognitiveAnalysis: {
          hasData: true,
          focusScore: score,
          topConfused: [{ text: 'Test', count: 1 }],
          recentInsights: [],
          criticalTopics: [],
        },
      });
      return render(<CognitiveInsightsCard />);
    };

    it('applies text-emerald-400 for score 85', () => {
      renderWithScore(85);
      const scoreElement = screen.getByText('85');
      expect(scoreElement).toHaveClass('text-emerald-400');
    });

    it('applies text-amber-400 for score 65', () => {
      renderWithScore(65);
      const scoreElement = screen.getByText('65');
      expect(scoreElement).toHaveClass('text-amber-400');
    });

    it('applies text-rose-400 for score 40', () => {
      renderWithScore(40);
      const scoreElement = screen.getByText('40');
      expect(scoreElement).toHaveClass('text-rose-400');
    });

    it('handles 0 score as rose-400', () => {
      mockUseEfficiencyData.mockReturnValue({
        loading: false,
        cognitiveAnalysis: {
          hasData: true,
          focusScore: 0,
          topConfused: [{ text: 'Test', count: 1 }],
        },
      });
      render(<CognitiveInsightsCard />);
      const scoreElement = screen.getByText('0');
      expect(scoreElement).toHaveClass('text-rose-400');
    });
  });

  describe('Content Sections', () => {
    const mockData = {
      hasData: true,
      focusScore: 80,
      criticalTopics: [
        { id: 'q1', fails: 3, diagnosis: 'Yanlış varsayım' },
        { id: 'q2', fails: 2, diagnosis: undefined }, // Trigger fallback
      ],
      topConfused: [
        { text: 'Kavram A', count: 5 },
        { text: 'Kavram B', count: 1 }, // Trigger no-count badge
      ],
      recentInsights: ['Hızını artırmalısın', 'Dikkatini topla'],
    };

    beforeEach(() => {
      mockUseEfficiencyData.mockReturnValue({
        loading: false,
        cognitiveAnalysis: mockData,
      });
    });

    it('renders all sections with correct items and icons', () => {
      render(<CognitiveInsightsCard />);

      // Section Headers
      expect(screen.getByText('KRİTİK ODAK ALANLARI')).toBeInTheDocument();
      expect(screen.getByText('KAVRAM YANILGILARI')).toBeInTheDocument();
      expect(screen.getByText('SON ZEKÂ NOTLARI')).toBeInTheDocument();

      // Icons
      expect(screen.getByTestId('icon-alert-triangle')).toBeInTheDocument();
      expect(screen.getByTestId('icon-zap')).toBeInTheDocument();
      expect(screen.getByTestId('icon-lightbulb')).toBeInTheDocument();

      // Critical Topics
      expect(screen.getByText('Yanlış varsayım')).toBeInTheDocument();
      expect(screen.getByText('Tekrarlayan Hata (3x)')).toBeInTheDocument();

      // Fallback Diagnosis
      expect(
        screen.getByText(
          'Bu konuda zorlandığınız tespit edildi. Destek mekanizması devrede.'
        )
      ).toBeInTheDocument();

      // Top Confused
      expect(screen.getByText('Kavram A')).toBeInTheDocument();
      expect(screen.getByText('5 kez')).toBeInTheDocument();
      expect(screen.getByText('Kavram B')).toBeInTheDocument();
      expect(screen.queryByText('1 kez')).not.toBeInTheDocument();

      // Recent Insights
      expect(screen.getByText(/"Hızını artırmalısın"/)).toBeInTheDocument();
      expect(screen.getByText(/"Dikkatini topla"/)).toBeInTheDocument();
    });

    it('verifies correct counts for multiple items', () => {
      render(<CognitiveInsightsCard />);

      // Critical topics has 2 items
      const criticalItemTexts = screen.getAllByText(/Tekrarlayan Hata/);
      expect(criticalItemTexts).toHaveLength(2);

      // Top confused has 2 items
      const confusedItems = [
        screen.getByText('Kavram A'),
        screen.getByText('Kavram B'),
      ];
      expect(confusedItems).toHaveLength(2);

      // Recent insights has 2 items
      const insights = [
        screen.getByText(/"Hızını artırmalısın"/),
        screen.getByText(/"Dikkatini topla"/),
      ];
      expect(insights).toHaveLength(2);
    });

    it('hides sections when data arrays are empty', () => {
      mockUseEfficiencyData.mockReturnValue({
        loading: false,
        cognitiveAnalysis: {
          hasData: true,
          criticalTopics: [],
          topConfused: [
            { text: 'Only one item to keep hasData true', count: 1 },
          ],
          recentInsights: [],
        },
      });

      render(<CognitiveInsightsCard />);

      expect(
        screen.queryByText('KRİTİK ODAK ALANLARI')
      ).not.toBeInTheDocument();
      expect(screen.queryByText('SON ZEKÂ NOTLARI')).not.toBeInTheDocument();
      expect(screen.getByText('KAVRAM YANILGILARI')).toBeInTheDocument();
    });
  });
});
