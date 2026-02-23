import { useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useState } from 'react';
import { AuthModal } from '@/features/auth/components/AuthModal';
import { ROUTES } from '@/utils/routes';
import { usePomodoro } from '@/features/pomodoro/hooks/usePomodoro';
import { useUIStore } from '@/shared/store/useUIStore';

import { BrandSection } from './BrandSection';
import { DesktopNav } from './DesktopNav';
import { MobileNav } from './MobileNav';
import { getNavItems } from './nav-config';

const MOUNTED = true;

export function Header() {
  const { user, signOut } = useAuth();
  const { setProgramOpen, setJourneyOpen } = useUIStore();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const location = useLocation();
  const pathname = location.pathname;
  const { setOpen: setPomodoroOpen } = usePomodoro();

  if (pathname?.startsWith(ROUTES.NOTES)) {
    return null;
  }

  const navItems = getNavItems(setJourneyOpen, setPomodoroOpen, setProgramOpen);
  const filteredNavItems = navItems.filter((item) => !item.auth || user);

  return (
    <header className="relative w-full h-24 border-b border-border/10 bg-transparent shrink-0">
      <div className="container mx-auto h-full px-4 md:px-6 flex items-center justify-between lg:pt-10 gap-4">
        <div className="shrink-0 flex items-center h-full">
          <BrandSection />
        </div>

        <DesktopNav
          user={user}
          pathname={pathname}
          navItems={filteredNavItems}
          signOut={signOut}
          setAuthModalOpen={setAuthModalOpen}
          mounted={MOUNTED}
        />

        {/* MobileNav is already rendered without props, so no change needed here for its usage. */}
        <MobileNav />
      </div>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </header>
  );
}
