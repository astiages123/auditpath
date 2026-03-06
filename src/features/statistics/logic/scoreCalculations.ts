import { CourseMastery } from '@/features/courses/types/courseTypes';

/**
 * Result structure for the different score types and their underlying category details.
 */
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
 * Calculates estimated completion percentage for P30, P35, and P48 point types
 * based on the user's course mastery scores.
 *
 * It uses predefined weighting factors for each score type:
 *
 * P30 (Administrative) Weighting:
 * - Genel Yetenek (GY): 10%
 * - Genel Kültür (GK): 10%
 * - Hukuk: 30%
 * - Kamu Yönetimi (Siyasal Bilgiler subset): 50%
 *
 * P35 (Diplomatic) Weighting:
 * - Genel Yetenek (GY): 10%
 * - Genel Kültür (GK): 10%
 * - Hukuk: 30%
 * - Uluslararası İlişkiler (Siyasal Bilgiler subset): 50%
 *
 * P48 (General Field) Weighting:
 * - Genel Yetenek (GY): 10%
 * - Genel Kültür (GK): 10%
 * - Hukuk: 20%
 * - İktisat: 20%
 * - Maliye: 20%
 * - Muhasebe: 20%
 *
 * @param {CourseMastery[]} masteries - Array of course mastery data points
 * @returns {ScoreTypeResult} Object containing final calculated scores and detailed breakdowns
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

  if (masteries.length === 0) return result;

  const gyCourses = ['Matematik ve Geometri', 'Sözel Mantık', 'Türkçe'];
  const gkCourses = ['Tarih', 'Coğrafya', 'Vatandaşlık', 'Sözel Mantık'];

  const hukukCourses = masteries
    .filter(
      (mastery) =>
        mastery.courseName.toLowerCase().includes('hukuku') ||
        mastery.courseName === 'Anayasa Hukuku' ||
        mastery.courseName === 'İdare Hukuku'
    )
    .map((mastery) => mastery.courseName);

  const iktisatCourses = masteries
    .filter(
      (mastery) =>
        mastery.courseName.toLowerCase().includes('iktisat') ||
        mastery.courseName.includes('Ekonomisi') ||
        mastery.courseName.includes('Para, Banka')
    )
    .map((mastery) => mastery.courseName);

  const maliyeCourses = ['Maliye'];
  const muhasebeCourses = ['Muhasebe'];

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

  /**
   * Helper to average mastery scores for a specific list of subjects.
   */
  const getAvgByList = (courseNames: string[]): number => {
    const matchedMasteries = masteries.filter((mastery) =>
      courseNames.includes(mastery.courseName)
    );
    if (matchedMasteries.length === 0) return 0;

    const totalMasteryScore = matchedMasteries.reduce(
      (accumulator, currentMastery) =>
        accumulator + currentMastery.masteryScore,
      0
    );
    return totalMasteryScore / matchedMasteries.length;
  };

  const p30Gy = getAvgByList(gyCourses);
  const p30Gk = getAvgByList(gkCourses);
  const p30Hukuk = getAvgByList(hukukCourses);
  const p30Ky = getAvgByList(kyCourses);

  result.p30 = Math.round(
    p30Gy * 0.1 + p30Gk * 0.1 + p30Hukuk * 0.3 + p30Ky * 0.5
  );
  result.details.p30 = {
    gy: p30Gy,
    gk: p30Gk,
    hukuk: p30Hukuk,
    ky: p30Ky,
  };

  const p35Gy = getAvgByList(gyCourses);
  const p35Gk = getAvgByList(gkCourses);
  const p35Hukuk = getAvgByList(hukukCourses);
  const p35Ui = getAvgByList(uiCourses);

  result.p35 = Math.round(
    p35Gy * 0.1 + p35Gk * 0.1 + p35Hukuk * 0.3 + p35Ui * 0.5
  );
  result.details.p35 = {
    gy: p35Gy,
    gk: p35Gk,
    hukuk: p35Hukuk,
    ui: p35Ui,
  };

  const p48Gy = getAvgByList(gyCourses);
  const p48Gk = getAvgByList(gkCourses);
  const p48Hukuk = getAvgByList(hukukCourses);
  const p48Iktisat = getAvgByList(iktisatCourses);
  const p48Maliye = getAvgByList(maliyeCourses);
  const p48Muhasebe = getAvgByList(muhasebeCourses);

  result.p48 = Math.round(
    p48Gy * 0.1 +
      p48Gk * 0.1 +
      p48Hukuk * 0.2 +
      p48Iktisat * 0.2 +
      p48Maliye * 0.2 +
      p48Muhasebe * 0.2
  );
  result.details.p48 = {
    gy: p48Gy,
    gk: p48Gk,
    hukuk: p48Hukuk,
    iktisat: p48Iktisat,
    maliye: p48Maliye,
    muhasebe: p48Muhasebe,
  };

  return result;
}
