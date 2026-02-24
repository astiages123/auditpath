import {
  BookCheck,
  CalendarDays,
  ChartScatter,
  LineSquiggle,
  Timer,
  Trophy,
} from 'lucide-react';
import { ROUTES } from '@/utils/routes';

export const getNavItems = (
  setPomodoroOpen: (open: boolean) => void,
  setProgramOpen: (open: boolean) => void
) => [
  {
    label: 'Eğitim',
    href: ROUTES.HOME,
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
    href: ROUTES.ROADMAP,
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
