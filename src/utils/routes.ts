/**
 * Uygulama genelinde kullanılan tüm sayfa rotalarının (URL path) merkezi listesi.
 */
export const ROUTES = {
  /** Ana sayfa */
  HOME: '/',
  /** Başarılar sayfası */
  ACHIEVEMENTS: '/achievements',
  /** İstatistikler sayfası */
  STATISTICS: '/statistics',
  /** Maliyet analizi sayfası */
  COSTS: '/costs',
  /** Notlar sayfası */
  NOTES: '/notes',
  /** Bilgi testi (Quiz) sayfası */
  QUIZ: '/quiz',
  /** Kütüphane / Kaynaklar sayfası */
  LIBRARY: '/library',
  /** Yol haritası sayfası */
  ROADMAP: '/roadmap',
  /** Çalışma takvimi sayfası */
  SCHEDULE: '/schedule',
} as const;
