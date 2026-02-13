import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ErrorBoundary } from '@/app/providers/ErrorBoundary';

// Component that throws an error for testing purposes
const ProblematicComponent = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Test Hatası');
  }
  return <div>Problem yok</div>;
};

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Normal İçerik</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Normal İçerik')).toBeInTheDocument();
  });

  it('should catch error and render fallback UI', () => {
    // Silence console.error for this test to keep terminal clean
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Fallback UI title check
    expect(screen.getByText('Bir Şeyler Ters Gitti')).toBeInTheDocument();
    expect(screen.getByText(/Beklenmeyen bir hata oluştu/)).toBeInTheDocument();

    // Check if Tekrar Dene button exists
    expect(screen.getByText('Tekrar Dene')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('should render custom fallback if provided', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div>Özel Hata Ekranı</div>}>
        <ProblematicComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Özel Hata Ekranı')).toBeInTheDocument();
  });

  it('should reset state when "Tekrar Dene" is clicked', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { rerender } = render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Bir Şeyler Ters Gitti')).toBeInTheDocument();

    // Reset state
    const resetButton = screen.getByText('Tekrar Dene');
    resetButton.click();

    // After reset, try rendering without error
    rerender(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Problem yok')).toBeInTheDocument();
    expect(screen.queryByText('Bir Şeyler Ters Gitti')).not.toBeInTheDocument();
  });
});
