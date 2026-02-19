import { z } from 'zod';

export const AiGenerationCostSchema = z.object({
  id: z.string(),
  created_at: z.string(),
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

export type AiGenerationCost = z.infer<typeof AiGenerationCostSchema>;
