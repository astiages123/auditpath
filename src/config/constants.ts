import type { Rank } from '@/shared/types/core';

export const RANKS: Rank[] = [
  {
    id: '1',
    name: 'Sürgün',
    minPercentage: 0,
    color: 'text-slate-500',
    motto: 'Bilginin krallığından uzakta, sislerin içinde yolunu arıyorsun.',
    imagePath: '/ranks/rank1.webp',
    order: 1,
  },
  {
    id: '2',
    name: 'Yazıcı',
    minPercentage: 25,
    color: 'text-amber-700',
    motto: 'Kadim metinleri kopyalayarak bilgeliğin izlerini sürmeye başladın.',
    imagePath: '/ranks/rank2.webp',
    order: 2,
  },
  {
    id: '3',
    name: 'Sınır Muhafızı',
    minPercentage: 50,
    color: 'text-blue-400',
    motto:
      'Bilgi krallığının sınırlarını koruyor, cehaletin gölgeleriyle savaşıyorsun.',
    imagePath: '/ranks/rank3.webp',
    order: 3,
  },
  {
    id: '4',
    name: 'Yüce Bilgin',
    minPercentage: 75,
    color: 'text-purple-500',
    motto:
      'Görünmeyeni görüyor, bilinmeyeni biliyorsun. Hikmetin ışığı sensin.',
    imagePath: '/ranks/rank4.webp',
    order: 4,
  },
];
