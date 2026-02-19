import { type Achievement } from '../types/achievementsTypes';

export const TITLE_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'RANK_UP:1',
    title: 'Sürgün',
    motto: 'Bilginin krallığından uzakta, sislerin içinde yolunu arıyorsun.',
    imagePath: '/ranks/rank1.webp',
    guild: 'TITLES',
    requirement: { type: 'minimum_videos', count: 1 },
    order: 29,
    isPermanent: true,
  },
  {
    id: 'RANK_UP:2',
    title: 'Yazıcı',
    motto: 'Kadim metinleri kopyalayarak bilgeliğin izlerini sürmeye başladın.',
    imagePath: '/ranks/rank2.webp',
    guild: 'TITLES',
    requirement: { type: 'all_progress', percentage: 25 },
    order: 30,
    isPermanent: true,
  },
  {
    id: 'RANK_UP:3',
    title: 'Sınır Muhafızı',
    motto:
      'Bilgi krallığının sınırlarını koruyor, cehaletin gölgeleriyle savaşıyorsun.',
    imagePath: '/ranks/rank3.webp',
    guild: 'TITLES',
    requirement: { type: 'all_progress', percentage: 50 },
    order: 31,
    isPermanent: true,
  },
  {
    id: 'RANK_UP:4',
    title: 'Yüce Bilgin',
    motto:
      'Görünmeyeni görüyor, bilinmeyeni biliyorsun. Hikmetin ışığı sensin.',
    imagePath: '/ranks/rank4.webp',
    guild: 'TITLES',
    requirement: { type: 'all_progress', percentage: 75 },
    order: 32,
    isPermanent: true,
  },
];
