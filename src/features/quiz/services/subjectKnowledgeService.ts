import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';
import { logger } from '@/utils/logger';

type SubjectGuideline =
  Database['public']['Tables']['subject_guidelines']['Row'];

/**
 * Subject Knowledge Service
 *
 * Manages subject-specific guidelines and knowledge data.
 */

// Module-level cache and state
const cache = new Map<string, { data: SubjectGuideline; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let preloaded = false;

/**
 * Initialize service and preload data (fire and forget)
 */
export async function preloadSubjectKnowledge(): Promise<void> {
  if (preloaded) return;

  try {
    const { data, error } = await supabase
      .from('subject_guidelines')
      .select('*');

    if (error) throw error;

    if (data) {
      const now = Date.now();
      data.forEach((item) => {
        // Cache by subject_name (as primary lookup key for now)
        cache.set(item.subject_name, {
          data: item,
          timestamp: now,
        });
        // Also cache by subject_code if it exists
        if (item.subject_code) {
          cache.set(item.subject_code, {
            data: item,
            timestamp: now,
          });
        }
      });
    }
    preloaded = true;
  } catch (error) {
    logger.error('[SubjectKnowledgeService] Preload failed:', error as Error);
  }
}

/**
 * Get guidelines for a specific subject
 * Uses cache if valid, otherwise fetches from DB
 */
export async function getSubjectGuidelines(
  subjectNameOrCode: string
): Promise<SubjectGuideline | null> {
  const now = Date.now();
  const cached = cache.get(subjectNameOrCode);

  if (cached && now - cached.timestamp < CACHE_TTL) {
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
    cache.set(subjectNameOrCode, { data, timestamp: now });
    // Cache by the other key as well to save future lookups
    if (data.subject_name !== subjectNameOrCode) {
      cache.set(data.subject_name, { data, timestamp: now });
    }
    if (data.subject_code && data.subject_code !== subjectNameOrCode) {
      cache.set(data.subject_code, { data, timestamp: now });
    }
  }

  return data;
}

/**
 * Clear the cache manually
 */
export function clearSubjectKnowledgeCache(): void {
  cache.clear();
  preloaded = false;
}

/**
 * Singleton object for backward compatibility and easy grouped access
 */
export const subjectKnowledgeService = {
  preload: preloadSubjectKnowledge,
  getGuidelines: getSubjectGuidelines,
  clearCache: clearSubjectKnowledgeCache,
};
