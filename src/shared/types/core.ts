import { User as SupabaseUser } from '@supabase/supabase-js';

/**
 * Standard User interface, potentially extending Supabase User with app-specific fields
 */
export type User = SupabaseUser;

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

/**
 * Common timestamp type for consistency
 */
export type Timestamp = string; // ISO String

/**
 * Common Theme/Visual types
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * LLM Interaction Base Types
 */
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponseMetadata {
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cached_tokens?: number;
    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
  };
}

/**
 * General purpose logging callback
 */
export type LogCallback = (
  message: string,
  details?: Record<string, unknown>
) => void;

/**
 * Rank system types
 */
export interface Rank {
  id: string;
  name: string;
  minPercentage: number;
  color: string;
  motto: string;
  imagePath: string;
  order: number;
}
