-- second, freely-timed post-meal glucose check (2h/2.5h/etc, picked per entry
-- same as the existing 1h reading, not a fixed offset)
ALTER TABLE public.meal_entries
  ADD COLUMN IF NOT EXISTS glucose_followup_mg_dl smallint
    CHECK (glucose_followup_mg_dl IS NULL OR glucose_followup_mg_dl BETWEEN 20 AND 600),
  ADD COLUMN IF NOT EXISTS glucose_followup_measured_at timestamptz;
