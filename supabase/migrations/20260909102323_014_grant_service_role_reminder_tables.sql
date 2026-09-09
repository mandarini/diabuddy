-- The send-glucose-reminders Edge Function runs as service_role, which holds
-- no default table privileges in this project (see 002_grant_authenticated_privileges).
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, UPDATE ON public.meal_entries TO service_role;
GRANT SELECT, DELETE ON public.push_subscriptions TO service_role;
