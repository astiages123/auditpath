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
    EKONOMİ: 'EKONOMI',
    HUKUK: 'HUKUK',
    'MUHASEBE VE MALİYE': 'MUHASEBE_MALIYE',
    'GENEL YETENEK VE İNGİZLİCE': 'GENEL_YETENEK',
  };
  return slugMap[rawName] || rawName;
}
