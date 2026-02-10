import { useAuth } from '@/features/auth';
import { AuthModal } from './AuthModal';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const [showModal, setShowModal] = useState(false);

  // Auto-open removed as per requirement
  // useEffect(() => {
  //     if (!loading && !user) {
  //         setShowModal(true);
  //     }
  // }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Yükleniyor...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-8 h-8 text-primary"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Oturum Açmanız Gerekiyor</h1>
          <p className="text-muted-foreground">
            Bu sayfaya erişmek için lütfen giriş yapın veya kayıt olun.
            İlerlermenizi kaydetmek ve istatistiklerinizi görmek için hesabınız
            olmalıdır.
          </p>
          <Button
            onClick={() => setShowModal(true)}
            size="lg"
            className="w-full"
          >
            Giriş Yap
          </Button>
        </div>
        <AuthModal open={showModal} onOpenChange={setShowModal} />
      </div>
    );
  }

  return <>{children}</>;
}
