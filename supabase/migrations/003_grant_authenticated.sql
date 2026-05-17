-- Grant DML access to authenticated role on all app tables.
-- The initial schema enabled RLS and created policies but omitted these
-- table-level grants, causing "permission denied" for all logged-in users.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.food_logs       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.water_logs      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_logs   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_plans   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meditation_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_notes     TO authenticated;
