export type CourseCategory =
  | 'SCENARIO_BASED'
  | 'THEORY_BASED'
  | 'FULL_PRACTICE';

export const EXAM_STRATEGY: Record<
  string,
  { importance: 'high' | 'medium' | 'low' }
> = {
  'mikro-iktisat': { importance: 'high' },
  'makro-iktisat': { importance: 'high' },
  'para-banka-ve-kredi': { importance: 'high' },
  'uluslararasi-ticaret': { importance: 'low' },
  'turkiye-ekonomisi': { importance: 'low' },
  'medeni-hukuk': { importance: 'medium' },
  'borclar-hukuku': { importance: 'high' },
  'ticaret-hukuku': { importance: 'high' },
  'icra-ve-iflas-hukuku': { importance: 'medium' },
  'turk-ceza-kanunu': { importance: 'low' },
  'medeni-usul-hukuku': { importance: 'low' },
  'is-hukuku': { importance: 'low' },
  'bankacilik-hukuku': { importance: 'high' },
  'genel-muhasebe': { importance: 'high' },
  'maliye-teorisi': { importance: 'medium' },
  'banka-muhasebesi': { importance: 'high' },
  'isletme-yonetimi': { importance: 'low' },
  'pazarlama-yonetimi': { importance: 'low' },
  'finansal-yonetim': { importance: 'high' },
  matematik: { importance: 'high' },
  'finans-matematigi': { importance: 'high' },
  istatistik: { importance: 'medium' },
  ingilizce: { importance: 'high' },
  'sozel-mantik': { importance: 'low' },
};

export const CATEGORY_MAPPINGS: Record<string, CourseCategory> = {
  // FULL_PRACTICE (%100 Uygulama/İşlem)
  İngilizce: 'FULL_PRACTICE',
  'Sözel Mantık': 'FULL_PRACTICE',
  Matematik: 'FULL_PRACTICE',
  'Sayısal Mantık': 'FULL_PRACTICE',
  İstatistik: 'FULL_PRACTICE',
  'Finans Matematiği': 'FULL_PRACTICE',
  'Genel Muhasebe': 'FULL_PRACTICE',
  'Finansal Yönetim': 'FULL_PRACTICE',

  // SCENARIO_BASED (%20B - %50U - %30A)
  'Medeni Hukuk': 'SCENARIO_BASED',
  'Borçlar Hukuku': 'SCENARIO_BASED',
  'Ticaret Hukuku': 'SCENARIO_BASED',
  'Bankacılık Hukuku': 'SCENARIO_BASED',
  'İcra ve İflas Hukuku': 'SCENARIO_BASED',
  'Türk Ceza Kanunu': 'SCENARIO_BASED',
  'İş Hukuku': 'SCENARIO_BASED',
  'Medeni Usul Hukuku': 'SCENARIO_BASED',
  'Banka Muhasebesi': 'SCENARIO_BASED',

  // THEORY_BASED (%30B - %30U - %40A)
  'Mikro İktisat': 'THEORY_BASED',
  'Makro İktisat': 'THEORY_BASED',
  'Para, Banka ve Kredi': 'THEORY_BASED',
  'Uluslararası Ticaret': 'THEORY_BASED',
  'Türkiye Ekonomisi': 'THEORY_BASED',
  'Maliye Teorisi': 'THEORY_BASED',
  'İşletme Yönetimi': 'THEORY_BASED',
  'Pazarlama Yönetimi': 'THEORY_BASED',
};

export const DEFAULT_CATEGORY: CourseCategory = 'THEORY_BASED';

export const CATEGORY_DISTRIBUTIONS: Record<
  CourseCategory,
  ('knowledge' | 'application' | 'analysis')[]
> = {
  SCENARIO_BASED: [
    'knowledge',
    'knowledge',
    'application',
    'application',
    'application',
    'application',
    'application',
    'analysis',
    'analysis',
    'analysis',
  ],
  THEORY_BASED: [
    'knowledge',
    'knowledge',
    'knowledge',
    'application',
    'application',
    'application',
    'analysis',
    'analysis',
    'analysis',
    'analysis',
  ],
  FULL_PRACTICE: [
    'application',
    'application',
    'application',
    'application',
    'application',
    'application',
    'application',
    'application',
    'application',
    'application',
  ],
};
