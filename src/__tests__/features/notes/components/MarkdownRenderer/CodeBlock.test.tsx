import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest';
import '@testing-library/jest-dom';
import { CodeBlock } from '@/features/notes/components/MarkdownRenderer/CodeBlock';
import katex from 'katex';
import { logger } from '@/shared/lib/core/utils/logger';

// 1. Mocks
vi.mock('katex', () => ({
  default: {
    renderToString: vi.fn(
      (str: string) => `<span class="katex-mock">${str}</span>`
    ),
  },
}));

vi.mock('@/shared/lib/core/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('@/shared/utils/sanitizeHtml', () => ({
  sanitizeHtml: vi.fn((html: string) => html + ' [SAFE]'),
}));

vi.mock('@/features/notes/components/MarkdownRenderer/MermaidDiagram', () => ({
  MermaidDiagram: vi.fn(({ code }: { code: string }) => (
    <div data-testid="mermaid-mock">{code}</div>
  )),
}));

vi.mock('lucide-react', () => ({
  Copy: () => <div data-testid="copy-icon">Copy Icon</div>,
  Check: () => <div data-testid="check-icon">Check Icon</div>,
  Loader2: () => <div data-testid="loader-icon">Loader Icon</div>,
  AlertCircle: () => <div data-testid="error-icon">Error Icon</div>,
}));

describe('CodeBlock', () => {
  const mockWriteText = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: mockWriteText,
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe('Math Rendering', () => {
    it('renders display math blocks correctly', () => {
      const code = '$$E=mc^2$$';
      render(<CodeBlock className="language-math">{code}</CodeBlock>);

      expect(katex.renderToString).toHaveBeenCalledWith(
        'E=mc^2',
        expect.objectContaining({
          displayMode: true,
          throwOnError: false,
        })
      );

      const mathElement = screen.getByText(/E=mc\^2/);
      expect(mathElement.parentElement).toHaveClass(
        'my-8',
        'text-lg',
        'overflow-x-auto',
        'text-center'
      );
      expect(screen.getByText(/\[SAFE\]/)).toBeInTheDocument();
    });

    it('renders inline math blocks correctly', () => {
      const code = '$x+y$';
      // className "math" hits className.includes('math')
      render(<CodeBlock className="math">{code}</CodeBlock>);

      expect(katex.renderToString).toHaveBeenCalledWith(
        'x+y',
        expect.objectContaining({
          displayMode: false,
          throwOnError: false,
        })
      );

      const mathElement = screen.getByText(/x\+y/);
      expect(mathElement.tagName).toBe('SPAN');
      expect(screen.getByText(/\[SAFE\]/)).toBeInTheDocument();
    });

    it('detects display math from content only (no class)', () => {
      render(<CodeBlock>$$E=mc^2$$</CodeBlock>);
      expect(katex.renderToString).toHaveBeenCalledWith(
        'E=mc^2',
        expect.objectContaining({ displayMode: true })
      );
    });

    it('detects inline math from content only (no class)', () => {
      render(<CodeBlock>$a^2$</CodeBlock>);
      expect(katex.renderToString).toHaveBeenCalledWith(
        'a^2',
        expect.objectContaining({ displayMode: false })
      );
    });

    it('detects display math from language-math without delimiters', () => {
      render(<CodeBlock className="language-math">E=mc^2</CodeBlock>);
      // Hits (match[1] === 'math') in isDisplay
      expect(katex.renderToString).toHaveBeenCalledWith(
        'E=mc^2',
        expect.objectContaining({ displayMode: true })
      );
    });

    it('detects display math from language-latex without delimiters', () => {
      render(<CodeBlock className="language-latex">E=mc^2</CodeBlock>);
      // Hits (match[1] === 'latex') in isDisplay
      expect(katex.renderToString).toHaveBeenCalledWith(
        'E=mc^2',
        expect.objectContaining({ displayMode: true })
      );
    });

    it('handles KaTeX render errors and logs them', () => {
      const error = new Error('KaTeX error');
      (katex.renderToString as Mock).mockImplementationOnce(() => {
        throw error;
      });

      const { container } = render(
        <CodeBlock className="language-latex">$$error$$</CodeBlock>
      );

      expect(logger.error).toHaveBeenCalledWith(
        'KaTeX fallback render error:',
        error
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Copy Logic', () => {
    it('copies code to clipboard and changes icon temporarily', async () => {
      const code = 'const x = 1;';
      render(<CodeBlock className="language-typescript">{code}</CodeBlock>);

      const copyButton = screen.getByRole('button');
      expect(screen.getByTestId('copy-icon')).toBeInTheDocument();

      await fireEvent.click(copyButton);

      expect(mockWriteText).toHaveBeenCalledWith(code);
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('copy-icon')).not.toBeInTheDocument();

      // Fast-forward 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByTestId('copy-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument();
    });
  });

  describe('Language Detection & UI', () => {
    it('displays language label in the header', () => {
      render(<CodeBlock className="language-rust">fn main() {}</CodeBlock>);
      expect(screen.getByText('rust')).toBeInTheDocument();
    });

    it('renders as simple code block for unknown languages', () => {
      render(<CodeBlock>simple code</CodeBlock>);
      const codeElement = screen.getByText('simple code');
      expect(codeElement.tagName).toBe('CODE');
      expect(codeElement).toHaveClass('bg-muted', 'font-mono');
    });

    it('renders as inline code when inline prop is true', () => {
      render(
        <CodeBlock inline className="language-js">
          const a = 1;
        </CodeBlock>
      );
      const codeElement = screen.getByText('const a = 1;');
      expect(codeElement.tagName).toBe('CODE');
      expect(codeElement).toHaveClass('px-1.5', 'py-0.5');
    });
  });

  describe('Mermaid Hand-off', () => {
    it('renders MermaidDiagram for mermaid language', () => {
      const code = 'graph TD; A-->B;';
      render(<CodeBlock className="language-mermaid">{code}</CodeBlock>);

      expect(screen.getByTestId('mermaid-mock')).toBeInTheDocument();
      expect(screen.getByText(code)).toBeInTheDocument();
    });
  });
});
