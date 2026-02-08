
-- Create exchange_rates table
CREATE TABLE IF NOT EXISTS "public"."exchange_rates" (
    "currency_pair" "text" NOT NULL,
    "rate" numeric NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    PRIMARY KEY ("currency_pair")
);

ALTER TABLE "public"."exchange_rates" OWNER TO "postgres";

-- Enable RLS
ALTER TABLE "public"."exchange_rates" ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read access to authenticated users" ON "public"."exchange_rates"
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow update access to authenticated users (so any user can refresh the cache if needed)
-- In a real production app, this might be restricted to a service role or admin function, 
-- but given the instruction "Kuru günde bir kez çekip sakla", client-side trigger is acceptable for now.
CREATE POLICY "Allow update access to authenticated users" ON "public"."exchange_rates"
    FOR ALL USING (auth.role() = 'authenticated');


-- Create ai_generation_costs view
CREATE OR REPLACE VIEW "public"."ai_generation_costs" AS
SELECT
    id,
    user_id,
    provider,
    model,
    usage_type,
    prompt_tokens,
    completion_tokens,
    cached_tokens,
    total_tokens,
    created_at,
    -- Cost Calculation: ((cached_tokens * 0.028) + ((prompt_tokens - cached_tokens) * 0.28) + (completion_tokens * 0.42)) / 1000000
    (
        (COALESCE(cached_tokens, 0) * 0.028) + 
        ((COALESCE(prompt_tokens, 0) - COALESCE(cached_tokens, 0)) * 0.28) + 
        (COALESCE(completion_tokens, 0) * 0.42)
    ) / 1000000.0 AS cost_usd
FROM
    "public"."ai_generation_logs";

ALTER VIEW "public"."ai_generation_costs" OWNER TO "postgres"; 
