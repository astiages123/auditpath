import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
// import { useProgress } from "@/hooks/use-progress";
import {
  BookCheck,
  ChartScatter,
  LineSquiggle,
  Menu,
  X,
  CalendarDays,
  Trophy,
  ChevronDown,
  LogOut,
  Sparkles,
  Timer,
} from 'lucide-react';
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
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProgramModal } from '@/features/courses/components/ProgramModal';
import { JourneyModal } from '@/features/courses/components/JourneyModal';
import { AuthModal } from '@/features/auth/components/AuthModal';
import { cn } from '@/utils/core';
import { ROUTES } from '@/utils/routes';
import { usePomodoro } from '@/features/pomodoro/hooks';
import logo from '@/assets/logo.svg';

export function Header() {
  const { user, signOut } = useAuth();
  // const { stats } = useProgress(); // Unused
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [programOpen, setProgramOpen] = useState(false);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mounted] = useState(true); // Assuming SPA, no hydration mismatch
  const location = useLocation();
  const pathname = location.pathname;

  // Use the global Pomodoro hook to control the modal
  const { setOpen: setPomodoroOpen } = usePomodoro();

  // useEffect(() => {
  //   setMounted(true);
  // }, []);

  if (pathname?.startsWith(ROUTES.NOTES)) {
    return null;
  }

  const navItems = [
    {
      label: 'Eğitim',
      href: ROUTES.COURSES,
      icon: BookCheck,
      color: 'text-amber-500',
      auth: true,
    },
    {
      label: 'İstatistikler',
      href: ROUTES.EFFICIENCY,
      icon: ChartScatter,
      color: 'text-blue-500',
      auth: true,
    },
    {
      label: 'Yolculuk',
      action: () => setJourneyOpen(true),
      icon: LineSquiggle,
      color: 'text-emerald-500',
      auth: true,
    },
    {
      label: 'Başarımlar',
      href: ROUTES.ACHIEVEMENTS,
      icon: Trophy,
      color: 'text-yellow-500',
      auth: true,
    },
    {
      label: 'Kronometre',
      action: () => setPomodoroOpen(true),
      icon: Timer,
      color: 'text-rose-500',
      auth: true,
    },
    {
      label: 'Program',
      action: () => setProgramOpen(true),
      icon: CalendarDays,
      color: 'text-purple-500',
      auth: true,
    },
  ];

  const filteredNavItems = navItems.filter((item) => !item.auth || user);

  return (
    <header className="relative w-full h-24 border-b border-border/10 bg-transparent">
      <div className="container mx-auto h-full px-4 md:px-6 flex items-center justify-between pt-10">
        {/* Brand Section */}
        <Link
          to={ROUTES.HOME}
          className="group flex items-center gap-4 transition-all duration-200 active:scale-95 px-2 py-1 rounded-2xl hover:bg-white/5"
        >
          <div className="relative flex h-14 w-14 items-center justify-center transition-all">
            <img
              src={logo}
              alt="AuditPath Logo"
              width={56}
              height={56}
              className="object-contain group-hover:scale-110 group-hover:rotate-3 transition-all duration-300"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-xl md:text-2xl font-heading font-bold tracking-tight bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              Audit Path
            </span>
            <span className="text-[10px] md:text-[12px] uppercase tracking-normal font-bold text-primary/80 leading-none mt-1">
              BİLGELİK AKADEMİSİ
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-2">
          {user && (
            <>
              <nav className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/30 border border-border/20 backdrop-blur-sm">
                {filteredNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  if (item.action) {
                    return (
                      <Button
                        key={item.label}
                        variant="ghost"
                        size="sm"
                        onClick={item.action}
                        className="h-9 gap-2 rounded-full hover:bg-background/50 hover:text-foreground text-muted-foreground transition-all"
                      >
                        <Icon className={cn('h-4 w-4', item.color)} />
                        <span className="text-sm font-medium">
                          {item.label}
                        </span>
                      </Button>
                    );
                  }

                  return (
                    <Link key={item.label} to={item.href!}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          'h-9 gap-2 rounded-full transition-all relative overflow-hidden group',
                          isActive
                            ? 'bg-primary/10 text-primary hover:bg-primary/20'
                            : 'hover:bg-background/50 hover:text-foreground text-muted-foreground'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4',
                            isActive
                              ? 'text-primary transition-colors'
                              : item.color
                          )}
                        />
                        <span className="text-sm font-medium z-10">
                          {item.label}
                        </span>
                        {isActive && (
                          <motion.div
                            layoutId="nav-pill"
                            className="absolute inset-0 bg-primary/5 rounded-full"
                            transition={{
                              type: 'spring',
                              bounce: 0.2,
                              duration: 0.6,
                            }}
                          />
                        )}
                      </Button>
                    </Link>
                  );
                })}
              </nav>

              <div className="h-6 w-px bg-border/40 mx-2" />
            </>
          )}

          {/* Desktop User Section */}
          {mounted && (
            <div className="flex items-center">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-10 pl-1 pr-2 py-1 gap-2.5 rounded-full hover:bg-accent/50 border border-transparent hover:border-border/40 transition-all"
                    >
                      <Avatar className="h-8 w-8 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
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
                        <div className="flex items-center gap-1">
                          <Sparkles className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                            PRO
                          </span>
                        </div>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-80 p-2 rounded-2xl shadow-xl border-border/40 backdrop-blur-xl"
                  >
                    <DropdownMenuLabel className="px-3 py-2 flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-1 ring-border">
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
                    <DropdownMenuItem
                      asChild
                      className="rounded-xl px-3 py-2.5 gap-3 cursor-pointer focus:bg-accent/50"
                    >
                      <Link to={ROUTES.ANALYTICS}>
                        <ChartScatter className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">Harcama Analizi</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1 opacity-50" />
                    <DropdownMenuItem
                      onClick={() => signOut()}
                      className="rounded-xl px-3 py-2.5 gap-3 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="font-medium">Güvenli Çıkış</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex lg:hidden items-center gap-2">
          {user && (
            <Avatar className="h-8 w-8 ring-2 ring-primary/10 mr-1">
              <AvatarImage
                src={user.user_metadata?.avatar_url}
                alt="User"
                className="object-cover"
                referrerPolicy="no-referrer"
              />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {user.user_metadata?.full_name?.slice(0, 2).toUpperCase() ||
                  'U'}
              </AvatarFallback>
            </Avatar>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-secondary/40 hover:bg-secondary/60"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Menüyü Kapat' : 'Menüyü Aç'}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0 }}
            className="lg:hidden border-t border-border/40 bg-background/95 backdrop-blur-2xl overflow-hidden shadow-2xl"
          >
            <div className="container mx-auto px-4 py-6 flex flex-col gap-6">
              <nav className="flex flex-col gap-2">
                {filteredNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.action ? (
                        <Button
                          variant="ghost"
                          onClick={item.action}
                          className="w-full justify-start gap-4 h-12 rounded-xl text-base font-medium"
                        >
                          <div
                            className={cn(
                              'p-2 rounded-lg bg-secondary/50',
                              item.color
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          {item.label}
                        </Button>
                      ) : (
                        <Link to={item.href!}>
                          <Button
                            variant={isActive ? 'secondary' : 'ghost'}
                            className={cn(
                              'w-full justify-start gap-4 h-12 rounded-xl text-base font-medium',
                              isActive &&
                                'bg-primary/10 text-primary border-primary/20'
                            )}
                          >
                            <div
                              className={cn(
                                'p-2 rounded-lg bg-secondary/50',
                                isActive ? 'text-primary' : item.color
                              )}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            {item.label}
                          </Button>
                        </Link>
                      )}
                    </div>
                  );
                })}
              </nav>

              <div className="h-px bg-border/40" />

              <div className="space-y-4">
                {user ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-4 p-3 rounded-2xl bg-secondary/30">
                      <Avatar className="h-12 w-12 shadow-inner ring-2 ring-primary/10">
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
                        <span className="font-bold">
                          {user.user_metadata?.full_name || 'Öğrenci'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full h-12 rounded-xl gap-3 text-destructive hover:bg-destructive/5 border-destructive/20"
                      onClick={() => {
                        signOut();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      Çıkış Yap
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full h-12 rounded-xl shadow-lg shadow-primary/20"
                    onClick={() => {
                      setAuthModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                  >
                    Giriş Yap
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProgramModal open={programOpen} onOpenChange={setProgramOpen} />
      <JourneyModal open={journeyOpen} onOpenChange={setJourneyOpen} />
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </header>
  );
}
