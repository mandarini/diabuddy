-- Trigger functions resolve every object through an explicit schema, so a fixed empty
-- search_path removes the only way a caller could redirect them.
ALTER FUNCTION public.handle_updated_at() SET search_path = '';
ALTER FUNCTION public.validate_meal_carb_food() SET search_path = '';
ALTER FUNCTION public.validate_meal_pairing_food() SET search_path = '';

-- rls_auto_enable() ships with the project scaffold as a SECURITY DEFINER helper; it has no
-- business being an RPC endpoint for API roles.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
