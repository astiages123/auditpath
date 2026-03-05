// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const {
  mockInvokeNotionSync,
  mockToastInfo,
  mockToastSuccess,
  mockToastError,
  mockToastDismiss,
} = vi.hoisted(() => ({
  mockInvokeNotionSync: vi.fn(),
  mockToastInfo: vi.fn(() => 'toast-1'),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  mockToastDismiss: vi.fn(),
}));

vi.mock('@/features/notes/services/noteService', () => ({
  invokeNotionSync: mockInvokeNotionSync,
}));

vi.mock('@/features/courses/hooks/useCategories', () => ({
  useCategories: () => ({
    data: [{ id: 'cat-1', name: 'Category' }],
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    info: mockToastInfo,
    success: mockToastSuccess,
    error: mockToastError,
    dismiss: mockToastDismiss,
  },
}));

import { SyncButton } from '@/shared/components/SyncButton';

describe('SyncButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading feedback and a fresh state message when nothing changed', async () => {
    mockInvokeNotionSync.mockResolvedValue({
      success: true,
      stats: { synced: 0, deleted: 0, skipped: 0, errors: 0 },
    });

    const user = userEvent.setup();
    render(<SyncButton />);

    await user.click(
      screen.getByRole('button', { name: /not senkronizasyonu/i })
    );

    expect(mockToastInfo).toHaveBeenCalledWith('Senkronizasyon Başlatıldı', {
      description: 'Notion notları kontrol ediliyor...',
      duration: Infinity,
      icon: expect.anything(),
    });

    await waitFor(() => {
      expect(mockToastDismiss).toHaveBeenCalledWith('toast-1');
      expect(mockToastSuccess).toHaveBeenCalledWith('Her Şey Güncel', {
        description: "Notion'da yeni veya değiştirilmiş bir not bulunamadı.",
        duration: 4000,
      });
    });
  });

  it('shows success feedback for synced notes', async () => {
    mockInvokeNotionSync.mockResolvedValue({
      success: true,
      stats: { synced: 3, deleted: 0, skipped: 0, errors: 0 },
    });

    const user = userEvent.setup();
    render(<SyncButton />);

    await user.click(
      screen.getByRole('button', { name: /not senkronizasyonu/i })
    );

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Senkronizasyon Tamamlandı',
        {
          description: '3 not güncellendi.',
          duration: 5000,
        }
      );
    });
  });

  it('shows partial success feedback when sync completes with errors', async () => {
    mockInvokeNotionSync.mockResolvedValue({
      success: true,
      stats: { synced: 2, deleted: 0, skipped: 0, errors: 1 },
    });

    const user = userEvent.setup();
    render(<SyncButton />);

    await user.click(
      screen.getByRole('button', { name: /not senkronizasyonu/i })
    );

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Senkronizasyon Tamamlandı',
        {
          description:
            '2 not güncellendi, 1 hata oluştu. Logları kontrol edin.',
          duration: 5000,
        }
      );
    });
  });

  it('shows error feedback and prevents duplicate sync requests while pending', async () => {
    let resolveSync:
      | ((value: {
          success: boolean;
          stats: {
            synced: number;
            deleted: number;
            skipped: number;
            errors: number;
          };
        }) => void)
      | undefined;
    mockInvokeNotionSync.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSync = resolve;
        })
    );

    const user = userEvent.setup();
    render(<SyncButton />);

    const button = screen.getByRole('button', {
      name: /not senkronizasyonu/i,
    });

    await user.click(button);
    expect(button).toBeDisabled();

    await user.click(button);
    expect(mockInvokeNotionSync).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSync?.({
        success: true,
        stats: { synced: 1, deleted: 0, skipped: 0, errors: 0 },
      });
    });
  });

  it('shows error toast when the sync request fails and re-enables the button', async () => {
    mockInvokeNotionSync.mockRejectedValue(new Error('Senkronizasyon patladı'));

    const user = userEvent.setup();
    render(<SyncButton />);

    const button = screen.getByRole('button', {
      name: /not senkronizasyonu/i,
    });

    await user.click(button);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Senkronizasyon Başarısız', {
        description: 'Senkronizasyon patladı',
      });
      expect(button).not.toBeDisabled();
    });
  });
});
