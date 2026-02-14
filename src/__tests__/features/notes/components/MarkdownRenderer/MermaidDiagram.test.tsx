import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import '@testing-library/jest-dom';
import { MermaidDiagram } from '@/features/notes/components/MarkdownRenderer/MermaidDiagram';
import mermaid from 'mermaid';
import { sanitizeHtml } from '@/shared/utils/sanitizeHtml';
import { logger } from '@/shared/lib/core/utils/logger';

// 1. Mocks
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi
      .fn()
      .mockResolvedValue({ svg: '<svg id="mock-svg">Diagram Content</svg>' }),
  },
}));

vi.mock('@/shared/utils/sanitizeHtml', () => ({
  sanitizeHtml: vi.fn((html: string) => html + ' [SAFE]'),
}));

vi.mock('lucide-react', () => ({
  Loader2: vi.fn(() => <div data-testid="loader">Loading...</div>),
  AlertCircle: vi.fn(() => <div data-testid="error-icon">Error</div>),
}));

vi.mock('@/shared/lib/core/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('MermaidDiagram', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Requirement 1: Stabilize Math.random for ID: mermaid-4fzolfdnf
    vi.spyOn(Math, 'random').mockReturnValue(0.12345);
  });

  it('renders initial loading state', () => {
    // Resolve promise later to keep loading state visible
    (mermaid.render as Mock).mockImplementationOnce(
      () => new Promise(() => {})
    );

    render(<MermaidDiagram code="graph TD; A-->B;" />);

    expect(screen.getByText('Diyagram yükleniyor...')).toBeInTheDocument();
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('renders diagram successfully after loading', async () => {
    const code = 'graph TD; A-->B;';
    render(<MermaidDiagram code={code} />);

    // Check loading first
    expect(screen.getByText('Diyagram yükleniyor...')).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.queryByText('Diyagram yükleniyor...')
      ).not.toBeInTheDocument();
    });

    // Requirement 1: Verify exact ID
    expect(mermaid.render).toHaveBeenCalledWith('mermaid-4fzolfdnf', code);

    // Requirement 3: Verify [SAFE] suffix from sanitizer
    expect(screen.getByText(/\[SAFE\]/)).toBeInTheDocument();
    expect(screen.getByText(/Diagram Content/)).toBeInTheDocument();
    expect(sanitizeHtml).toHaveBeenCalled();
  });

  it('handles rendering error correctly', async () => {
    const code = 'invalid code';
    const error = new Error('Mermaid error');
    (mermaid.render as Mock).mockRejectedValueOnce(error);

    render(<MermaidDiagram code={code} />);

    await waitFor(() => {
      expect(screen.getByText('Diyagram render edilemedi')).toBeInTheDocument();
    });

    expect(screen.getByText(code)).toBeInTheDocument();
    expect(screen.getByTestId('error-icon')).toBeInTheDocument();
    expect(logger.error).toHaveBeenCalledWith('Mermaid render error:', error);
  });

  it('does not start rendering if code is empty', () => {
    render(<MermaidDiagram code="" />);

    expect(mermaid.render).not.toHaveBeenCalled();
    expect(screen.getByText('Diyagram yükleniyor...')).toBeInTheDocument();
  });

  it('updates diagram when code prop changes', async () => {
    const { rerender } = render(<MermaidDiagram code="code 1" />);

    await waitFor(() => {
      expect(mermaid.render).toHaveBeenCalledWith(
        'mermaid-4fzolfdnf',
        'code 1'
      );
    });

    rerender(<MermaidDiagram code="code 2" />);

    await waitFor(() => {
      expect(mermaid.render).toHaveBeenCalledWith(
        'mermaid-4fzolfdnf',
        'code 2'
      );
    });

    expect(mermaid.render).toHaveBeenCalledTimes(2);
  });

  it('does not re-render if code prop remains the same (memoization)', async () => {
    // Requirement 2: Verify performance
    const { rerender } = render(<MermaidDiagram code="stable code" />);

    await waitFor(() => {
      expect(mermaid.render).toHaveBeenCalledTimes(1);
    });

    // Rerender with SAME code
    rerender(<MermaidDiagram code="stable code" />);

    // mermaid.render should NOT be called again because of memo and useEffect dependency
    expect(mermaid.render).toHaveBeenCalledTimes(1);
  });
});
