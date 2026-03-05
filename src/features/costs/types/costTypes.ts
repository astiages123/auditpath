import { z } from 'zod';

// ==========================================
// SCHEMAS
// ==========================================

/**
 * Zod schema for validating raw AI generation cost logs from Supabase.
 */
export const GenerationCostLogSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  provider: z.string().nullable().optional(),
  cost_usd: z.number().nullable(),
  model: z.string().nullable(),
  usage_type: z.string().nullable(),
  total_tokens: z.number().nullable(),
  completion_tokens: z.number().nullable(),
  prompt_tokens: z.number().nullable(),
  cached_tokens: z.number().nullable(),
  latency_ms: z.number().nullable().optional(),
  status: z.number().nullable().optional(),
});

// ==========================================
// TYPES
// ==========================================

/**
 * Type inferred from the GenerationCostLogSchema.
 * Represents an entry in the AI generation costs table.
 */
export type GenerationCostLog = z.infer<typeof GenerationCostLogSchema>;
