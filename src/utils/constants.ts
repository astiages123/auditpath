/**
 * Uygulama genelinde kullanılan global sabitler.
 * Özelliğe (feature) özel sabitler ilgili özellik klasörlerinde tutulmalıdır.
 */

// ===========================
// === OTURUM VE CACHE ===
// ===========================

/**
 * Oturum geçerlilik süresi (12 saat).
 * JWT token kontrolleri için kullanılır.
 */
export const SESSION_VALIDITY_DURATION_MS = 12 * 60 * 60 * 1000;

/**
 * Varsayılan yerel depolama (localStorage) yaşam süresi (24 saat).
 */
export const DEFAULT_STORAGE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Çevrimdışı işlem kuyruğu ömrü (7 gün).
 */
export const OFFLINE_QUEUE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ===========================
// === SİSTEM AYARLARI ===
// ===========================

/**
 * Yapay Zeka (LLM) istek zaman aşımı süresi (90 saniye).
 */
export const LLM_TIMEOUT_MS = 90000;
