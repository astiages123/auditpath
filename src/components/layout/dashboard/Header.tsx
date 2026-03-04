import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUIStore } from '@/shared/store/useUIStore';
import { AuthModal } from '@/features/auth/components/AuthModal';
import { GlobalBreadcrumb } from '@/shared/components/GlobalBreadcrumb';
import { SyncButton } from '@/shared/components/SyncButton';
import { Button } from '@/components/ui/button';
import { LogOut, PanelsTopLeft, Banknote } from 'lucide-react';
import { ROUTES } from '@/utils/routes';
import logo from '@/assets/logo.svg';

export function DashHeader() {
  // === HOOKS ===
  const { user, signOut } = useAuth();
  const { setMobileMenuOpen } = useUIStore();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // === RENDER ===
  return (
    <header className="h-16 lg:h-20 flex items-center justify-between px-4 lg:px-5 border-b border-accent/15 bg-background/80 backdrop-blur-sm shrink-0">
      {/* Sol: Logo (Mobile) + Breadcrumb (Desktop) */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Mobil Logo */}
        <Link
          to={ROUTES.HOME}
          className="lg:hidden shrink-0 flex items-center gap-2"
        >
          <img src={logo} alt="Audit Path" className="size-8 object-contain" />
          <span className="text-lg font-heading font-bold tracking-tight text-foreground">
            Audit Path
          </span>
        </Link>

        {/* Desktop Breadcrumb */}
        <div className="hidden lg:block min-w-0">
          <GlobalBreadcrumb />
        </div>
      </div>

      {/* Sağ: Desktop Actions + Desktop User + Mobil Hamburger */}
      <div className="flex items-center gap-1 shrink-0">
        {user ? (
          <>
            {/* Desktop Aksiyon Butonları */}
            <div className="hidden lg:flex items-center gap-0.5">
              <SyncButton showLabel={false} iconClassName="text-primary/80" />

              <Link to={ROUTES.COSTS}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 rounded-full hover:bg-transparent hover:scale-110 transition-transform"
                  title="Harcama Analizi"
                >
                  <Banknote className="size-6 text-primary/80" />
                </Button>
              </Link>
            </div>

            <div className="h-6 w-px bg-border/30 mx-1.5 hidden lg:block" />

            {/* User Profile (First Name + Logout) */}
            <div className="flex items-center gap-2 pl-2">
              <span className="text-sm font-semibold text-foreground truncate max-w-[80px] sm:max-w-[120px]">
                {user.user_metadata?.full_name?.split(' ')[0] || 'Kullanıcı'}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-primary/80 hover:text-destructive hover:bg-destructive/10 transition-colors"
                onClick={() => signOut()}
                title="Çıkış Yap"
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </>
        ) : (
          <Button
            size="sm"
            variant="default"
            className="rounded-full px-6 shadow-lg shadow-primary/20 active:scale-95 transition-all hidden lg:inline-flex"
            onClick={() => setAuthModalOpen(true)}
          >
            Giriş Yap
          </Button>
        )}

        {/* Mobil Hamburger Trigger */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl bg-secondary/20 hover:bg-secondary/40 text-foreground size-9 lg:hidden shrink-0 ml-2"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Menüyü Aç"
        >
          <PanelsTopLeft className="size-5" />
        </Button>
      </div>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </header>
  );
}
