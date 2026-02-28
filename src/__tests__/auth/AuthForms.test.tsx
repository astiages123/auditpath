// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthForms } from '../../features/auth/components/AuthForms';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('AuthForms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Geçersiz giriş yapıldığında doğrulama hatalarını gösterir', async () => {
    render(<AuthForms />);

    const submitButton = screen.getByRole('button', { name: /Giriş Yap/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Bu alan zorunludur.')).toBeInTheDocument();
      expect(
        screen.getByText('Şifre en az 6 karakter olmalıdır.')
      ).toBeInTheDocument();
    });
  });

  it('2. Kısa kullanıcı adı girildiğinde hata gösterir', async () => {
    render(<AuthForms />);

    const identifierInput = screen.getByLabelText(/Kullanıcı Adı veya Email/i);
    fireEvent.change(identifierInput, { target: { value: 'ab' } });

    const submitButton = screen.getByRole('button', { name: /Giriş Yap/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Kullanıcı adınız en az 3 karakter olmalıdır/i)
      ).toBeInTheDocument();
    });
  });

  it('3. Başarılı email girişi akışını doğru çalıştırır', async () => {
    const onSuccess = vi.fn();
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: { email: 'test@example.com' } as any, session: {} as any },
      error: null,
    });

    render(<AuthForms onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/Kullanıcı Adı veya Email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Şifre/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Giriş Yap/i }));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(toast.success).toHaveBeenCalledWith('Giriş başarılı!');
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('4. Başarılı kullanıcı adı girişi akışını (RPC ile) doğru çalıştırır', async () => {
    const onSuccess = vi.fn();
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: 'test@example.com',
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as any);
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: { email: 'test@example.com' } as any, session: {} as any },
      error: null,
    });

    render(<AuthForms onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText(/Kullanıcı Adı veya Email/i), {
      target: { value: 'testuser' },
    });
    fireEvent.change(screen.getByLabelText(/Şifre/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Giriş Yap/i }));

    await waitFor(() => {
      expect(supabase.rpc).toHaveBeenCalledWith('get_email_by_username', {
        username_input: 'testuser',
      });
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('5. Hatalı girişte uygun hata mesajını gösterir', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: null, user: null },
      error: {
        message: 'E-posta veya şifre hatalı.',
        name: 'AuthApiError',
        status: 400,
      } as any,
    });

    render(<AuthForms />);

    fireEvent.change(screen.getByLabelText(/Kullanıcı Adı veya Email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/Şifre/i), {
      target: { value: 'wrongpassword' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Giriş Yap/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/./));
    });
  });
});
