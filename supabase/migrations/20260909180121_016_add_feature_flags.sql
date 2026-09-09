-- feature_flags: one row per (flag, user); a missing row means the feature is off for that user.
-- Rows are managed from the SQL editor; clients may only read their own.
CREATE TABLE IF NOT EXISTS public.feature_flags (
  flag text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (flag, user_id)
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_feature_flags" ON public.feature_flags;
CREATE POLICY "select_own_feature_flags" ON public.feature_flags FOR SELECT
  TO authenticated USING ((select auth.uid()) = user_id);

GRANT SELECT ON public.feature_flags TO authenticated;
