import { FC } from 'react';
import {
  X,
  Home,
  LineSquiggle,
  Trophy,
  TrendingUp,
  Timer,
  CalendarDays,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUIStore } from '@/shared/store/useUIStore';
import { usePomodoro } from '@/features/pomodoro/hooks/usePomodoro';
import { cn } from '@/utils/stringHelpers';
import { Link, useLocation } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/utils/routes';
import { SyncButton } from '@/features/notes/components/SyncButton';

export const MobileSidebar: FC = () => {
  const { user, signOut } = useAuth();
  const { setMobileMenuOpen, setProgramOpen, setJourneyOpen } = useUIStore();
  const { setOpen: setPomodoroOpen } = usePomodoro();
  const location = useLocation();
  const pathname = location.pathname;

  const sidebarLinks: {
    label: string;
    href?: string;
    action?: () => void;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { label: 'Ana Sayfa', href: ROUTES.HOME, icon: Home },
    {
      label: 'Yolculuk',
      action: () => {
        setMobileMenuOpen(false);
        setTimeout(() => setJourneyOpen(true), 500);
      },
      icon: LineSquiggle,
    },
    { label: 'Başarımlar', href: ROUTES.ACHIEVEMENTS, icon: Trophy },
    { label: 'İstatistikler', href: ROUTES.EFFICIENCY, icon: TrendingUp },
    {
      label: 'Kronometre',
      action: () => {
        setMobileMenuOpen(false);
        setTimeout(() => setPomodoroOpen(true), 500);
      },
      icon: Timer,
    },
    {
      label: 'Program',
      action: () => {
        setMobileMenuOpen(false);
        setTimeout(() => setProgramOpen(true), 500);
      },
      icon: CalendarDays,
    },
  ];

  return (
    <div className="fixed inset-0 bg-[#0a0a0b] z-0 block lg:hidden overflow-hidden">
      <div className="flex flex-col h-full h-[100dvh] w-[70vw] p-8 pt-16 ml-auto">
        {/* Close Button UI */}
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="absolute top-6 right-6 p-2 rounded-full bg-white/5 text-white/40 hover:text-white transition-colors"
        >
          <X className="size-6" />
        </button>

        {/* Profile Section */}
        <div className="flex flex-col items-start gap-4 mb-12">
          <Avatar className="size-16 ring-4 ring-primary/10 border-2 border-primary/20 shadow-2xl">
            <AvatarImage
              src={user?.user_metadata?.avatar_url}
              alt="Avatar"
              className="object-cover"
              referrerPolicy="no-referrer"
            />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
              {user?.user_metadata?.full_name?.slice(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h3 className="text-xl font-black text-white leading-tight">
              {user?.user_metadata?.full_name || 'Misafir'}
            </h3>
            <p className="text-sm text-white/40 font-medium truncate max-w-[50vw]">
              {user?.email || 'Giriş yapılmamış'}
            </p>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex flex-col gap-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
          {sidebarLinks.map((item) => {
            const isActive = item.href ? pathname === item.href : false;
            const Icon = item.icon;

            const content = (
              <div
                className={cn(
                  'flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span className="font-bold text-base tracking-tight">
                  {item.label}
                </span>
              </div>
            );

            if (item.href) {
              return (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {content}
                </Link>
              );
            }

            if (item.action) {
              return (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="text-left w-full"
                >
                  {content}
                </button>
              );
            }

            return (
              <div key={item.label} className="cursor-not-allowed opacity-50">
                {content}
              </div>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="mt-8">
          {user ? (
            <>
              <SyncButton
                onSyncComplete={() => setMobileMenuOpen(false)}
                className="text-white/50 hover:bg-white/5"
              />
              <Button
                variant="ghost"
                className="w-full justify-start gap-4 h-14 rounded-2xl text-white/50 hover:text-destructive hover:bg-destructive/5 font-bold"
                onClick={() => {
                  signOut();
                  setMobileMenuOpen(false);
                }}
              >
                <LogOut className="size-5" />
                Çıkış Yap
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 text-white/70"
              onClick={() => setMobileMenuOpen(false)}
            >
              Vazgeç
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
