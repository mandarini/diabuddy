-- push_subscriptions: one row per device on which a user enabled reminders
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "select_own_push_subscriptions" ON public.push_subscriptions FOR SELECT
  TO authenticated USING ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "insert_own_push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "insert_own_push_subscriptions" ON public.push_subscriptions FOR INSERT
  TO authenticated WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "update_own_push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "update_own_push_subscriptions" ON public.push_subscriptions FOR UPDATE
  TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
DROP POLICY IF EXISTS "delete_own_push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "delete_own_push_subscriptions" ON public.push_subscriptions FOR DELETE
  TO authenticated USING ((select auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions (user_id);

-- set only by the send-glucose-reminders Edge Function; never written by the client
ALTER TABLE public.meal_entries ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
