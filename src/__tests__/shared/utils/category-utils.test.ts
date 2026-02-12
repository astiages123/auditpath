import { describe, expect, it } from 'vitest';
import { normalizeCategorySlug } from '@/shared/lib/core/utils/category-utils';

describe('category-utils', () => {
  describe('normalizeCategorySlug', () => {
    it('should map EKONOMİ to EKONOMI', () => {
      expect(normalizeCategorySlug('EKONOMİ')).toBe('EKONOMI');
    });

    it('should map HUKUK to HUKUK', () => {
      expect(normalizeCategorySlug('HUKUK')).toBe('HUKUK');
    });

    it('should map MUHASEBE VE MALİYE to MUHASEBE_MALIYE', () => {
      expect(normalizeCategorySlug('MUHASEBE VE MALİYE')).toBe(
        'MUHASEBE_MALIYE'
      );
    });

    it('should map GENEL YETENEK VE İNGİLİZCE to GENEL_YETENEK', () => {
      expect(normalizeCategorySlug('GENEL YETENEK VE İNGİLİZCE')).toBe(
        'GENEL_YETENEK'
      );
    });

    it('should return the original name if no mapping exists', () => {
      expect(normalizeCategorySlug('UNKNOWN CATEGORY')).toBe(
        'UNKNOWN CATEGORY'
      );
    });

    it('should be case sensitive as per current implementation', () => {
      // The current implementation uses a direct lookup which is case sensitive
      expect(normalizeCategorySlug('ekonomi')).toBe('ekonomi');
    });
  });
});
