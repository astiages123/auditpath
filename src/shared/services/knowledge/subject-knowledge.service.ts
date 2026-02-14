import { supabase } from '@/shared/services/supabase';
import type { Database } from '@/shared/types/database.types';
import { logger } from '@/shared/utils/logger';

type SubjectGuideline =
  Database['public']['Tables']['subject_guidelines']['Row'];

/**
 * Subject Knowledge Service
 *
 * Manages subject-specific guidelines and knowledge data.
 * Features:
 * - 5-minute caching
 * - App-start preloading
 * - Fallback to partial data if needed
 */
class SubjectKnowledgeService {
  private cache: Map<string, { data: SubjectGuideline; timestamp: number }> =
    new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private preloaded = false;

  /**
   * Initialize service and preload data (fire and forget)
   */
  public async preload(): Promise<void> {
    if (this.preloaded) return;

    try {
      const { data, error } = await supabase
        .from('subject_guidelines')
        .select('*');

      if (error) throw error;

      if (data) {
        const now = Date.now();
        data.forEach((item) => {
          // Cache by subject_name (as primary lookup key for now)
          this.cache.set(item.subject_name, {
            data: item,
            timestamp: now,
          });
          // Also cache by subject_code if it exists
          if (item.subject_code) {
            this.cache.set(item.subject_code, {
              data: item,
              timestamp: now,
            });
          }
        });
      }
      this.preloaded = true;
    } catch (error) {
      logger.error('[SubjectKnowledgeService] Preload failed:', error as Error);
    }
  }

  /**
   * Get guidelines for a specific subject
   * Uses cache if valid, otherwise fetches from DB
   */
  public async getGuidelines(
    subjectNameOrCode: string
  ): Promise<SubjectGuideline | null> {
    const now = Date.now();
    const cached = this.cache.get(subjectNameOrCode);

    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      // Check if cache is still valid
      return cached.data;
    }

    // Try fetching by subject_name first
    const query = supabase
      .from('subject_guidelines')
      .select('*')
      .eq('subject_name', subjectNameOrCode)
      .maybeSingle();

    let { data, error } = await query;

    // If not found, try by subject_code (if distinct)
    if (!data && !error) {
      const { data: codeData, error: codeError } = await supabase
        .from('subject_guidelines')
        .select('*')
        .eq('subject_code', subjectNameOrCode)
        .maybeSingle();

      data = codeData;
      error = codeError;
    }

    if (error) {
      logger.error('[SubjectKnowledgeService] Fetch error:', error);
      return null;
    }

    if (data) {
      this.cache.set(subjectNameOrCode, { data, timestamp: now });
      // Cache by the other key as well to save future lookups
      if (data.subject_name !== subjectNameOrCode) {
        this.cache.set(data.subject_name, { data, timestamp: now });
      }
      if (data.subject_code && data.subject_code !== subjectNameOrCode) {
        this.cache.set(data.subject_code, { data, timestamp: now });
      }
    }

    return data;
  }

  /**
   * Clear the cache manually
   */
  public clearCache(): void {
    this.cache.clear();
    this.preloaded = false;
  }
}

export const subjectKnowledgeService = new SubjectKnowledgeService();
