import {
  CATEGORY_MAPPINGS,
  type CourseCategory,
  DEFAULT_CATEGORY,
  EXAM_STRATEGY,
} from '@/features/courses/utils/constants';
import { type BloomLevel, type ExamSubjectWeight } from '../types';
import { BLOOM_INSTRUCTIONS } from './prompts';

/**
 * Ders ismine göre sınav stratejisini belirler.
 * @param courseName - Dersin tam adı
 * @returns Dersin önem ve dağılım stratejisi
 */
export function getSubjectStrategy(
  courseName: string
): ExamSubjectWeight | undefined {
  const category = getCourseCategory(courseName);
  return EXAM_STRATEGY[category];
}

/**
 * Ders isminden kategori belirler.
 * @param courseName - Ders adı
 * @returns Kurs kategorisi
 */
export function getCourseCategory(courseName: string): CourseCategory {
  return CATEGORY_MAPPINGS[courseName] || DEFAULT_CATEGORY;
}

/**
 * Index ve kavram bilgisine göre soru üretim stratejisini belirler.
 * @param index - Soru sırası
 * @param concept - İlgili kavram (opsiyonel)
 * @param courseName - Ders adı (varsayılan: '')
 * @returns Bloom seviyesi ve yönlendirme metni
 */
export function determineNodeStrategy(
  index: number,
  concept?: {
    baslik?: string;
    odak?: string;
    seviye?: string;
    gorsel?: string | null;
    isException?: boolean;
  },
  courseName: string = ''
): {
  bloomLevel: BloomLevel;
  instruction: string;
} | null {
  const category = getCourseCategory(courseName);

  // 0. Görsel engeli kontrolü
  if (concept?.gorsel === 'GRAFİK_GEREKTIRIYOR') {
    return null;
  }

  // 1. Eğer kavramda spesifik bir seviye tanımlanmışsa onu kullan (English mapping for tests/consumers)
  if (concept?.seviye) {
    const levelMap: Record<
      string,
      { bloomLevel: BloomLevel; instruction: string }
    > = {
      Bilgi: {
        bloomLevel: 'knowledge',
        instruction: BLOOM_INSTRUCTIONS.Bilgi,
      },
      Uygulama: {
        bloomLevel: 'application',
        instruction: BLOOM_INSTRUCTIONS.Uygulama,
      },
      Analiz: {
        bloomLevel: 'analysis',
        instruction: BLOOM_INSTRUCTIONS.Analiz,
      },
    };
    const mapped = levelMap[concept.seviye];
    if (mapped) return mapped;
  }

  if (category === 'FULL_PRACTICE') {
    return {
      bloomLevel: 'application',
      instruction: BLOOM_INSTRUCTIONS.Uygulama,
    };
  }

  // Standart akış: 0: bilgi, 1: uygulama, 2: analiz
  const cycle = index % 3;
  if (concept?.isException) {
    return {
      bloomLevel: 'analysis',
      instruction: BLOOM_INSTRUCTIONS.Analiz,
    };
  }

  switch (cycle) {
    case 0:
      return {
        bloomLevel: 'knowledge',
        instruction: BLOOM_INSTRUCTIONS.Bilgi,
      };
    case 1:
      return {
        bloomLevel: 'application',
        instruction: BLOOM_INSTRUCTIONS.Uygulama,
      };
    case 2:
      return {
        bloomLevel: 'analysis',
        instruction: BLOOM_INSTRUCTIONS.Analiz,
      };
    default:
      return null;
  }
}
