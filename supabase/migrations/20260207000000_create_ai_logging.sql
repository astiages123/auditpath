create table if not exists ai_generation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  provider text not null,
  model text not null,
  usage_type text,
  prompt_tokens integer,
  completion_tokens integer,
  cached_tokens integer default 0,
  total_tokens integer,
  latency_ms integer,
  status integer,
  created_at timestamptz default now()
);

-- Enable RLS
alter table ai_generation_logs enable row level security;

-- Policies
create policy "Service role can insert logging"
  on ai_generation_logs
  for insert
  to service_role
  with check (true);

create policy "Users can view their own logs"
  on ai_generation_logs
  for select
  to authenticated
  using (auth.uid() = user_id);
