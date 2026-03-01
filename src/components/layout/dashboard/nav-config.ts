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

export interface NavItem {
  label: string;
  href?: string;
  action?: 'pomodoro' | 'program';
  icon: LucideIcon;
  group: 'navigation' | 'action' | 'meta';
  mobileOnly?: boolean;
}

export const NAV_GROUP_LABELS: Record<NavItem['group'], string> = {
  navigation: 'Ana Yörünge',
  action: 'Derin Çalışma',
  meta: 'Gelişim ve İçgörü',
};

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
    label: 'Program',
    href: ROUTES.PROGRAM,
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

export function getNavItemsByGroup(): Record<NavItem['group'], NavItem[]> {
  return {
    navigation: navItems.filter((item) => item.group === 'navigation'),
    action: navItems.filter((item) => item.group === 'action'),
    meta: navItems.filter((item) => item.group === 'meta'),
  };
}
