import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvidenceCard } from '@/features/quiz/components/ui/EvidenceCard';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
  },
}));

describe('EvidenceCard', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.clearAllMocks();
  });

  const defaultProps = {
    evidence: 'This is a sample evidence text used for testing purposes.',
    courseId: 'test-course-123',
    sectionTitle: 'Section 1.1',
    onDismiss: vi.fn(),
  };

  it('renders correctly with given props', () => {
    render(<EvidenceCard {...defaultProps} />);

    expect(screen.getByText('Kaynak Metinden Kanıt')).toBeInTheDocument();
    expect(screen.getByText('Section 1.1')).toBeInTheDocument();
    expect(
      screen.getByText(/This is a sample evidence text/)
    ).toBeInTheDocument();
  });

  it('does not render if evidence is empty', () => {
    const { container } = render(
      <EvidenceCard {...defaultProps} evidence="" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('navigates to note with encoded evidence when "Metinde Gör" is clicked', () => {
    render(<EvidenceCard {...defaultProps} />);

    const viewButton = screen.getByRole('button', { name: /Metinde Gör/i });
    fireEvent.click(viewButton);

    const encodedEvidence = encodeURIComponent(
      defaultProps.evidence.slice(0, 100)
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      `${ROUTES.NOTES}/${defaultProps.courseId}?highlight=${encodedEvidence}`
    );
  });

  it('calls onDismiss when dismissed (if provided)', () => {
    render(<EvidenceCard {...defaultProps} />);

    const dismissButton = screen.getByRole('button', { name: /Kapat/i });
    fireEvent.click(dismissButton);

    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss after navigating', () => {
    render(<EvidenceCard {...defaultProps} />);

    const viewButton = screen.getByRole('button', { name: /Metinde Gör/i });
    fireEvent.click(viewButton);

    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('truncates evidence in navigation url to 100 chars', () => {
    const longEvidence = 'a'.repeat(150);
    render(<EvidenceCard {...defaultProps} evidence={longEvidence} />);

    const viewButton = screen.getByRole('button', { name: /Metinde Gör/i });
    fireEvent.click(viewButton);

    const expectedEncoded = encodeURIComponent(longEvidence.slice(0, 100));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining(`highlight=${expectedEncoded}`)
    );
  });
});
