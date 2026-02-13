import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CelebrationProvider } from '@/app/providers/CelebrationProvider';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useCelebrationStore } from '@/shared/store/use-celebration-store';

// Mock dependencies
vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn().mockReturnValue({
    data: undefined,
    isLoading: false,
    isSuccess: true,
  }),
  useQueryClient: vi.fn().mockReturnValue({
    invalidateQueries: vi.fn(),
    setQueryData: vi.fn(),
  }),
}));

vi.mock('@/shared/hooks/use-celebration', () => ({
  useCelebration: vi.fn(),
}));

vi.mock('@/shared/store/use-celebration-store', () => ({
  useCelebrationStore: vi.fn(),
}));

vi.mock('@/shared/components/modals/CelebrationModal', () => ({
  CelebrationModal: ({ isOpen, title }: { isOpen: boolean; title: string }) =>
    isOpen ? <div data-testid="celebration-modal">{title}</div> : null,
}));

describe('CelebrationProvider', () => {
  const mockClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2024-01-01T00:00:00Z',
      },
      session: null,
      loading: false,
      signOut: vi.fn(),
    });
    vi.mocked(useCelebrationStore).mockReturnValue({
      current: null,
      isOpen: false,
      close: mockClose,
      queue: [],
      enqueue: vi.fn(),
      next: vi.fn(),
      clear: vi.fn(),
    });
  });

  it('should render children', () => {
    render(
      <CelebrationProvider>
        <div data-testid="child">Child Content</div>
      </CelebrationProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should render CelebrationModal when there is a current event and it is open', () => {
    vi.mocked(useCelebrationStore).mockReturnValue({
      current: {
        id: '1',
        title: 'Tebrikler!',
        description: 'Kursu tamamladınız',
        variant: 'course',
      },
      isOpen: true,
      close: mockClose,
      queue: [],
      enqueue: vi.fn(),
      next: vi.fn(),
      clear: vi.fn(),
    });

    render(
      <CelebrationProvider>
        <div>Content</div>
      </CelebrationProvider>
    );

    expect(screen.getByTestId('celebration-modal')).toBeInTheDocument();
    expect(screen.getByText('Tebrikler!')).toBeInTheDocument();
  });

  it('should not render CelebrationModal if user is not logged in', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signOut: vi.fn(),
    });
    vi.mocked(useCelebrationStore).mockReturnValue({
      current: {
        id: '1',
        title: 'Tebrikler!',
        description: '',
        variant: 'course',
      },
      isOpen: true,
      close: mockClose,
      queue: [],
      enqueue: vi.fn(),
      next: vi.fn(),
      clear: vi.fn(),
    });

    render(
      <CelebrationProvider>
        <div>Content</div>
      </CelebrationProvider>
    );

    expect(screen.queryByTestId('celebration-modal')).not.toBeInTheDocument();
  });
});
