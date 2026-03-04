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

// === TYPES ===

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

// === CONSTANTS ===

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  navigation: 'Ana Yörünge',
  action: 'Derin Çalışma',
  meta: 'Gelişim ve İçgörü',
};

// === CONFIG ===

export const navItems: NavItem[] = [
  // === ANA YÖRÜNGE (Navigation Zone) ===
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

  // === DERİN ÇALIŞMA (Action Zone) ===
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

  // === GELİŞİM VE İÇGÖRÜ (Meta Zone) ===
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

// === FUNCTIONS ===

export function getNavItemsByGroup(): Record<NavGroup, NavItem[]> {
  return {
    navigation: navItems.filter((item) => item.group === 'navigation'),
    action: navItems.filter((item) => item.group === 'action'),
    meta: navItems.filter((item) => item.group === 'meta'),
  };
}
