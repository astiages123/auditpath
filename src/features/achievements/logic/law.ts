import { type Achievement } from '../types/achievementsTypes';

export const LAW_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'hukuk_10',
    title: 'Yasa Tozu',
    motto: 'Kadim tabletlerdeki ilk çatlakları ve tozlu yasaları fark ettin.',
    imagePath: '/badges/hukuk-10.webp',
    guild: 'HUKUK',
    requirement: {
      type: 'category_progress',
      category: 'HUKUK',
      percentage: 10,
    },
    order: 1,
  },
  {
    id: 'hukuk_25',
    title: 'Demir Mühürdar',
    motto: 'Sarsılmaz kuralların anahtarını sıkıca kavrıyorsun.',
    imagePath: '/badges/hukuk-25.webp',
    guild: 'HUKUK',
    requirement: {
      type: 'category_progress',
      category: 'HUKUK',
      percentage: 25,
    },
    order: 2,
  },
  {
    id: 'hukuk_50',
    title: 'Rün Mürekkebi',
    motto:
      'Karmaşık yazıtların arasındaki gizli rünleri deşifre etmeye başladın.',
    imagePath: '/badges/hukuk-50.webp',
    guild: 'HUKUK',
    requirement: {
      type: 'category_progress',
      category: 'HUKUK',
      percentage: 50,
    },
    order: 3,
  },
  {
    id: 'hukuk_100',
    title: 'Adalet Asası',
    motto:
      'Kadim yasaların mutlak koruyucusu; adaletin keskin ve parlayan kılıcı.',
    imagePath: '/badges/hukuk-100.webp',
    guild: 'HUKUK',
    requirement: {
      type: 'category_progress',
      category: 'HUKUK',
      percentage: 100,
    },
    order: 4,
  },
];
