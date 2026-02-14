import { describe, expect, it, vi } from 'vitest';
import { getCelebrationAsset } from './celebration-assets';

// Mock dependencies
vi.mock('@/features/courses', () => ({
  coursesData: [
    {
      category: 'HUKUK',
      courses: [{ id: 'course-1', name: 'Test Course' }],
    },
  ],
  getCourseIcon: vi.fn(),
}));

describe('getCelebrationAsset', () => {
  it('returns rank asset for RANK_UP ids', () => {
    const asset = getCelebrationAsset('RANK_UP:2');
    expect(asset.variant).toBe('rank');
    expect(asset.title).toBe('YENİ UNVAN');
    expect(asset.description).toBe('Yazıcı');
  });

  it('returns rank asset for unknown RANK_UP ids', () => {
    const asset = getCelebrationAsset('RANK_UP:UnknownRank');
    expect(asset.variant).toBe('rank');
    expect(asset.title).toBe('YENİ UNVAN');
    expect(asset.description).toBe('UnknownRank');
  });

  it('returns course asset for COURSE_COMPLETION ids', () => {
    const asset = getCelebrationAsset('COURSE_COMPLETION:course-1');
    expect(asset.variant).toBe('course');
    expect(asset.title).toBe('DERS TAMAMLANDI');
    expect(asset.description).toBe('Test Course');
  });

  it('returns category asset for CATEGORY_COMPLETION ids', () => {
    const asset = getCelebrationAsset('CATEGORY_COMPLETION:HUKUK');
    expect(asset.variant).toBe('achievement');
    expect(asset.title).toBe('GRUP TAMAMLANDI');
    expect(asset.description).toBe('HUKUK TAMAMLANDI');
  });

  it('returns achievement asset for standard achievement ids', () => {
    const asset = getCelebrationAsset('hukuk_10');
    expect(asset.variant).toBe('achievement');
    expect(asset.title).toBe('Yasa Tozu');
    expect(asset.imageUrl).toBe('/badges/hukuk-10.webp');
  });

  it('returns fallback asset for unknown ids', () => {
    const asset = getCelebrationAsset('unknown-id');
    expect(asset.variant).toBe('achievement');
    expect(asset.title).toBe('BAŞARIM AÇILDI');
    expect(asset.description).toBe('Bilinmeyen Başarım');
  });
});
