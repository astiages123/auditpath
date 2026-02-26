-- Drop existing policy
drop policy if exists "Users can manage their own progress" on public.user_notes_progress;

-- Recreate with TO authenticated
create policy "Users can manage their own progress"
  on public.user_notes_progress
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
