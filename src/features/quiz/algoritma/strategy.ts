import { type ConceptMapItem } from '../core/types';

export interface ExamSubjectWeight {
  importance: 'high' | 'medium' | 'low';
  examTotal?: number;
}

export const EXAM_STRATEGY: Record<string, ExamSubjectWeight> = {
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

export function getSubjectStrategy(
  courseName: string
): ExamSubjectWeight | undefined {
  // Basic normalization for matching keys
  const normalizedName = courseName
    .trim()
    .toLowerCase()
    .replace(/,/g, '') // Virgülleri kaldır
    .replace(/ /g, '-')
    .replace(/ı/g, 'i')
    .replace(/i̇/g, 'i') // Handle combined dot character
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');

  return (
    EXAM_STRATEGY[normalizedName] || EXAM_STRATEGY[courseName] || undefined
  );
}

export type CourseCategory = 'SKILL_BASED' | 'SCENARIO_BASED' | 'THEORY_BASED';

export interface BloomStrategy {
  bloomLevel: 'knowledge' | 'application' | 'analysis';
  baseInstruction: string;
}

const CATEGORY_MAPPINGS: Record<string, CourseCategory> = {
  // SKILL_BASED
  İngilizce: 'SKILL_BASED',
  'Sözel Mantık': 'SKILL_BASED',
  Matematik: 'SKILL_BASED',
  'Sayısal Mantık': 'SKILL_BASED',
  İstatistik: 'SKILL_BASED',

  // SCENARIO_BASED
  'Medeni Hukuk': 'SCENARIO_BASED',
  'Borçlar Hukuku': 'SCENARIO_BASED',
  'Ticaret Hukuku': 'SCENARIO_BASED',
  'Bankacılık Hukuku': 'SCENARIO_BASED',
  'İcra ve İflas Hukuku': 'SCENARIO_BASED',
  'Türk Ceza Kanunu': 'SCENARIO_BASED',
  'İş Hukuku': 'SCENARIO_BASED',
  'Medeni Usul Hukuku': 'SCENARIO_BASED',
  'Genel Muhasebe': 'SCENARIO_BASED',
  'Banka Muhasebesi': 'SCENARIO_BASED',
  'Finans Matematiği': 'SCENARIO_BASED',
  'Finansal Yönetim': 'SCENARIO_BASED',

  // THEORY_BASED
  'Mikro İktisat': 'THEORY_BASED',
  'Makro İktisat': 'THEORY_BASED',
  'Para, Banka ve Kredi': 'THEORY_BASED',
  'Uluslararası Ticaret': 'THEORY_BASED',
  'Türkiye Ekonomisi': 'THEORY_BASED',
  'Maliye Teorisi': 'THEORY_BASED',
  'İşletme Yönetimi': 'THEORY_BASED',
  'Pazarlama Yönetimi': 'THEORY_BASED',
};

// Fallback for unknown courses
const DEFAULT_CATEGORY: CourseCategory = 'THEORY_BASED';

export function getCourseCategory(courseName: string): CourseCategory {
  return CATEGORY_MAPPINGS[courseName] || DEFAULT_CATEGORY;
}

// Bloom level distributions (Modulo 10)
export const CATEGORY_DISTRIBUTIONS: Record<
  CourseCategory,
  ('knowledge' | 'application' | 'analysis')[]
> = {
  SKILL_BASED: [
    'knowledge',
    'application',
    'application',
    'application',
    'application',
    'application',
    'application',
    'analysis',
    'analysis',
    'analysis',
  ],
  SCENARIO_BASED: [
    'knowledge',
    'knowledge',
    'application',
    'application',
    'application',
    'application',
    'application',
    'application',
    'analysis',
    'analysis',
  ],
  THEORY_BASED: [
    'knowledge',
    'knowledge',
    'application',
    'application',
    'application',
    'application',
    'application',
    'application',
    'analysis',
    'analysis',
  ],
};

// Instruction templates based on Bloom Level
export const BLOOM_INSTRUCTIONS = {
  knowledge:
    'Temel bilgi ve kavrama düzeyinde, akademik bir dille hazırlanmış öğretici bir soru üret. Tanım, ilke veya kavramsal özelliklere odaklan.',
  application:
    "Kuru tanım sorma. Kullanıcının günlük hayatta karşılaşabileceği, isimler ve olaylar içeren spesifik bir 'vaka/senaryo' (vignette) kurgula.",
  analysis:
    "Metindeki iki farklı kavramı karşılaştıran veya bir kuralın istisnasını sorgulayan 'muhakeme' odaklı bir soru üret. Soru, 'X olursa Y nasıl etkilenir?' gibi neden-sonuç zinciri kurdurmalıdır.",
};

/**
 * Determine bloom level strategy based on concept and index
 */
export function determineNodeStrategy(
  index: number,
  concept?: ConceptMapItem,
  courseName: string = ''
): {
  bloomLevel: 'knowledge' | 'application' | 'analysis';
  instruction: string;
} {
  // 1. Taksonomi Önceliği: Eğer concept içinde seviye varsa, ona güven.
  if (concept?.seviye) {
    if (concept.seviye === 'Analiz') {
      return {
        bloomLevel: 'analysis',
        instruction: BLOOM_INSTRUCTIONS.analysis,
      };
    }
    if (concept.seviye === 'Uygulama') {
      return {
        bloomLevel: 'application',
        instruction: BLOOM_INSTRUCTIONS.application,
      };
    }
    if (concept.seviye === 'Bilgi') {
      return {
        bloomLevel: 'knowledge',
        instruction: BLOOM_INSTRUCTIONS.knowledge,
      };
    }
  }

  // 2. Kategori Bazlı Strateji (Modulo 10)
  const category = getCourseCategory(courseName);
  const distribution = CATEGORY_DISTRIBUTIONS[category];

  // Döngüsel indeks (0-9)
  const cycleIndex = index % 10;
  const targetBloomLevel = distribution[cycleIndex];

  return {
    bloomLevel: targetBloomLevel,
    instruction: BLOOM_INSTRUCTIONS[targetBloomLevel],
  };
}
