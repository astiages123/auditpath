import { CourseMastery } from '@/features/courses/types/courseTypes';

export interface ScoreTypeResult {
  p30: number; // İdari
  p35: number; // Diplomatik
  p48: number; // Genel
  details: {
    p30: Record<string, number>;
    p35: Record<string, number>;
    p48: Record<string, number>;
  };
}

/**
 * Calculates completion ratios for P30, P35, and P48 point types based on course mastery scores.
 *
 * P30 (Administrative) Weighting:
 * - GY: 10%
 * - GK: 10%
 * - Hukuk: 30%
 * - Kamu Yönetimi (Siyasal Bilgiler filter): 50%
 *
 * P35 (Diplomatic) Weighting:
 * - GY: 10%
 * - GK: 10%
 * - Hukuk: 30%
 * - Uluslararası İlişkiler (Siyasal Bilgiler filter): 50%
 *
 * P48 (General Field) Weighting:
 * - GY: 10%
 * - GK: 10%
 * - Hukuk: 20%
 * - İktisat: 20%
 * - Maliye: 20%
 * - Muhasebe: 20%
 */
export function calculateScoreTypeProgress(
  masteries: CourseMastery[]
): ScoreTypeResult {
  const result: ScoreTypeResult = {
    p30: 0,
    p35: 0,
    p48: 0,
    details: {
      p30: {},
      p35: {},
      p48: {},
    },
  };

  if (!masteries.length) return result;

  // --- Manual Mapping based on Knowledge about the course structure ---
  // In a real app, masteries should ideally include category info.
  // Since we saw courseMasteryService.ts fetches 'type' but not 'category_name' in local type,
  // we'll use string matches or we might need to update the service.

  const gyCourses = ['Matematik ve Geometri', 'Sözel Mantık', 'Türkçe']; // Türkçe was not in DB but expected
  const gkCourses = ['Tarih', 'Coğrafya', 'Vatandaşlık', 'Sözel Mantık'];
  const hukukCourses = masteries
    .filter(
      (m) =>
        m.courseName.toLowerCase().includes('hukuku') ||
        m.courseName === 'Anayasa Hukuku' ||
        m.courseName === 'İdare Hukuku'
    )
    .map((m) => m.courseName);

  const iktisatCourses = masteries
    .filter(
      (m) =>
        m.courseName.toLowerCase().includes('iktisat') ||
        m.courseName.includes('Ekonomisi') ||
        m.courseName.includes('Para, Banka')
    )
    .map((m) => m.courseName);

  const maliyeCourses = ['Maliye'];
  const muhasebeCourses = ['Muhasebe'];

  // Siyasal Bilgiler Split
  const kyCourses = [
    'Yönetim Bilimi',
    'Yerel Yönetimler',
    'Siyaset Bilimi',
    'Türk Siyasal Hayatı',
  ];
  const uiCourses = [
    'Uluslararası İlişkiler Kuramları',
    'Türk Dış Politikası',
    'Diplomasi Tarihi',
    'Uluslararası Hukuk',
    'Uluslararası Örgütler',
  ];

  const getAvgByList = (names: string[]) => {
    const matches = masteries.filter((m) => names.includes(m.courseName));
    return matches.length
      ? matches.reduce((acc, curr) => acc + curr.masteryScore, 0) /
          matches.length
      : 0;
  };

  // P30 Calculation
  const p30_gy = getAvgByList(gyCourses);
  const p30_gk = getAvgByList(gkCourses);
  const p30_hukuk = getAvgByList(hukukCourses);
  const p30_ky = getAvgByList(kyCourses);

  result.p30 = Math.round(
    p30_gy * 0.1 + p30_gk * 0.1 + p30_hukuk * 0.3 + p30_ky * 0.5
  );
  result.details.p30 = {
    gy: p30_gy,
    gk: p30_gk,
    hukuk: p30_hukuk,
    ky: p30_ky,
  };

  // P35 Calculation
  const p35_gy = getAvgByList(gyCourses);
  const p35_gk = getAvgByList(gkCourses);
  const p35_hukuk = getAvgByList(hukukCourses);
  const p35_ui = getAvgByList(uiCourses);

  result.p35 = Math.round(
    p35_gy * 0.1 + p35_gk * 0.1 + p35_hukuk * 0.3 + p35_ui * 0.5
  );
  result.details.p35 = {
    gy: p35_gy,
    gk: p35_gk,
    hukuk: p35_hukuk,
    ui: p35_ui,
  };

  // P48 Calculation
  const p48_gy = getAvgByList(gyCourses);
  const p48_gk = getAvgByList(gkCourses);
  const p48_hukuk = getAvgByList(hukukCourses);
  const p48_iktisat = getAvgByList(iktisatCourses);
  const p48_maliye = getAvgByList(maliyeCourses);
  const p48_muhasebe = getAvgByList(muhasebeCourses);

  result.p48 = Math.round(
    p48_gy * 0.1 +
      p48_gk * 0.1 +
      p48_hukuk * 0.2 +
      p48_iktisat * 0.2 +
      p48_maliye * 0.2 +
      p48_muhasebe * 0.2
  );
  result.details.p48 = {
    gy: p48_gy,
    gk: p48_gk,
    hukuk: p48_hukuk,
    iktisat: p48_iktisat,
    maliye: p48_maliye,
    muhasebe: p48_muhasebe,
  };

  return result;
}
