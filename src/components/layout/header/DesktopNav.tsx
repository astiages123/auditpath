import { FC, ElementType } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import { ChevronDown, LogOut, HandCoins } from 'lucide-react';
import { cn } from '@/utils/stringHelpers';
import { ROUTES } from '@/utils/routes';
import { SyncButton } from '@/features/notes/components/SyncButton';

interface DesktopNavProps {
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
  signOut: () => void;
  setAuthModalOpen: (open: boolean) => void;
  mounted: boolean;
}

export const DesktopNav: FC<DesktopNavProps> = ({
  user,
  pathname,
  navItems,
  signOut,
  setAuthModalOpen,
  mounted,
}) => {
  return (
    <div className="hidden lg:flex items-center w-full justify-between gap-2">
      {user ? (
        <div className="flex items-center gap-2 ml-auto mr-1">
          <nav className="flex items-center gap-1.5 px-5 py-1.5 rounded-full bg-secondary/30 border border-border/20 backdrop-blur-sm">
            {navItems.map((item) => {
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
                    <Icon className={cn('size-4', item.color)} />
                    <span className="text-sm font-medium">{item.label}</span>
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
                        'size-4',
                        isActive ? 'text-primary transition-colors' : item.color
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

          <div className="h-8 w-px bg-border/40 mx-2" />

          <div className="flex items-center -space-x-2">
            <Link to={ROUTES.ANALYTICS}>
              <Button
                variant="ghost"
                size="icon"
                className="size-10 rounded-full hover:bg-transparent hover:scale-110 transition-transform"
                title="Harcama Analizi"
              >
                <HandCoins className="size-5 text-emerald-300" />
              </Button>
            </Link>
            <SyncButton showLabel={false} />
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {mounted && (
        <div className="flex items-center">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 pl-1 pr-2 py-1 gap-2 rounded-full hover:bg-accent/50 border border-transparent hover:border-border/40 transition-all"
                >
                  <Avatar className="size-8 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
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
  );
};
