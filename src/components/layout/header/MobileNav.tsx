import { FC, ElementType } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Menu, X, LogOut } from 'lucide-react';
import { cn } from '@/utils/stringHelpers';

interface MobileNavProps {
  user: {
    user_metadata: { avatar_url?: string; full_name?: string };
    email?: string;
  } | null;
  pathname: string;
  navItems: {
    label: string;
    href?: string;
    action?: () => void;
    icon: ElementType;
    color: string;
    auth: boolean;
  }[];
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  signOut: () => void;
  setAuthModalOpen: (open: boolean) => void;
}

export const MobileNav: FC<MobileNavProps> = ({
  user,
  pathname,
  navItems,
  mobileMenuOpen,
  setMobileMenuOpen,
  signOut,
  setAuthModalOpen,
}) => {
  return (
    <>
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
              {user.user_metadata?.full_name?.slice(0, 2).toUpperCase() || 'U'}
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
                {navItems.map((item) => {
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
    </>
  );
};
