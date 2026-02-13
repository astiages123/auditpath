import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CourseCard } from '@/features/courses/components/ui/CourseCard';
import { ROUTES } from '@/config/routes';
import '@testing-library/jest-dom/vitest';

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('CourseCard', () => {
  const defaultProps = {
    id: 'course-1',
    courseId: 'react-fundamentals',
    name: 'React Fundamentals',
    instructor: 'Ahmet Yılmaz',
    totalVideos: 50,
    totalHours: 10.5,
    completedVideos: 25,
    completedMinutes: 120,
    variant: 'default' as const,
  };

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Rendering & Props', () => {
    it('should render course name, instructor and video count correctly', () => {
      renderWithRouter(<CourseCard {...defaultProps} />);

      expect(screen.getByText('React Fundamentals')).toBeInTheDocument();
      expect(screen.getByText('Ahmet Yılmaz')).toBeInTheDocument();
      expect(screen.getByText('50 video')).toBeInTheDocument();
    });

    it('should apply h-full class for default variant', () => {
      const { container: c } = renderWithRouter(
        <CourseCard {...defaultProps} variant="default" />
      );
      const wrapper = c.querySelector('div[class*="h-full"]');
      expect(wrapper).toBeInTheDocument();
    });

    it('should apply md:col-span-2 class for large variant', () => {
      const { container: c } = renderWithRouter(
        <CourseCard {...defaultProps} variant="large" />
      );
      const wrapper = c.querySelector('div[class*="md:col-span-2"]');
      expect(wrapper).toBeInTheDocument();
    });

    it('should apply md:col-span-2 and md:row-span-2 classes for featured variant', () => {
      const { container: c } = renderWithRouter(
        <CourseCard {...defaultProps} variant="featured" />
      );
      const wrapper = c.querySelector('div[class*="md:col-span-2"]');
      expect(wrapper).toHaveClass('md:col-span-2');
      expect(wrapper).toHaveClass('md:row-span-2');
    });
  });

  describe('Progress Functions', () => {
    it('should calculate correct progress percentage', () => {
      renderWithRouter(
        <CourseCard {...defaultProps} totalVideos={100} completedVideos={50} />
      );

      expect(screen.getByText('%50')).toBeInTheDocument();
      expect(screen.getByText('50/100 tamamlandı')).toBeInTheDocument();
    });

    it('should show 0% progress when totalVideos is 0', () => {
      renderWithRouter(
        <CourseCard {...defaultProps} totalVideos={0} completedVideos={0} />
      );

      expect(screen.getByText('%0')).toBeInTheDocument();
      expect(screen.getByText('0/0 tamamlandı')).toBeInTheDocument();
    });

    it('should format hours correctly when only hours (no minutes)', () => {
      renderWithRouter(<CourseCard {...defaultProps} totalHours={2} />);

      expect(screen.getByText('2 saat')).toBeInTheDocument();
    });

    it('should format hours correctly when only minutes', () => {
      renderWithRouter(<CourseCard {...defaultProps} totalHours={0.75} />);

      expect(screen.getByText('45 dk')).toBeInTheDocument();
    });

    it('should format hours correctly when both hours and minutes', () => {
      renderWithRouter(<CourseCard {...defaultProps} totalHours={2.5} />);

      expect(screen.getByText('2 saat 30 dk')).toBeInTheDocument();
    });

    it('should render progress bar with correct value', () => {
      const { container: c } = renderWithRouter(
        <CourseCard {...defaultProps} totalVideos={100} completedVideos={50} />
      );

      const progressBar = c.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();

      const indicator = progressBar?.querySelector(
        '[data-slot="progress-indicator"]'
      );
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveStyle({ transform: 'translateX(-50%)' });
    });

    it('should show 100% but NOT show completion icon when 199/200 videos completed (Math.round edge case)', () => {
      renderWithRouter(
        <CourseCard {...defaultProps} totalVideos={200} completedVideos={199} />
      );

      expect(screen.getByText('%100')).toBeInTheDocument();
      expect(screen.queryByTestId('completion-icon')).not.toBeInTheDocument();
    });
  });

  describe('Interaction Tests', () => {
    it('should open modal when stats button is clicked', () => {
      const { container: c } = renderWithRouter(
        <CourseCard {...defaultProps} />
      );

      const statsButton = c.querySelector('button[class*="h-8 w-8"]');
      expect(statsButton).toBeInTheDocument();
      fireEvent.click(statsButton!);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('React Fundamentals')).toBeInTheDocument();
    });

    it('should have correct href for notes link', () => {
      const { container: c } = renderWithRouter(
        <CourseCard {...defaultProps} />
      );

      const notesLink = c.querySelector('a[href*="/notes/"]');
      expect(notesLink).toHaveAttribute(
        'href',
        `${ROUTES.NOTES}/react-fundamentals`
      );
    });

    it('should close modal when close button is clicked', () => {
      const { container: c } = renderWithRouter(
        <CourseCard {...defaultProps} />
      );

      const statsButton = c.querySelector('button[class*="h-8 w-8"]');
      fireEvent.click(statsButton!);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should NOT trigger link navigation when clicking stats button (event bubbling prevention)', () => {
      const { container: c } = renderWithRouter(
        <CourseCard {...defaultProps} />
      );

      const notesLinkBeforeClick = c.querySelector('a[href*="/notes/"]');
      expect(notesLinkBeforeClick).toBeInTheDocument();

      const statsButton = c.querySelector('button[class*="h-8 w-8"]');
      fireEvent.click(statsButton!);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const notesLinkAfterClick = c.querySelector('a[href*="/notes/"]');
      expect(notesLinkAfterClick).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should show completion icon when all videos are completed', () => {
      renderWithRouter(
        <CourseCard {...defaultProps} totalVideos={50} completedVideos={50} />
      );

      expect(screen.getByTestId('completion-icon')).toBeInTheDocument();
    });

    it('should NOT show completion icon when not all videos are completed', () => {
      renderWithRouter(
        <CourseCard {...defaultProps} totalVideos={50} completedVideos={25} />
      );

      expect(screen.queryByTestId('completion-icon')).not.toBeInTheDocument();
    });
  });
});
