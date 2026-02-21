CREATE OR REPLACE VIEW "public"."ai_generation_costs" AS
 SELECT id,
    user_id,
    provider,
    model,
    usage_type,
    prompt_tokens,
    completion_tokens,
    cached_tokens,
    total_tokens,
    created_at,
        CASE
            WHEN provider ~~* 'deepseek' THEN (COALESCE(cached_tokens, 0)::numeric * 0.028 + (COALESCE(prompt_tokens, 0) - COALESCE(cached_tokens, 0))::numeric * 0.28 + COALESCE(completion_tokens, 0)::numeric * 0.42) / 1000000.0
            WHEN provider ~~* 'mimo' THEN (COALESCE(cached_tokens, 0)::numeric * 0.01 + (COALESCE(prompt_tokens, 0) - COALESCE(cached_tokens, 0))::numeric * 0.1 + COALESCE(completion_tokens, 0)::numeric * 0.3) / 1000000.0
            ELSE 0::numeric
        END AS cost_usd
   FROM ai_generation_logs;
