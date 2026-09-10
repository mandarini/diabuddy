-- Table and column comments are published by PostgREST in its OpenAPI description, where the
-- MCP tool generator turns them into tool and argument descriptions for the model.

COMMENT ON TABLE public.meal_entries IS 'One meal the user ate: when, which slot (breakfast, morning_snack, lunch, afternoon_snack, dinner, other), free-text dish, the 1-hour post-meal glucose reading and an optional later follow-up reading, and whether they walked afterwards. Foods are in meal_carbs and meal_pairings.';
COMMENT ON COLUMN public.meal_entries.eaten_at IS 'When the meal was eaten (timestamptz).';
COMMENT ON COLUMN public.meal_entries.meal_slot IS 'One of breakfast, morning_snack, lunch, afternoon_snack, dinner, other.';
COMMENT ON COLUMN public.meal_entries.main_meal IS 'Free-text description of the dish.';
COMMENT ON COLUMN public.meal_entries.glucose_1h_mg_dl IS 'Blood glucose one hour after the meal, mg/dL. Null until measured.';
COMMENT ON COLUMN public.meal_entries.glucose_measured_at IS 'When the 1-hour reading was taken.';
COMMENT ON COLUMN public.meal_entries.glucose_followup_mg_dl IS 'Optional later reading (2h, 2.5h …), mg/dL.';
COMMENT ON COLUMN public.meal_entries.glucose_followup_measured_at IS 'When the follow-up reading was taken.';
COMMENT ON COLUMN public.meal_entries.walked_after IS 'Whether the user walked after this meal.';
COMMENT ON COLUMN public.meal_entries.walk_minutes IS 'Length of the post-meal walk in minutes.';
COMMENT ON COLUMN public.meal_entries.reminder_sent_at IS 'Set by the reminder job once the 1-hour push was delivered; not user data.';

COMMENT ON TABLE public.meal_carbs IS 'Carbohydrate foods eaten in a meal (rice, bread, fruit …), each referencing a food by food_id.';
COMMENT ON TABLE public.meal_pairings IS 'Fat, protein or fiber foods eaten alongside the carbs in a meal, each referencing a food by food_id.';
COMMENT ON COLUMN public.meal_carbs.quantity IS 'Amount, in the unit given.';
COMMENT ON COLUMN public.meal_carbs.unit IS 'Unit of the quantity (g, piece, slice, tbsp …).';
COMMENT ON COLUMN public.meal_pairings.quantity IS 'Amount, in the unit given.';
COMMENT ON COLUMN public.meal_pairings.unit IS 'Unit of the quantity (g, piece, slice, tbsp …).';

COMMENT ON TABLE public.foods IS 'Foods available to log. user_id null = shared default; set = that user''s own addition. Each belongs to a category.';
COMMENT ON COLUMN public.foods.default_unit IS 'Unit suggested when logging this food (g, piece, slice, tbsp …).';
COMMENT ON TABLE public.categories IS 'Food categories. type carb (Rice, Bread, Fruit …) or pairing (Fat, Protein, Fiber). Read-only.';
COMMENT ON COLUMN public.categories.type IS 'carb or pairing.';

COMMENT ON TABLE public.daily_metrics IS 'One row per calendar day: fasting glucose, morning and evening blood pressure and pulse, and weight.';
COMMENT ON COLUMN public.daily_metrics.metric_date IS 'The calendar day (date).';
COMMENT ON COLUMN public.daily_metrics.fasting_glucose_mg_dl IS 'Morning fasting blood glucose, mg/dL.';
COMMENT ON COLUMN public.daily_metrics.morning_bp_systolic IS 'Morning blood pressure, systolic, mmHg.';
COMMENT ON COLUMN public.daily_metrics.morning_bp_diastolic IS 'Morning blood pressure, diastolic, mmHg.';
COMMENT ON COLUMN public.daily_metrics.evening_bp_systolic IS 'Evening blood pressure, systolic, mmHg.';
COMMENT ON COLUMN public.daily_metrics.evening_bp_diastolic IS 'Evening blood pressure, diastolic, mmHg.';
COMMENT ON COLUMN public.daily_metrics.weight_kg IS 'Body weight in kilograms.';

COMMENT ON TABLE public.user_settings IS 'Per-user settings: timezone, pregnancy due date (pregnancy_edd), and glucose targets in mg/dL (fasting_target_max, postmeal_1h_target_max).';
