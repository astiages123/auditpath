import { render, screen, fireEvent } from '@testing-library/react';
import { SealCard } from './SealCard';
import { Achievement } from '@/features/achievements/lib/achievements';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Lock: () => <div data-testid="lock-icon" />,
}));

const mockAchievement: Achievement = {
  id: 'test-achievement',
  title: 'Test Başarımı',
  motto: 'Test mottosu',
  imagePath: '/test-image.png',
  guild: 'HUKUK',
  requirement: { type: 'category_progress', category: 'HUKUK', percentage: 10 },
  order: 1,
};

describe('SealCard', () => {
  const mockOnClick = vi.fn();

  it('renders locked state correctly', () => {
    render(
      <SealCard
        achievement={mockAchievement}
        isUnlocked={false}
        onClick={mockOnClick}
      />
    );

    // Locked image class
    const img = screen.getByAltText(mockAchievement.title);
    expect(img).toHaveClass('seal-locked');
    expect(img).not.toHaveClass('seal-unlocked');

    // Lock icon presence
    expect(screen.getByTestId('lock-icon')).toBeInTheDocument();

    // Accessibility label
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute(
      'aria-label',
      `${mockAchievement.title} - Kilitli`
    );

    // Title color (muted)
    const title = screen.getByText(mockAchievement.title);
    expect(title).toHaveClass('text-muted-foreground');
  });

  it('renders unlocked state correctly', () => {
    render(
      <SealCard
        achievement={mockAchievement}
        isUnlocked={true}
        onClick={mockOnClick}
      />
    );

    // Unlocked image class
    const img = screen.getByAltText(mockAchievement.title);
    expect(img).toHaveClass('seal-unlocked');
    expect(img).toHaveClass('seal-glow');
    expect(img).not.toHaveClass('seal-locked');

    // Lock icon absence
    expect(screen.queryByTestId('lock-icon')).not.toBeInTheDocument();

    // Accessibility label
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute(
      'aria-label',
      `${mockAchievement.title} - Açık`
    );

    // Unlocked indicator glow (background color)
    // It's a div without text, so we can find it by its style attribute if needed,
    // but checking its existence when isUnlocked=true is already good.
    // Based on the code, it's the last element in the button.
    // We can use querySelector if absolutely necessary, but screen is preferred.
    // Since it has no text or role, checking style on a container element or
    // just confirming it's not present when locked is sufficient.
  });

  it('triggers onClick when clicked', () => {
    render(
      <SealCard
        achievement={mockAchievement}
        isUnlocked={true}
        onClick={mockOnClick}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('shows tooltip content in DOM for locked state', () => {
    render(
      <SealCard
        achievement={mockAchievement}
        isUnlocked={false}
        onClick={mockOnClick}
      />
    );

    // Tooltip should be in DOM regardless of visibility (JSDOM limitations)
    expect(screen.getByText(/Gereksinim:/)).toBeInTheDocument();
    expect(
      screen.getByText(/Hukuk öğretilerinde %10 aydınlanma/)
    ).toBeInTheDocument();
  });
});
