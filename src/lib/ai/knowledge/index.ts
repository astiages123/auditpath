/**
 * AI Knowledge Base Module
 * Central registry for all KPSS subject knowledge with lookup and minification helpers.
 */

import type { SubjectKnowledge } from "./types";

// Re-export types
export type { SubjectKnowledge } from "./types";

// Import all subject modules
import { CEZA_HUKUKU } from "./subjects/ceza_hukuku";
import { MIKRO_IKTISAT } from "./subjects/mikro_iktisat";
import { MUHASEBE } from "./subjects/muhasebe";
import { ISTATISTIK } from "./subjects/istatistik";
import { MALIYE } from "./subjects/maliye";
import { MEDENI_HUKUK } from "./subjects/medeni_hukuk";
import { MEDENI_USUL_HUKUKU } from "./subjects/medeni_usul_hukuku";
import { BANKACILIK_HUKUKU } from "./subjects/bankacilik_hukuku";
import { PAZARLAMA_YONETIMI } from "./subjects/pazarlama_yonetimi";
import { PARA_BANKA_KREDI } from "./subjects/para_banka_kredi";
import { MATEMATIK } from "./subjects/matematik";
import { BANKA_MUHASEBESI } from "./subjects/banka_muhasebesi";
import { ICRA_IFLAS_HUKUKU } from "./subjects/icra_iflas_hukuku";
import { ULUSLARARASI_TICARET } from "./subjects/uluslararasi_ticaret";
import { INGILIZCE } from "./subjects/ingilizce";
import { IS_HUKUKU } from "./subjects/is_hukuku";
import { BORCLAR_HUKUKU } from "./subjects/borclar_hukuku";
import { ISLETME_YONETIMI } from "./subjects/isletme_yonetimi";
import { MAKRO_IKTISAT } from "./subjects/makro_iktisat";
import { TURKIYE_EKONOMISI } from "./subjects/turkiye_ekonomisi";
import { TICARET_HUKUKU } from "./subjects/ticaret_hukuku";
import { FINANS_MATEMATIGI } from "./subjects/finans_matematigi";
import { FINANSAL_YONETIM } from "./subjects/finansal_yonetim";
import { SOZEL_MANTIK } from "./subjects/sozel_mantik";

/**
 * Default fallback knowledge for unknown subjects
 */
const DEFAULT_KNOWLEDGE: SubjectKnowledge = {
  id: "default",
  constitution: `Temel İlkeler:
* Bloom Taksonomisi'nin üst basamaklarına (Uygulama, Analiz, Değerlendirme) odaklan.
* Doğrudan tanım sormak yerine vaka bazlı kurgular oluştur.
* Çeldiriciler mantıklı ve ayırt edici olmalı, bariz yanlış olmamalı.
* Kesinlik ifade eden kelimelere (her zaman, asla) dikkat et.`,
  fewShot: `Örnek soru formatı:
Soru: [Vaka bazlı soru kökü]
A) [Seçenek]
B) [Seçenek]
C) [Seçenek]
D) [Seçenek]
E) [Seçenek]

Geri Bildirim:
* Doğru Hüküm: [Neden doğru olduğunun açıklaması]
* Çeldirici Analizi: [Yanlış şıkların neden cazip ama yanlış olduğu]
* Ayırt Edici Çizgi: [Doğru cevabı ayırt eden kritik nokta]
* Parşömen Referansı: [Kaynak veya mevzuat]`
};

/**
 * Central registry mapping subject IDs to their knowledge modules.
 * Keys support multiple formats: snake_case, kebab-case, and variations.
 */
export const SUBJECT_REGISTRY: Record<string, SubjectKnowledge> = {
  // Primary IDs (snake_case)
  ceza_hukuku: CEZA_HUKUKU,
  mikro_iktisat: MIKRO_IKTISAT,
  muhasebe: MUHASEBE,
  istatistik: ISTATISTIK,
  maliye: MALIYE,
  medeni_hukuk: MEDENI_HUKUK,
  medeni_usul_hukuku: MEDENI_USUL_HUKUKU,
  bankacilik_hukuku: BANKACILIK_HUKUKU,
  pazarlama_yonetimi: PAZARLAMA_YONETIMI,
  para_banka_kredi: PARA_BANKA_KREDI,
  matematik: MATEMATIK,
  banka_muhasebesi: BANKA_MUHASEBESI,
  icra_iflas_hukuku: ICRA_IFLAS_HUKUKU,
  uluslararasi_ticaret: ULUSLARARASI_TICARET,
  ingilizce: INGILIZCE,
  is_hukuku: IS_HUKUKU,
  borclar_hukuku: BORCLAR_HUKUKU,
  isletme_yonetimi: ISLETME_YONETIMI,
  makro_iktisat: MAKRO_IKTISAT,
  turkiye_ekonomisi: TURKIYE_EKONOMISI,
  ticaret_hukuku: TICARET_HUKUKU,
  finans_matematigi: FINANS_MATEMATIGI,
  finansal_yonetim: FINANSAL_YONETIM,
  sozel_mantik: SOZEL_MANTIK,

  // Kebab-case aliases
  "ceza-hukuku": CEZA_HUKUKU,
  "mikro-iktisat": MIKRO_IKTISAT,
  "medeni-hukuk": MEDENI_HUKUK,
  "medeni-usul-hukuku": MEDENI_USUL_HUKUKU,
  "bankacilik-hukuku": BANKACILIK_HUKUKU,
  "pazarlama-yonetimi": PAZARLAMA_YONETIMI,
  "para-banka-kredi": PARA_BANKA_KREDI,
  "banka-muhasebesi": BANKA_MUHASEBESI,
  "icra-iflas-hukuku": ICRA_IFLAS_HUKUKU,
  "uluslararasi-ticaret": ULUSLARARASI_TICARET,
  "is-hukuku": IS_HUKUKU,
  "borclar-hukuku": BORCLAR_HUKUKU,
  "isletme-yonetimi": ISLETME_YONETIMI,
  "makro-iktisat": MAKRO_IKTISAT,
  "turkiye-ekonomisi": TURKIYE_EKONOMISI,
  "ticaret-hukuku": TICARET_HUKUKU,
  "finans-matematigi": FINANS_MATEMATIGI,
  "finansal-yonetim": FINANSAL_YONETIM,
  "sozel-mantik": SOZEL_MANTIK,

  // Default fallback
  default: DEFAULT_KNOWLEDGE,
};

/**
 * Minifies text by removing excess whitespace while preserving structure.
 * Reduces token usage when injecting knowledge into API requests.
 * 
 * @param text - The text to minify
 * @returns Minified text with single spaces and trimmed lines
 */
export function minify(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n")
    .replace(/[ \t]+/g, " ");
}

/**
 * Retrieves subject knowledge by course ID.
 * Supports snake_case, kebab-case, and falls back to default if not found.
 * 
 * @param courseId - The course identifier (e.g., "ceza_hukuku", "ceza-hukuku")
 * @returns The subject knowledge object
 */
export function getSubjectKnowledge(courseId: string): SubjectKnowledge {
  // Normalize the courseId: lowercase and try both formats
  const normalized = courseId.toLowerCase().trim();
  
  // Direct lookup
  if (SUBJECT_REGISTRY[normalized]) {
    return SUBJECT_REGISTRY[normalized];
  }
  
  // Try converting kebab to snake case
  const snakeCase = normalized.replace(/-/g, "_");
  if (SUBJECT_REGISTRY[snakeCase]) {
    return SUBJECT_REGISTRY[snakeCase];
  }
  
  // Try converting snake to kebab case
  const kebabCase = normalized.replace(/_/g, "-");
  if (SUBJECT_REGISTRY[kebabCase]) {
    return SUBJECT_REGISTRY[kebabCase];
  }
  
  // Return default
  console.warn(`Subject knowledge not found for: ${courseId}, using default`);
  return DEFAULT_KNOWLEDGE;
}

/**
 * Lists all available subject IDs (primary snake_case only)
 */
export function listSubjectIds(): string[] {
  return Object.values(SUBJECT_REGISTRY)
    .filter((v, i, arr) => arr.findIndex((x) => x.id === v.id) === i)
    .map((s) => s.id)
    .filter((id) => id !== "default");
}
