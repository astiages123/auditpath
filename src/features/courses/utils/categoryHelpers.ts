/**
 * Category helper functions.
 * Provides utilities for category name normalization and slug handling.
 */

/**
 * Normalize category names to database slugs for consistent matching.
 *
 * @param rawName Raw category name
 * @returns Normalized category slug
 */
export function normalizeCategorySlug(rawName: string): string {
  const slugMap: Record<string, string> = {
    İKTİSAT: 'IKTISAT',
    HUKUK: 'HUKUK',
    'MUHASEBE VE MALİYE': 'MUHASEBE_MALIYE',
    'GENEL YETENEK VE GENEL KÜLTÜR': 'GY_GK',
    'SİYASAL BİLGİLER': 'SIYASAL_BILGILER',
    'KAMU YÖNETİMİ VE ULUSLARARASI İLİŞKİLER': 'SIYASAL_BILGILER',
  };
  return slugMap[rawName] || rawName;
}
