import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { ErrorBoundary } from '@/app/providers/ErrorBoundary';
import '@testing-library/jest-dom/vitest';

vi.mock('@/config/env', () => ({
  env: {
    app: {
      isDev: true,
    },
  },
}));

vi.mock('@/shared/lib/core/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
    if (shouldThrow) {
      throw new Error('Test error');
    }
    return <div>Normal content</div>;
  };

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Test Child</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('should catch render errors and display error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/bir şeyler ters gitti/i)).toBeInTheDocument();
  });

  it('should display error message in dev mode', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/test error/i)).toBeInTheDocument();
  });

  it('should show retry button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /tekrar dene/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('should show reload button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByRole('button', {
      name: /sayfayı yenile/i,
    });
    expect(reloadButton).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    render(
      <ErrorBoundary
        fallback={<div data-testid="fallback">Custom Fallback</div>}
      >
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('fallback')).toBeInTheDocument();
    expect(
      screen.queryByText(/bir şeyler ters gitti/i)
    ).not.toBeInTheDocument();
  });

  it('should reset error state when retry button clicked', async () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/bir şeyler ters gitti/i)).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /tekrar dene/i });
    fireEvent.click(retryButton);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    await waitFor(
      () => {
        expect(
          screen.queryByText(/bir şeyler ters gitti/i)
        ).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
