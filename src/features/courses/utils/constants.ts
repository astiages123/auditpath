/** Represents the category mapping for course distribution strategies */
export type CourseCategory =
  | 'SCENARIO_BASED'
  | 'THEORY_BASED'
  | 'FULL_PRACTICE';

/** Importance mappings for specific exam strategies */
export const EXAM_STRATEGY: Record<
  string,
  { importance: 'high' | 'medium' | 'low' }
> = {
  // GENEL YETENEK
  'sozel-mantik': { importance: 'low' },
  'matematik-ve-geometri': { importance: 'high' },
  tarih: { importance: 'medium' },
  cografya: { importance: 'low' },
  vatandaslik: { importance: 'medium' },
  ingilizce: { importance: 'high' },

  // HUKUK
  'anayasa-hukuku': { importance: 'high' },
  'idare-hukuku': { importance: 'high' },
  'ceza-hukuku': { importance: 'medium' },
  'borclar-hukuku': { importance: 'high' },
  'medeni-hukuk': { importance: 'medium' },
  'ticaret-hukuku': { importance: 'high' },
  'icra-iflas-hukuku': { importance: 'medium' },

  // İKTİSAT
  'mikro-iktisat': { importance: 'high' },
  'makro-iktisat': { importance: 'high' },
  'para-banka-kredi': { importance: 'high' },
  'uluslararasi-iktisat': { importance: 'medium' },
  'kalkinma-buyume': { importance: 'medium' },
  'turkiye-ekonomisi': { importance: 'low' },
  'iktisadi-doktrinler-tarihi': { importance: 'low' },
  maliye: { importance: 'high' },
  muhasebe: { importance: 'high' },

  // KAMU YÖNETİMİ
  'siyaset-bilimi': { importance: 'medium' },
  'yonetim-bilimi': { importance: 'medium' },
  'turk-siyasal-hayati': { importance: 'medium' },
  'yerel-yonetimler': { importance: 'low' },

  // ULUSLARARASI İLİŞKİLER
  'diplomasi-tarihi': { importance: 'low' },
  'turk-dis-politikasi': { importance: 'medium' },
  'uluslararasi-hukuk': { importance: 'medium' },
  'uluslararasi-orgutler': { importance: 'low' },
  'uluslararasi-iliskiler-kuramlari': { importance: 'low' },
};

/** Predefined manual mappings between course string name and CourseCategory type */
export const CATEGORY_MAPPINGS: Record<string, CourseCategory> = {
  // FULL_PRACTICE (%100 Uygulama/İşlem)
  'Sözel Mantık': 'FULL_PRACTICE',
  'Matematik ve Geometri': 'FULL_PRACTICE',
  İngilizce: 'FULL_PRACTICE',
  Muhasebe: 'FULL_PRACTICE',

  // SCENARIO_BASED (%20B - %50U - %30A)
  'Ceza Hukuku': 'SCENARIO_BASED',
  'Borçlar Hukuku': 'SCENARIO_BASED',
  'Medeni Hukuk': 'SCENARIO_BASED',
  'Ticaret Hukuku': 'SCENARIO_BASED',
  'İcra-İflas Hukuku': 'SCENARIO_BASED',

  // THEORY_BASED (%30B - %30U - %40A)
  Tarih: 'THEORY_BASED',
  Coğrafya: 'THEORY_BASED',
  Vatandaşlık: 'THEORY_BASED',
  'Anayasa Hukuku': 'THEORY_BASED',
  'İdare Hukuku': 'THEORY_BASED',
  'Mikro İktisat': 'THEORY_BASED',
  'Makro İktisat': 'THEORY_BASED',
  'Para-Banka-Kredi': 'THEORY_BASED',
  'Uluslararası İktisat': 'THEORY_BASED',
  'Kalkınma-Büyüme': 'THEORY_BASED',
  'Türkiye Ekonomisi': 'THEORY_BASED',
  'İktisadi Doktrinler Tarihi': 'THEORY_BASED',
  Maliye: 'THEORY_BASED',
  'Siyaset Bilimi': 'THEORY_BASED',
  'Yönetim Bilimi': 'THEORY_BASED',
  'Türk Siyasal Hayatı': 'THEORY_BASED',
  'Yerel Yönetimler': 'THEORY_BASED',
  'Diplomasi Tarihi': 'THEORY_BASED',
  'Türk Dış Politikası': 'THEORY_BASED',
  'Uluslararası Hukuk': 'THEORY_BASED',
  'Uluslararası Örgütler': 'THEORY_BASED',
  'Uluslararası İlişkiler Kuramları': 'THEORY_BASED',
};

/** Default category to be used as a fallback mechanism */
export const DEFAULT_CATEGORY: CourseCategory = 'THEORY_BASED';

/** Distributed knowledge configurations relative to course categories */
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
