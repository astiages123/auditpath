import { type Achievement } from '../types/achievementsTypes';

export const HYBRID_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'hybrid_01',
    title: 'Ticaret Valisi',
    motto:
      'Hukuk ve Ekonomi: Altının akışını yasaların gücüyle dizginliyorsun.',
    imagePath: '/badges/hybrid-01.webp',
    guild: 'HYBRID',
    requirement: {
      type: 'multi_category_progress',
      categories: [
        { category: 'HUKUK', percentage: 25 },
        { category: 'EKONOMI', percentage: 25 },
      ],
    },
    order: 17,
  },
  {
    id: 'hybrid_02',
    title: 'İmparatorluk Nazırı',
    motto: 'Ekonomi ve Muhasebe: Hem serveti yönetiyor hem de tartabiliyorsun.',
    imagePath: '/badges/hybrid-02.webp',
    guild: 'HYBRID',
    requirement: {
      type: 'multi_category_progress',
      categories: [
        { category: 'EKONOMI', percentage: 50 },
        { category: 'MUHASEBE_MALIYE', percentage: 50 },
      ],
    },
    order: 18,
  },
  {
    id: 'hybrid_03',
    title: 'Bilge Diplomat',
    motto: 'Hukuk ve Genel Yetenek: Keskin bir zeka ve sarsılmaz bir adalet.',
    imagePath: '/badges/hybrid-03.webp',
    guild: 'HYBRID',
    requirement: {
      type: 'multi_category_progress',
      categories: [
        { category: 'HUKUK', percentage: 50 },
        { category: 'GENEL_YETENEK', percentage: 50 },
      ],
    },
    order: 19,
  },
  {
    id: 'hybrid_04',
    title: 'Strateji Mimarı',
    motto: 'Muhasebe ve Genel Yetenek: Mantığın ve sayıların gücü.',
    imagePath: '/badges/hybrid-04.webp',
    guild: 'HYBRID',
    requirement: {
      type: 'multi_category_progress',
      categories: [
        { category: 'MUHASEBE_MALIYE', percentage: 25 },
        { category: 'GENEL_YETENEK', percentage: 25 },
      ],
    },
    order: 20,
  },
  {
    id: 'hybrid_05',
    title: 'Büyük Konsey Üyesi',
    motto:
      'Beş disiplin tek zihinde: Tüm loncaların saygısını kazanan bir bilge.',
    imagePath: '/badges/hybrid-05.webp',
    guild: 'HYBRID',
    requirement: { type: 'all_progress', percentage: 50 },
    order: 21,
  },
];
