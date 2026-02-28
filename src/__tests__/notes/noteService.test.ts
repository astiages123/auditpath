/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchCourseNotes,
  invokeNotionSync,
} from '../../features/notes/services/noteService';
import { supabase } from '@/lib/supabase';
import {
  getCourseIdBySlug,
  getCourseTopics,
} from '@/features/quiz/services/quizCoreService';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('@/features/quiz/services/quizCoreService', () => ({
  getCourseIdBySlug: vi.fn(),
  getCourseTopics: vi.fn(),
}));

vi.mock('../../features/notes/logic/contentProcessor', () => ({
  processTopicContent: vi.fn((content) => content),
}));

describe('noteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchCourseNotes', () => {
    it('1. Geçerli bir kurs slugı ile verileri başarıyla çeker', async () => {
      vi.mocked(getCourseIdBySlug).mockResolvedValue('c123');
      vi.mocked(getCourseTopics).mockResolvedValue([
        {
          id: 't1',
          course_id: 'c123',
          course_name: 'Audit 101',
          section_title: 'Introduction',
          chunk_order: 1,
          content: 'Test content',
          metadata: {},
          ai_logic: {},
          status: 'COMPLETED',
          created_at: new Date().toISOString(),
          last_synced_at: null,
        } as any,
      ]);

      const result = await fetchCourseNotes('u1', 'audit-101');

      expect(result?.courseName).toBe('Audit 101');
      expect(result?.chunks.length).toBe(1);
      expect(getCourseIdBySlug).toHaveBeenCalledWith('audit-101', undefined);
      expect(getCourseTopics).toHaveBeenCalledWith('u1', 'c123', undefined);
    });

    it('2. Kurs bulunamazsa null döner', async () => {
      vi.mocked(getCourseIdBySlug).mockResolvedValue(null);

      const result = await fetchCourseNotes('u1', 'invalid-slug');

      expect(result).toBeNull();
      expect(getCourseTopics).not.toHaveBeenCalled();
    });
  });

  describe('invokeNotionSync', () => {
    it('1. Başarılı senkronizasyon yanıtını döner', async () => {
      const mockResponse = {
        success: true,
        stats: { synced: 5, deleted: 0, skipped: 0, errors: 0 },
      };
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const result = await invokeNotionSync();

      expect(result.success).toBe(true);
      expect(result.stats?.synced).toBe(5);
    });

    it('2. Senkronizasyon hatasında hata fırlatır', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: new Error('Sync failed'),
      });

      await expect(invokeNotionSync()).rejects.toThrow(
        'Senkronizasyon servisinden yanıt alınamadı.'
      );
    });
  });
});
