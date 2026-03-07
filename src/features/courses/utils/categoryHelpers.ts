/**
 * Normalize category names to database slugs for consistent matching.
 *
 * @param rawName - Raw category name to be formatted
 * @returns Normalized category slug string
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
