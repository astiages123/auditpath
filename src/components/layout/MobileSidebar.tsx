import { FC } from 'react';
import { LogOut, Banknote } from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUIStore } from '@/shared/store/useUIStore';
import { usePomodoro } from '@/features/pomodoro/hooks/usePomodoro';
import { cn } from '@/utils/stringHelpers';
import { Link, useLocation } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/utils/routes';
import { SyncButton } from '@/features/notes/components/SyncButton';
import { getNavItemsByGroup, NAV_GROUP_LABELS } from './dashboard/nav-config';
import type { NavItem } from './dashboard/nav-config';

const GROUP_ORDER: NavItem['group'][] = ['navigation', 'action', 'meta'];

export const MobileSidebar: FC = () => {
  const { user, signOut } = useAuth();
  const { setMobileMenuOpen, setProgramOpen } = useUIStore();
  const { setOpen: setPomodoroOpen } = usePomodoro();
  const location = useLocation();
  const pathname = location.pathname;

  const groupedItems = getNavItemsByGroup();

  const handleAction = (action: string) => {
    setMobileMenuOpen(false);
    setTimeout(() => {
      if (action === 'pomodoro') {
        setPomodoroOpen(true);
      } else if (action === 'program') {
        setProgramOpen(true);
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-0 block lg:hidden overflow-hidden">
      {/* Background Gradient Effect */}
      <div className="absolute inset-0 bg-linear-to-b from-primary/10 via-transparent to-transparent opacity-30 pointer-events-none" />

      <div className="relative flex flex-col h-full h-[100dvh] w-[75vw] min-w-[280px] p-6 pt-12 ml-auto border-l border-accent/15 bg-background shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
        {/* Profile Section */}
        <div className="flex items-center gap-4 mb-10 px-2 mt-4">
          <Avatar className="size-14 ring-4 ring-primary/10 border border-primary/20 shadow-2xl">
            <AvatarImage
              src={user?.user_metadata?.avatar_url}
              alt="Avatar"
              className="object-cover"
              referrerPolicy="no-referrer"
            />
            <AvatarFallback className="bg-primary/20 text-primary font-black text-lg">
              {user?.user_metadata?.full_name?.slice(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <h3 className="text-xl font-black text-white leading-tight break-words">
              {user?.user_metadata?.full_name || 'Misafir'}
            </h3>
            <p className="text-xs text-white/40 font-bold truncate max-w-[160px]">
              {user?.email || 'Giriş yapılmamış'}
            </p>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex flex-col gap-8 flex-1 overflow-y-auto custom-scrollbar pr-1 pb-6">
          {GROUP_ORDER.map((groupKey) => {
            const items = groupedItems[groupKey].filter(
              (item) => !item.mobileOnly
            );
            if (items.length === 0) return null;

            return (
              <div key={groupKey} className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 px-4 mb-3">
                  {NAV_GROUP_LABELS[groupKey]}
                </p>
                <div className="space-y-1">
                  {items.map((item) => {
                    const isActive = item.href
                      ? item.href === '/'
                        ? pathname === '/'
                        : pathname.startsWith(item.href)
                      : false;
                    const Icon = item.icon;

                    const content = (
                      <div
                        className={cn(
                          'flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group active:scale-[0.98]',
                          isActive
                            ? 'bg-primary/20 text-primary border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.1)]'
                            : 'text-white/70 hover:text-white hover:bg-white/5 border border-transparent'
                        )}
                      >
                        <Icon
                          className={cn(
                            'size-5 shrink-0 transition-colors',
                            isActive ? 'text-primary' : 'group-hover:text-white'
                          )}
                        />
                        <span className="font-bold text-sm tracking-tight">
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

                    return (
                      <button
                        key={item.label}
                        onClick={() => item.action && handleAction(item.action)}
                        className="text-left w-full"
                      >
                        {content}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="mt-auto pt-6 border-t border-accent/15">
          {user ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <SyncButton
                  showLabel={false}
                  onSyncComplete={() => setMobileMenuOpen(false)}
                  className="size-11 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center p-0"
                />
                <Link
                  to={ROUTES.COSTS}
                  onClick={() => setMobileMenuOpen(false)}
                  className="size-11 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white flex items-center justify-center transition-all"
                  title="Harcama Analizi"
                >
                  <Banknote className="size-5" />
                </Link>
                <button
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="size-11 rounded-2xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-destructive flex items-center justify-center transition-all active:scale-90"
                  aria-label="Çıkış Yap"
                >
                  <LogOut className="size-5" />
                </button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl font-black shadow-lg shadow-primary/20 border-white/10 text-white/70"
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
