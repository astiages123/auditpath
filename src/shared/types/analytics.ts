export interface ExchangeRate {
  currency_pair: string;
  rate: number;
  updated_at: string;
}

export interface AiGenerationCost {
  id: string;
  user_id: string;
  provider: string;
  model: string;
  usage_type: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  cached_tokens: number | null;
  total_tokens: number | null;
  created_at: string | null;
  cost_usd: number | null;
  latency_ms: number | null;
  status: number | null;
}

// Helper to extend the Database type locally if needed,
// though we might just use these interfaces directly in the service/components.
