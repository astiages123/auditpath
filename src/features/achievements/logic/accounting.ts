import { type Achievement } from '../types/achievementsTypes';

export const ACCOUNTING_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'muh_10',
    title: 'Düğüm Çözücü',
    motto: 'Sayıların karmaşık düğümlerini teker teker çözmeye başladın.',
    imagePath: '/badges/muhasebe-10.webp',
    guild: 'MUHASEBE_MALIYE',
    requirement: {
      type: 'category_progress',
      category: 'MUHASEBE_MALIYE',
      percentage: 10,
    },
    order: 9,
  },
  {
    id: 'muh_25',
    title: 'Hazine Muhafızı',
    motto: 'Hazine kapısındaki ağır kilidin mekanizmasını çözüyorsun.',
    imagePath: '/badges/muhasebe-25.webp',
    guild: 'MUHASEBE_MALIYE',
    requirement: {
      type: 'category_progress',
      category: 'MUHASEBE_MALIYE',
      percentage: 25,
    },
    order: 10,
  },
  {
    id: 'muh_50',
    title: 'Gümüş Sayacı',
    motto:
      'Krallığın sandığını koruyan, her sikkenin fısıltısını duyan keskin göz.',
    imagePath: '/badges/muhasebe-50.webp',
    guild: 'MUHASEBE_MALIYE',
    requirement: {
      type: 'category_progress',
      category: 'MUHASEBE_MALIYE',
      percentage: 50,
    },
    order: 11,
  },
  {
    id: 'muh_100',
    title: 'Kusursuz Mizân Üstadı',
    motto: 'Sayıların kaosunu ilahi bir düzene sokan, mutlak dengenin mimarı.',
    imagePath: '/badges/muhasebe-100.webp',
    guild: 'MUHASEBE_MALIYE',
    requirement: {
      type: 'category_progress',
      category: 'MUHASEBE_MALIYE',
      percentage: 100,
    },
    order: 12,
  },
];
