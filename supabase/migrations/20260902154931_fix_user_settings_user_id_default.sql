ALTER TABLE public.user_settings
  ALTER COLUMN user_id SET DEFAULT auth.uid();
