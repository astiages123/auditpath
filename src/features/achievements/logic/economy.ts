import { type Achievement } from '../types/achievementsTypes';

export const ECONOMY_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'eko_10',
    title: 'Bakır Yol',
    motto: 'Ticaret kervanlarının geçtiği tozlu yollarda ilk adımını attın.',
    imagePath: '/badges/ekonomi-10.webp',
    guild: 'EKONOMI',
    requirement: {
      type: 'category_progress',
      category: 'EKONOMI',
      percentage: 10,
    },
    order: 5,
  },
  {
    id: 'eko_25',
    title: 'Kervan Katibi',
    motto: 'Altın sikkelerin sesini ve servetin yönünü anlamaya başladın.',
    imagePath: '/badges/ekonomi-25.webp',
    guild: 'EKONOMI',
    requirement: {
      type: 'category_progress',
      category: 'EKONOMI',
      percentage: 25,
    },
    order: 6,
  },
  {
    id: 'eko_50',
    title: 'Denge Gözetmeni',
    motto:
      'Arz ve talebin fırtınalı denizinde, sükuneti ve düzeni görebiliyorsun.',
    imagePath: '/badges/ekonomi-50.webp',
    guild: 'EKONOMI',
    requirement: {
      type: 'category_progress',
      category: 'EKONOMI',
      percentage: 50,
    },
    order: 7,
  },
  {
    id: 'eko_100',
    title: 'Altın Dokunuş Üstadı',
    motto:
      'Altın akışının sırrına erdin; görünmez eller artık senin iradene boyun eğiyor.',
    imagePath: '/badges/ekonomi-100.webp',
    guild: 'EKONOMI',
    requirement: {
      type: 'category_progress',
      category: 'EKONOMI',
      percentage: 100,
    },
    order: 8,
  },
];
