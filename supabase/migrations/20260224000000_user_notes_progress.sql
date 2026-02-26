create table if not exists public.user_notes_progress (
  user_id uuid references auth.users(id) on delete cascade not null,
  chunk_id uuid references public.note_chunks(id) on delete cascade not null,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, chunk_id)
);

alter table public.user_notes_progress enable row level security;

create policy "Users can manage their own progress"
  on public.user_notes_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
