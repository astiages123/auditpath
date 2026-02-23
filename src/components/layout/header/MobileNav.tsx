import { FC } from 'react';
import { Button } from '@/components/ui/button';
import { PanelsTopLeft } from 'lucide-react';
import { useUIStore } from '@/shared/store/useUIStore';

export const MobileNav: FC = () => {
  const setMobileMenuOpen = useUIStore((state) => state.setMobileMenuOpen);

  return (
    <div className="flex lg:hidden items-center shrink-0">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-xl bg-secondary/20 hover:bg-secondary/40 text-foreground size-11"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Menüyü Aç"
      >
        <PanelsTopLeft className="size-6" />
      </Button>
    </div>
  );
};
