create policy "Users can manage their own progress"
  on public.user_notes_progress
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
