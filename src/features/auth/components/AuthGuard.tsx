import { Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AuthForms } from '@/features/auth/components/AuthForms';
import { GlobalPageSkeleton } from '@/shared/components/SkeletonTemplates';
import logo from '@/assets/logo.svg';

export function AuthGuard() {
  const { user, loading } = useAuth();

  // Auto-open removed as per requirement
  // useEffect(() => {
  //     if (!loading && !user) {
  //         setShowModal(true);
  //     }
  // }, [user, loading]);

  if (loading) return <GlobalPageSkeleton />;

  if (!user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center relative bg-background overflow-hidden">
        {/* Mesh Gradient Background */}
        <div className="absolute inset-0 w-full h-full bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/20 via-background to-background opacity-60 z-0" />
        <div className="absolute inset-0 w-full h-full bg-[radial-gradient(circle_at_bottom_right,var(--tw-gradient-stops))] from-accent/20 via-background to-background opacity-60 z-0" />

        <div className="w-full max-w-md p-8 relative z-10">
          <div className="backdrop-blur-xl bg-card/40 border border-white/10 shadow-2xl rounded-3xl p-8 md:p-10 relative overflow-hidden">
            <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center space-y-6">
              <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-2 shadow-inner ring-1 ring-white/10">
                <img
                  src={logo}
                  alt="AuditPath Logo"
                  className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-heading font-bold tracking-tight bg-linear-to-br from-white to-white/70 bg-clip-text text-transparent">
                  Tekrar Hoşgeldiniz
                </h1>
                <p className="text-muted-foreground text-sm">
                  Devam etmek için hesabınıza giriş yapın.
                </p>
              </div>
              <div className="w-full pt-4">
                <AuthForms />
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-8 opacity-60">
            &copy; {new Date().getFullYear()} AuditPath. Tüm hakları saklıdır.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
