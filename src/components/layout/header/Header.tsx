import { useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useState } from 'react';
import { ProgramModal } from '@/features/courses/components/ProgramModal';
import { JourneyModal } from '@/features/courses/components/JourneyModal';
import { AuthModal } from '@/features/auth/components/AuthModal';
import { ROUTES } from '@/utils/routes';
import { usePomodoro } from '@/features/pomodoro/hooks';

import { BrandSection } from './BrandSection';
import { DesktopNav } from './DesktopNav';
import { MobileNav } from './MobileNav';
import { getNavItems } from './navConfig';

export function Header() {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [programOpen, setProgramOpen] = useState(false);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mounted] = useState(true);
  const location = useLocation();
  const pathname = location.pathname;

  const { setOpen: setPomodoroOpen } = usePomodoro();

  if (pathname?.startsWith(ROUTES.NOTES)) {
    return null;
  }

  const navItems = getNavItems(setJourneyOpen, setPomodoroOpen, setProgramOpen);
  const filteredNavItems = navItems.filter((item) => !item.auth || user);

  return (
    <header className="relative w-full h-24 border-b border-border/10 bg-transparent">
      <div className="container mx-auto h-full px-4 md:px-6 flex items-center justify-between pt-10">
        <BrandSection />

        <DesktopNav
          user={user}
          pathname={pathname}
          navItems={filteredNavItems}
          signOut={signOut}
          setAuthModalOpen={setAuthModalOpen}
          mounted={mounted}
        />

        <MobileNav
          user={user}
          pathname={pathname}
          navItems={filteredNavItems}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          signOut={signOut}
          setAuthModalOpen={setAuthModalOpen}
        />
      </div>

      <ProgramModal open={programOpen} onOpenChange={setProgramOpen} />
      <JourneyModal open={journeyOpen} onOpenChange={setJourneyOpen} />
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </header>
  );
}
