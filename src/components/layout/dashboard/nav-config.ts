import {
  Banknote,
  CalendarDays,
  ChartColumnStacked,
  Home,
  Hourglass,
  LibraryBig,
  type LucideIcon,
  Medal,
  Route,
} from 'lucide-react';
import { ROUTES } from '@/utils/routes';

export type NavGroup = 'navigation' | 'action' | 'meta';
export type NavAction = 'pomodoro' | 'program';

export interface NavItem {
  label: string;
  group: NavGroup;
  icon: LucideIcon;
  href?: string;
  action?: NavAction;
  mobileOnly?: boolean;
}

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  navigation: 'Ana Yörünge',
  action: 'Derin Çalışma',
  meta: 'Gelişim ve İçgörü',
};

export const navItems: NavItem[] = [
  { label: 'Anasayfa', href: ROUTES.HOME, icon: Home, group: 'navigation' },
  {
    label: 'Yolculuk',
    href: ROUTES.ROADMAP,
    icon: Route,
    group: 'navigation',
  },
  {
    label: 'Çalışma Programı',
    href: ROUTES.SCHEDULE,
    icon: CalendarDays,
    group: 'navigation',
  },

  {
    label: 'Çalışma Merkezi',
    href: ROUTES.LIBRARY,
    icon: LibraryBig,
    group: 'action',
  },
  {
    label: 'Kronometre',
    action: 'pomodoro',
    icon: Hourglass,
    group: 'action',
  },

  {
    label: 'Başarılar',
    href: ROUTES.ACHIEVEMENTS,
    icon: Medal,
    group: 'meta',
  },
  {
    label: 'Harcama Analizi',
    href: ROUTES.COSTS,
    icon: Banknote,
    group: 'meta',
    mobileOnly: true,
  },
  {
    label: 'İstatistikler',
    href: ROUTES.STATISTICS,
    icon: ChartColumnStacked,
    group: 'meta',
  },
];

export function getNavItemsByGroup(): Record<NavGroup, NavItem[]> {
  return {
    navigation: navItems.filter((item) => item.group === 'navigation'),
    action: navItems.filter((item) => item.group === 'action'),
    meta: navItems.filter((item) => item.group === 'meta'),
  };
}
