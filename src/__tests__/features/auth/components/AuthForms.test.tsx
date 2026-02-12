import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuthForms } from '@/features/auth/components/AuthForms';
import '@testing-library/jest-dom/vitest';

// Mock Supabase
const mockSignInWithPassword = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/shared/lib/core/supabase', () => ({
  getSupabase: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
    rpc: mockRpc,
  }),
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AuthForms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Form Rendering', () => {
    it('should render identifier input', () => {
      render(<AuthForms />);

      expect(
        screen.getByLabelText(/kullanıcı adı veya email/i)
      ).toBeInTheDocument();
    });

    it('should render password input', () => {
      render(<AuthForms />);

      expect(screen.getByLabelText(/şifre/i)).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<AuthForms />);

      expect(
        screen.getByRole('button', { name: /giriş yap/i })
      ).toBeInTheDocument();
    });

    it('should have correct input types', () => {
      render(<AuthForms />);

      const identifierInput = screen.getByLabelText(
        /kullanıcı adı veya email/i
      );
      const passwordInput = screen.getByLabelText(/şifre/i);

      expect(identifierInput).toHaveAttribute('type', 'text');
      expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Form Validation', () => {
    it('should show error for empty identifier', async () => {
      render(<AuthForms />);

      const submitButton = screen.getByRole('button', { name: /giriş yap/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/bu alan zorunludur/i)).toBeInTheDocument();
      });
    });

    it('should show error for short password', async () => {
      render(<AuthForms />);

      const identifierInput = screen.getByLabelText(
        /kullanıcı adı veya email/i
      );
      const passwordInput = screen.getByLabelText(/şifre/i);
      const submitButton = screen.getByRole('button', { name: /giriş yap/i });

      fireEvent.change(identifierInput, {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(passwordInput, { target: { value: '12345' } }); // 5 chars, min is 6
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/şifre en az 6 karakter olmalıdır/i)
        ).toBeInTheDocument();
      });
    });

    it('should show error for invalid email format when too short', async () => {
      render(<AuthForms />);

      const identifierInput = screen.getByLabelText(
        /kullanıcı adı veya email/i
      );
      const passwordInput = screen.getByLabelText(/şifre/i);
      const submitButton = screen.getByRole('button', { name: /giriş yap/i });

      // Not an email and too short for username (min 3 chars)
      fireEvent.change(identifierInput, { target: { value: 'ab' } });
      fireEvent.change(passwordInput, { target: { value: '123456' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            /geçerli bir e-posta girin veya kullanıcı adınız en az 3 karakter olmalıdır/i
          )
        ).toBeInTheDocument();
      });
    });

    it('should not show error for valid email', async () => {
      render(<AuthForms />);

      const identifierInput = screen.getByLabelText(
        /kullanıcı adı veya email/i
      );
      const passwordInput = screen.getByLabelText(/şifre/i);
      const submitButton = screen.getByRole('button', { name: /giriş yap/i });

      fireEvent.change(identifierInput, {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(passwordInput, { target: { value: '123456' } });
      fireEvent.click(submitButton);

      // Should not show validation errors
      await waitFor(() => {
        expect(
          screen.queryByText(/bu alan zorunludur/i)
        ).not.toBeInTheDocument();
      });
    });

    it('should not show error for valid username (3+ chars)', async () => {
      render(<AuthForms />);

      const identifierInput = screen.getByLabelText(
        /kullanıcı adı veya email/i
      );
      const passwordInput = screen.getByLabelText(/şifre/i);
      const submitButton = screen.getByRole('button', { name: /giriş yap/i });

      fireEvent.change(identifierInput, { target: { value: 'testuser' } });
      fireEvent.change(passwordInput, { target: { value: '123456' } });
      fireEvent.click(submitButton);

      // Should not show validation errors
      await waitFor(() => {
        expect(
          screen.queryByText(/geçerli bir e-posta/i)
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call signInWithPassword with email', async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });

      render(<AuthForms />);

      const identifierInput = screen.getByLabelText(
        /kullanıcı adı veya email/i
      );
      const passwordInput = screen.getByLabelText(/şifre/i);
      const submitButton = screen.getByRole('button', { name: /giriş yap/i });

      fireEvent.change(identifierInput, {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });
    });

    it('should look up email when username is provided', async () => {
      mockRpc.mockResolvedValue({ data: 'user@example.com', error: null });
      mockSignInWithPassword.mockResolvedValue({ error: null });

      render(<AuthForms />);

      const identifierInput = screen.getByLabelText(
        /kullanıcı adı veya email/i
      );
      const passwordInput = screen.getByLabelText(/şifre/i);
      const submitButton = screen.getByRole('button', { name: /giriş yap/i });

      fireEvent.change(identifierInput, { target: { value: 'testuser' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('get_email_by_username', {
          username_input: 'testuser',
        });
      });

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: 'password123',
        });
      });
    });

    it('should show error when username not found', async () => {
      const { toast } = await import('sonner');
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      render(<AuthForms />);

      const identifierInput = screen.getByLabelText(
        /kullanıcı adı veya email/i
      );
      const passwordInput = screen.getByLabelText(/şifre/i);
      const submitButton = screen.getByRole('button', { name: /giriş yap/i });

      fireEvent.change(identifierInput, { target: { value: 'unknownuser' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Kullanıcı bulunamadı.');
      });
    });

    it('should call onSuccess after successful login', async () => {
      const { toast } = await import('sonner');
      mockSignInWithPassword.mockResolvedValue({ error: null });
      const onSuccess = vi.fn();

      render(<AuthForms onSuccess={onSuccess} />);

      const identifierInput = screen.getByLabelText(
        /kullanıcı adı veya email/i
      );
      const passwordInput = screen.getByLabelText(/şifre/i);
      const submitButton = screen.getByRole('button', { name: /giriş yap/i });

      fireEvent.change(identifierInput, {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Giriş başarılı!');
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should show error toast on auth failure', async () => {
      const { toast } = await import('sonner');
      mockSignInWithPassword.mockResolvedValue({
        error: { message: 'Invalid credentials' },
      });

      render(<AuthForms />);

      const identifierInput = screen.getByLabelText(
        /kullanıcı adı veya email/i
      );
      const passwordInput = screen.getByLabelText(/şifre/i);
      const submitButton = screen.getByRole('button', { name: /giriş yap/i });

      fireEvent.change(identifierInput, {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        // The component shows a generic error message when auth fails
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('should disable submit button while submitting', async () => {
      mockSignInWithPassword.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<AuthForms />);

      const identifierInput = screen.getByLabelText(
        /kullanıcı adı veya email/i
      );
      const passwordInput = screen.getByLabelText(/şifre/i);
      const submitButton = screen.getByRole('button', { name: /giriş yap/i });

      fireEvent.change(identifierInput, {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      // Button should be disabled during submission
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });
});
