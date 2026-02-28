import { describe, expect, it } from 'vitest';
import { generateTOCFromContent } from '../../features/notes/logic/notesLogic';
import { type CourseTopic } from '@/features/courses/types/courseTypes';

describe('notesLogic - generateTOCFromContent', () => {
  const mockChunks: CourseTopic[] = [
    {
      id: '1',
      section_title: 'Giriş',
      content:
        '# Giriş Alt Başlık\nBazı içerikler buraya gelecek.\n## Detaylı Bakış',
      course_id: 'c1',
      course_name: 'Test Course',
      chunk_order: 0,
      metadata: {},
      created_at: '',
      ai_logic: {},
      last_synced_at: null,
      status: 'COMPLETED',
    },
    {
      id: '2',
      section_title: 'İleri Seviye',
      content: '# İleri Konular\n### Derinlemesine Analiz',
      course_id: 'c1',
      course_name: 'Test Course',
      chunk_order: 1,
      metadata: {},
      created_at: '',
      ai_logic: {},
      last_synced_at: null,
      status: 'COMPLETED',
    },
  ];

  it('1. Boş veri seti olduğunda boş dizi döner', () => {
    expect(generateTOCFromContent([])).toEqual([]);
  });

  it('2. Chunk başlıklarını Level 1 olarak ekler', () => {
    const toc = generateTOCFromContent(mockChunks);
    expect(toc).toContainEqual(
      expect.objectContaining({
        title: 'Giriş',
        level: 1,
      })
    );
    expect(toc).toContainEqual(
      expect.objectContaining({
        title: 'İleri Seviye',
        level: 1,
      })
    );
  });

  it('3. Markdown başlıklarını (#, ##, ###) doğru seviyelerle ayrıştırır', () => {
    const toc = generateTOCFromContent(mockChunks);

    // Logic says: # -> Level 2, ## -> Level 3, ### -> Level 4 (since Chunk Title is Level 1)
    expect(toc).toContainEqual(
      expect.objectContaining({
        title: 'Giriş Alt Başlık',
        level: 2,
      })
    );
    expect(toc).toContainEqual(
      expect.objectContaining({
        title: 'Detaylı Bakış',
        level: 3,
      })
    );
    expect(toc).toContainEqual(
      expect.objectContaining({
        title: 'Derinlemesine Analiz',
        level: 4,
      })
    );
  });

  it('4. Başlıkları slugify ederek ID oluşturur', () => {
    const toc = generateTOCFromContent(mockChunks);
    const entry = toc.find((t) => t.title === 'Giriş Alt Başlık');
    expect(entry?.id).toBe('giris-alt-baslik');
  });

  it('5. Aynı IDye sahip başlıkları dedupe eder', () => {
    const duplicateChunks: CourseTopic[] = [
      {
        ...mockChunks[0],
        content: '# Tekrar Eden Başlık',
      },
      {
        ...mockChunks[1],
        section_title: 'Farklı Chunk',
        content: '# Tekrar Eden Başlık',
      },
    ];

    const toc = generateTOCFromContent(duplicateChunks);
    const duplicateEntries = toc.filter(
      (t) => t.title === 'Tekrar Eden Başlık'
    );
    expect(duplicateEntries.length).toBe(1);
  });
});
