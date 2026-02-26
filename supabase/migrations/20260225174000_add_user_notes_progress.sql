-- Create user_notes_progress table
create table if not exists public.user_notes_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  chunk_id uuid references public.note_chunks(id) on delete cascade not null,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  updated_at timestamp with time zone default now() not null,
  unique(user_id, chunk_id)
);

-- Enable RLS
alter table public.user_notes_progress enable row level security;

-- Policies
create policy "Users can view their own notes progress"
  on public.user_notes_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert their own notes progress"
  on public.user_notes_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own notes progress"
  on public.user_notes_progress for update
  using (auth.uid() = user_id);
