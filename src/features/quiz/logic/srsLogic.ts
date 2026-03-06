import { type QuizResults, type SubmissionResult } from '../types';

/**
 * Kullanıcı performansı ve mevcut sürece göre yeni tekrar sayısını hesaplar.
 * @param currentRepCount - Mevcut başarılı tekrar sayısı
 * @param responseType - Yanıt tipi ('correct', 'incorrect', 'blank')
 * @returns Yeni tekrar sayısı
 */
export function calculateNextRepCount(
  currentRepCount: number,
  responseType: 'correct' | 'incorrect' | 'blank'
): number {
  if (responseType === 'correct') {
    // ADIM 1: Yanıt doğruysa, başarılı tekrar sayısını bir artır.
    return currentRepCount + 1;
  }
  // ADIM 2: Yanlış veya boş yanıtlarda tekrar sayısı SRS kuralı gereği sıfırlanır.
  return 0;
}

/**
 * Bir sonraki inceleme oturumunun (session) ne zaman olacağını hesaplar.
 * @param responseType - Yanıt tipi
 * @param currentRepCount - Mevcut başarılı tekrar sayısı (yeni hesaplanan)
 * @returns Kaç oturum sonra inceleneceği (session offset)
 */
export function calculateNextSession(
  responseType: 'correct' | 'incorrect' | 'blank',
  currentRepCount: number
): number {
  // ADIM 1: Yanıt yanlış veya boş ise, öğrenciye en kısa sürede (bir sonraki oturumda) tekrar sor.
  if (responseType !== 'correct') return 1;

  // ADIM 2: Yanıt doğruysa, başarılı tekrar sayısına göre aralığı logaritmik olarak artır.
  // Bu, Spaced Repetition (Aralıklı Tekrar) metodunun temelidir.
  // 0 -> 1 (ilk doğru cevap sonrası bir oturum ara)
  // 1 -> 2
  // 2 -> 4
  // 3 -> 7
  // 4+ -> 10 (maksimum 10 oturum aralık)
  const sessionIntervals = [1, 2, 4, 7, 10];
  const intervalIndex = Math.min(currentRepCount, sessionIntervals.length - 1);

  return sessionIntervals[intervalIndex];
}

/**
 * Yanıt tipine göre skor değişim miktarını hesaplar.
 * @param responseType - Yanıt tipi
 * @returns Skor değişim miktarı (delta)
 */
export function calculateScoreChange(
  responseType: 'correct' | 'incorrect' | 'blank'
): number {
  switch (responseType) {
    case 'correct':
      // Doğru cevap: +10 puan
      return 10;
    case 'incorrect':
      // Yanlış cevap: -5 puan
      return -5;
    case 'blank':
      // Boş bırakılan: -2 puan
      return -2;
    default:
      return 0;
  }
}

/**
 * Quiz sonuçlarını SRS sistemine göre işler ve sunulacak özeti hesaplar.
 * @param results - Quiz sonuç verileri
 * @returns TestResultSummary nesnesi
 */
export function processQuizResults(
  results: QuizResults,
  _totalToGenerate: number
): {
  percentage: number;
  isSuccessful: boolean;
} {
  const total = results.correct + results.incorrect + results.blank;
  const percentage = total > 0 ? (results.correct / total) * 100 : 0;

  // SRS bazlı başarı kararı (%70 eşik değeri)
  const isSuccessful = percentage >= 70;

  return {
    percentage,
    isSuccessful,
  };
}
/**
 * Quiz sonucunu SRS sistemine göre hesaplar.
 * @param currentStatus - Mevcut soru durumu
 * @param responseType - Yanıt tipi
 * @param currentMastery - Mevcut chunk mastery skoru
 * @param sessionNumber - Mevcut oturum numarası
 * @returns SubmissionResult nesnesi
 */
export function calculateQuizResult(
  currentStatus: { rep_count: number } | null,
  responseType: 'correct' | 'incorrect' | 'blank',
  _currentMastery: number,
  sessionNumber: number
): SubmissionResult {
  const currentRep = currentStatus?.rep_count ?? 0;
  const newRepCount = calculateNextRepCount(currentRep, responseType);
  const nextSessionOffset = calculateNextSession(responseType, newRepCount);

  return {
    newStatus: newRepCount >= 3 ? 'mastered' : 'reviewing',
    newRepCount,
    nextReviewSession: sessionNumber + nextSessionOffset,
    scoreDelta: calculateScoreChange(responseType),
    isCorrect: responseType === 'correct',
    newMastery: 0,
  };
}
