import { type GuildInfo, type GuildType } from '../types/achievementsTypes';

export const GUILDS: Record<GuildType, GuildInfo> = {
  HUKUK: {
    id: 'HUKUK',
    name: 'Kadim Yasalar ve Yazıtlar Meclisi',
    description: 'Hukuk ve Adalet Doktrinleri',
    color: 'oklch(0.7 0.15 250)',
  },
  EKONOMI: {
    id: 'EKONOMI',
    name: 'Altın Akış ve Simya Konseyi',
    description: 'Ekonomi ve Kaynak Yönetimi',
    color: 'oklch(0.75 0.15 85)',
  },
  MUHASEBE_MALIYE: {
    id: 'MUHASEBE_MALIYE',
    name: 'Hazine ve Kusursuz Mizân Muhafızları',
    description: 'Muhasebe ve Maliye Bilimi',
    color: 'oklch(0.65 0.15 145)',
  },
  GENEL_YETENEK: {
    id: 'GENEL_YETENEK',
    name: 'Yedi Diyar ve Diplomasi Okulu',
    description: 'Mantık, Lisan ve Genel Bilgelik',
    color: 'oklch(0.7 0.15 300)',
  },
  HYBRID: {
    id: 'HYBRID',
    name: 'Kadim Birleşimler ve İlimler',
    description: 'Çapraz disiplinlerde ustalık nişanları',
    color: 'oklch(0.7 0.12 200)',
  },
  SPECIAL: {
    id: 'SPECIAL',
    name: 'Yüce Disiplin ve Adanmışlık',
    description: 'Zihinsel dayanıklılık ve süreklilik mühürleri',
    color: 'oklch(0.8 0.18 50)',
  },
  MASTERY: {
    id: 'MASTERY',
    name: 'Kadim İmtihanlar ve Hakikat Meclisi',
    description: 'Quiz Ustalık Nişanları',
    color: 'oklch(0.6 0.25 320)',
  },
  TITLES: {
    id: 'TITLES',
    name: 'Unvanlar',
    description:
      'Yüce Disiplin ve Adanmışlık Zihinsel dayanıklılık ve süreklilik mühürleri',
    color: 'oklch(0.75 0.18 120)',
  },
};
