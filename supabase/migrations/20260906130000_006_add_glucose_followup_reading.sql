-- second, freely-timed post-meal glucose check (2h/2.5h/etc, picked per entry
-- same as the existing 1h reading, not a fixed offset)
ALTER TABLE public.meal_entries
  ADD COLUMN IF NOT EXISTS glucose_followup_mg_dl smallint
    CHECK (glucose_followup_mg_dl IS NULL OR glucose_followup_mg_dl BETWEEN 20 AND 600),
  ADD COLUMN IF NOT EXISTS glucose_followup_measured_at timestamptz;

-- backfill the 3 historical entries that already recorded a follow-up reading as free text in notes
UPDATE public.meal_entries
SET glucose_followup_mg_dl = 143, glucose_followup_measured_at = eaten_at + interval '2.5 hours'
WHERE id = 'af6ec14f-a00e-4f9b-8e55-fac1b31bb607';

UPDATE public.meal_entries
SET glucose_followup_mg_dl = 86, glucose_followup_measured_at = eaten_at + interval '2 hours'
WHERE id = 'e776dd57-3d99-439a-8085-9b017b3754f6';

UPDATE public.meal_entries
SET glucose_followup_mg_dl = 111, glucose_followup_measured_at = eaten_at + interval '2.5 hours'
WHERE id = 'c4ebe2d8-3ee2-48f6-9637-255c659cd6c2';
