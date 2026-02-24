import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUIStore } from '@/shared/store/useUIStore';
import { AuthModal } from '@/features/auth/components/AuthModal';
import { GlobalBreadcrumb } from '@/shared/components/GlobalBreadcrumb';
import { SyncButton } from '@/features/notes/components/SyncButton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronDown, LogOut, PanelsTopLeft, Banknote } from 'lucide-react';
import { ROUTES } from '@/utils/routes';

export function DashHeader() {
  const { user, signOut } = useAuth();
  const { setMobileMenuOpen } = useUIStore();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <header className="h-20 flex items-center justify-between px-5 border-b border-accent/15 bg-background/80 backdrop-blur-sm shrink-0">
      {/* Sol: Breadcrumb + Mobil hamburger */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Mobil hamburger trigger */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl bg-secondary/20 hover:bg-secondary/40 text-foreground size-10 lg:hidden shrink-0"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Menüyü Aç"
        >
          <PanelsTopLeft className="size-5" />
        </Button>
        <div className="hidden lg:block min-w-0">
          <GlobalBreadcrumb />
        </div>
      </div>

      {/* Sağ: Aksiyonlar + User */}
      <div className="flex items-center gap-1 shrink-0">
        {user ? (
          <>
            {/* Aksiyon Butonları */}
            <div className="hidden lg:flex items-center gap-0.5">
              <SyncButton showLabel={false} />

              <Link to={ROUTES.COSTS}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 rounded-full hover:bg-transparent hover:scale-110 transition-transform"
                  title="Harcama Analizi"
                >
                  <Banknote className="size-6 text-emerald-400" />
                </Button>
              </Link>
            </div>

            <div className="h-6 w-px bg-border/30 mx-1.5 hidden lg:block" />

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 pl-1 pr-2 py-1 gap-2 rounded-full hover:bg-accent/50 border border-transparent hover:border-border/40 transition-all"
                >
                  <Avatar className="size-8 ring-2 ring-primary/20 transition-all">
                    <AvatarImage
                      src={user.user_metadata?.avatar_url}
                      alt={user.user_metadata?.full_name || 'User'}
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {user.user_metadata?.full_name
                        ?.slice(0, 2)
                        .toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden xl:flex flex-col items-start leading-tight">
                    <span className="text-sm font-semibold truncate max-w-[100px]">
                      {user.user_metadata?.full_name?.split(' ')[0] ||
                        'Öğrenci'}
                    </span>
                  </div>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-80 p-2 rounded-2xl shadow-xl border-border/40 backdrop-blur-xl"
              >
                <DropdownMenuLabel className="px-3 py-2 flex items-center gap-3">
                  <Avatar className="size-10 ring-1 ring-border">
                    <AvatarImage
                      src={user.user_metadata?.avatar_url}
                      alt="Avatar"
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {user.user_metadata?.full_name
                        ?.slice(0, 2)
                        .toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold truncate">
                      {user.user_metadata?.full_name || 'Kullanıcı'}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1 opacity-50" />
                <DropdownMenuItem
                  onClick={() => signOut()}
                  className="rounded-xl px-3 py-2.5 gap-3 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="size-4" />
                  <span className="font-medium text-white">Güvenli Çıkış</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <Button
            size="sm"
            variant="default"
            className="rounded-full px-6 shadow-lg shadow-primary/20 active:scale-95 transition-all"
            onClick={() => setAuthModalOpen(true)}
          >
            Giriş Yap
          </Button>
        )}
      </div>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </header>
  );
}
