// === SECTION: Application Limits ===

/** Bir konunun ustalık sayılması için gereken başarı puanı (%) */
export const MASTERY_THRESHOLD = 80;

/** Günlükte tutulacak maksimum kayıt sayısı */
export const MAX_LOG_ENTRIES = 50;

// === SECTION: Configuration Objects ===

/** Quiz yapılandırma sabitleri */
export const QUIZ_CONFIG = {
  /** Her kavram için varsayılan soru adetleri */
  DEFAULT_QUOTAS: { antrenman: 5, deneme: 1 },
  /** Ustalık seviyesi eşikleri */
  MASTERY_THRESHOLDS: { EXCELLENT: 80, GOOD: 50 },
  /** Uygulama genel limitleri */
  /** Bir kavram haritasında kavram başına düşen soru hedefi */
  QUESTIONS_PER_CONCEPT: 3,
} as const;
