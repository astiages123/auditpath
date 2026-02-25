import { Link } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useUIStore } from '@/shared/store/useUIStore';
import { usePomodoro } from '@/features/pomodoro/hooks/usePomodoro';
import { ROUTES } from '@/utils/routes';
import { cn } from '@/utils/stringHelpers';
import { TooltipProvider } from '@/components/ui/tooltip';
import logo from '@/assets/logo.svg';
import { SidebarItem } from './SidebarItem';
import { getNavItemsByGroup, NAV_GROUP_LABELS } from './nav-config';
import type { NavItem } from './nav-config';

const GROUP_ORDER: NavItem['group'][] = ['navigation', 'action', 'meta'];

export function Sidebar() {
  const isSidebarCollapsed = useUIStore((state) => state.isSidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const setProgramOpen = useUIStore((state) => state.setProgramOpen);
  const { setOpen: setPomodoroOpen } = usePomodoro();

  // Artık Notes sayfasında otomatik daraltmıyoruz
  const isCollapsed = isSidebarCollapsed;

  const groupedItems = getNavItemsByGroup();

  // Desktop'ta sadece mobileOnly olmayanları göster
  const filteredGroupedItems = Object.keys(groupedItems).reduce(
    (acc, key) => {
      acc[key as NavItem['group']] = groupedItems[
        key as NavItem['group']
      ].filter((item) => !item.mobileOnly);
      return acc;
    },
    {} as Record<NavItem['group'], NavItem[]>
  );

  const handleAction = (action: string) => {
    if (action === 'pomodoro') {
      setPomodoroOpen(true);
    } else if (action === 'program') {
      setProgramOpen(true);
    }
  };

  return (
    <aside
      className={cn(
        'row-span-2 h-screen flex flex-col border-r border-accent/15 bg-background transition-all duration-300 ease-in-out overflow-hidden hidden lg:flex',
        isCollapsed ? 'w-16' : 'w-[260px]'
      )}
    >
      {/* === BRAND AREA === */}
      <Link
        to={ROUTES.HOME}
        className={cn(
          'h-[80px] flex items-center justify-center gap-3 shrink-0 px-4 border-b border-accent/15 transition-all duration-200 hover:bg-white/5 group',
          isCollapsed && 'px-2'
        )}
      >
        <img
          src={logo}
          alt="AuditPath Logo"
          className={cn(
            'object-contain shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300',
            isCollapsed ? 'size-8' : 'size-10'
          )}
        />
        {!isCollapsed && (
          <div className="flex flex-col min-w-0 mr-8">
            <span className="text-lg font-heading font-bold tracking-tight bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-transparent truncate">
              Audit Path
            </span>
            <span className="text-[10px] uppercase tracking-normal font-bold text-primary/80 leading-none">
              BİLGELİK AKADEMİSİ
            </span>
          </div>
        )}
      </Link>

      {/* === NAV GROUPS === */}
      <nav className="flex-1 overflow-y-auto py-5 px-3 custom-scrollbar">
        <TooltipProvider>
          {GROUP_ORDER.map((groupKey, groupIndex) => {
            const items = groupedItems[groupKey];
            if (items.length === 0) return null;

            return (
              <div
                key={groupKey}
                className={cn('space-y-1', groupIndex > 0 && 'mt-6')}
              >
                {!isCollapsed && (
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 mb-2">
                    {NAV_GROUP_LABELS[groupKey]}
                  </p>
                )}
                {filteredGroupedItems[groupKey].map((item) => (
                  <SidebarItem
                    key={item.label}
                    item={item}
                    isCollapsed={isCollapsed}
                    onAction={handleAction}
                  />
                ))}
              </div>
            );
          })}
        </TooltipProvider>
      </nav>

      {/* === FOOTER: COLLAPSE TOGGLE === */}
      <div className="shrink-0 border-t border-border/10 p-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleSidebar();
          }}
          className={cn(
            'flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-all',
            isCollapsed && 'justify-center px-2'
          )}
          aria-label={isCollapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="size-[18px] shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="size-[18px] shrink-0" />
              <span className="truncate">Daralt</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
