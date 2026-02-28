// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuthProvider } from '@/features/auth/components/AuthProvider';
import { getSupabase } from '@/lib/supabase';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  getSupabase: vi.fn(),
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

// Test Page Components
const LoginPage = () => {
  const navigate = useNavigate();
  const handleLogin = () => {
    // In real app, this is handled by AuthProvider/Forms
    navigate('/dashboard');
  };
  return (
    <div>
      <h1>Login Page</h1>
      <button onClick={handleLogin}>Log In</button>
    </div>
  );
};

const DashboardPage = () => {
  return (
    <div>
      <h1>Dashboard Page</h1>
      <p>Welcome to AuditPath</p>
    </div>
  );
};

describe('User Flow Integration', () => {
  const mockSupabase = {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(getSupabase).mockReturnValue(mockSupabase as any);
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  it('1. Kullanıcı başarılı bir şekilde login olup dashboarda yönlendirilir', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Başlangıçta login sayfasında olduğumuzu doğrula
    expect(screen.getByText('Login Page')).toBeInTheDocument();

    // Login butonuna bas
    fireEvent.click(screen.getByText('Log In'));

    // Dashboard'a yönlendirildiğimizi doğrula
    await waitFor(() => {
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
      expect(screen.getByText('Welcome to AuditPath')).toBeInTheDocument();
    });
  });
});
