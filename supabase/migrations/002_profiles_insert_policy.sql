-- Add missing INSERT policy for profiles so authenticated users can upsert their own row.
-- The trigger (handle_new_user) runs as security definer and bypasses RLS, but any
-- direct insert/upsert from the app is blocked without this policy.
create policy "Users can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- Add explicit WITH CHECK to the UPDATE policy (previously only had USING).
-- Prevents a user from updating their own row to set id = someone_else's uid.
alter policy "Users can update own profile"
  on public.profiles
  using (auth.uid() = id)
  with check (auth.uid() = id);
