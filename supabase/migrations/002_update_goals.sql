-- Migrate existing goal values to new names
UPDATE public.profiles SET goal = 'lose_fat' WHERE goal = 'lose';
UPDATE public.profiles SET goal = 'build_strength' WHERE goal = 'gain';
-- 'maintain' stays as 'maintain'

-- Replace the goal check constraint with new allowed values
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_goal_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_goal_check
  CHECK (goal IN ('lose_fat', 'recomposition', 'build_strength', 'maintain'));
