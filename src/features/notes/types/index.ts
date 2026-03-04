/**
 * @file overview
 * Bu dosya, notlar özelliği için kullanılan temel veri tiplerini dışa aktarır.
 */

// === BÖLÜM ADI: SEARCH TYPES ===
// ===========================

/**
 * Arama sonuçlarında dönen her bir öğeyi temsil eden arayüz.
 */
export interface SearchResult {
  /** Sonucun benzersiz kimliği */
  id: string;
  /** Eşleşen metinden önceki bağlam */
  before: string;
  /** Eşleşen anahtar kelimenin kendisi */
  match: string;
  /** Eşleşen metinden sonraki bağlam */
  after: string;
  /** Orijinal içerik içindeki başlangıç indeksi */
  index: number;
}
