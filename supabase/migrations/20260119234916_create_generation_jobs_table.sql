-- Create generation_jobs table
create table if not exists public.generation_jobs (
    id uuid not null default gen_random_uuid(),
    chunk_id uuid not null references public.note_chunks(id) on delete cascade,
    job_type text not null check (job_type in ('ANTRENMAN', 'ARSIV', 'DENEME')),
    status text not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    priority int not null default 2, -- 1: High (Antrenman), 2: Low (Nightly)
    target_count int not null default 5,
    attempts int not null default 0,
    error_message text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint generation_jobs_pkey primary key (id)
);

-- Enable RLS
alter table public.generation_jobs enable row level security;

-- Policies
-- Service role should have full access.
-- Authenticated users (if any logic runs on client) might need read access, but mostly this is backend.
-- Letting service_role handle everything for now, but adding a policy for future proofing if client needs to see status.

create policy "Enable read for authenticated users"
on public.generation_jobs
for select
to authenticated
using (true); -- Ideally should verify user ownership via chunk_id -> note_chunks -> course -> user, but for now open read is fine for internal tool

-- Trigger for updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger handle_updated_at before update on public.generation_jobs
  for each row execute procedure update_updated_at_column();

-- Index for faster queue polling
create index generation_jobs_status_priority_idx on public.generation_jobs (status, priority asc, created_at asc);
