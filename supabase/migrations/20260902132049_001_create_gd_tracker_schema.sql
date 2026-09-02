/*
# Gestational Diabetes Tracker — Core Schema

## Overview
Creates the full database model for a private, single-user gestational diabetes tracker.
All tables are owner-scoped (user_id = auth.uid()) with RLS enabled.

## New Tables

### meal_entries
- One row per eating event.
- Tracks main meal, glucose reading (1h post-meal), walking, notes.
- Glucose is nullable (meals logged before measurement).

### meal_carbs
- Zero or more carbohydrate components per meal.
- carb_family (Rice, Quinoa, Fruit, etc.) + optional item_name for specificity.
- Structured but optional quantity/unit.

### meal_pairings
- Foods eaten alongside carbs (Nuts, Yogurt, Tahini, etc.).
- Multiple pairings per meal allowed.

### daily_metrics
- One row per calendar day (composite PK: user_id + metric_date).
- Fasting glucose, morning/evening BP, pulse, weekly weight.

### user_settings
- One row per user (PK: user_id).
- Timezone, pregnancy due date (EDD), glucose targets.

## Security
- RLS enabled on ALL tables.
- Owner-scoped CRUD policies (user_id = auth.uid()).
- No anonymous access, no public access.
- user_id columns default to auth.uid() so client inserts work without passing owner.
*/

-- meal_entries
CREATE TABLE IF NOT EXISTS public.meal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  eaten_at timestamptz NOT NULL,
  meal_slot text NOT NULL CHECK (meal_slot IN ('breakfast','morning_snack','lunch','afternoon_snack','dinner','other')),
  main_meal text,
  glucose_1h_mg_dl smallint CHECK (glucose_1h_mg_dl IS NULL OR glucose_1h_mg_dl BETWEEN 20 AND 600),
  glucose_measured_at timestamptz,
  walked_after boolean NOT NULL DEFAULT false,
  walk_minutes smallint CHECK (walk_minutes IS NULL OR walk_minutes BETWEEN 1 AND 240),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);

ALTER TABLE public.meal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_meal_entries" ON public.meal_entries;
CREATE POLICY "select_own_meal_entries" ON public.meal_entries FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_meal_entries" ON public.meal_entries;
CREATE POLICY "insert_own_meal_entries" ON public.meal_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_meal_entries" ON public.meal_entries;
CREATE POLICY "update_own_meal_entries" ON public.meal_entries FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_meal_entries" ON public.meal_entries;
CREATE POLICY "delete_own_meal_entries" ON public.meal_entries FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- meal_carbs
CREATE TABLE IF NOT EXISTS public.meal_carbs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  carb_family text NOT NULL,
  item_name text,
  quantity numeric,
  unit text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (meal_id, user_id) REFERENCES public.meal_entries(id, user_id) ON DELETE CASCADE
);

ALTER TABLE public.meal_carbs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_meal_carbs" ON public.meal_carbs;
CREATE POLICY "select_own_meal_carbs" ON public.meal_carbs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_meal_carbs" ON public.meal_carbs;
CREATE POLICY "insert_own_meal_carbs" ON public.meal_carbs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_meal_carbs" ON public.meal_carbs;
CREATE POLICY "update_own_meal_carbs" ON public.meal_carbs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_meal_carbs" ON public.meal_carbs;
CREATE POLICY "delete_own_meal_carbs" ON public.meal_carbs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- meal_pairings
CREATE TABLE IF NOT EXISTS public.meal_pairings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  pairing_family text NOT NULL,
  item_name text,
  quantity numeric,
  unit text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (meal_id, user_id) REFERENCES public.meal_entries(id, user_id) ON DELETE CASCADE
);

ALTER TABLE public.meal_pairings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_meal_pairings" ON public.meal_pairings;
CREATE POLICY "select_own_meal_pairings" ON public.meal_pairings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_meal_pairings" ON public.meal_pairings;
CREATE POLICY "insert_own_meal_pairings" ON public.meal_pairings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_meal_pairings" ON public.meal_pairings;
CREATE POLICY "update_own_meal_pairings" ON public.meal_pairings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_meal_pairings" ON public.meal_pairings;
CREATE POLICY "delete_own_meal_pairings" ON public.meal_pairings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- daily_metrics
CREATE TABLE IF NOT EXISTS public.daily_metrics (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_date date NOT NULL,
  fasting_glucose_mg_dl smallint CHECK (fasting_glucose_mg_dl IS NULL OR fasting_glucose_mg_dl BETWEEN 20 AND 600),
  fasting_measured_at timestamptz,
  morning_bp_systolic smallint,
  morning_bp_diastolic smallint,
  morning_pulse smallint,
  morning_bp_measured_at timestamptz,
  evening_bp_systolic smallint,
  evening_bp_diastolic smallint,
  evening_pulse smallint,
  evening_bp_measured_at timestamptz,
  weight_kg numeric(5,2),
  weight_measured_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, metric_date)
);

ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_daily_metrics" ON public.daily_metrics;
CREATE POLICY "select_own_daily_metrics" ON public.daily_metrics FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_daily_metrics" ON public.daily_metrics;
CREATE POLICY "insert_own_daily_metrics" ON public.daily_metrics FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_daily_metrics" ON public.daily_metrics;
CREATE POLICY "update_own_daily_metrics" ON public.daily_metrics FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_daily_metrics" ON public.daily_metrics;
CREATE POLICY "delete_own_daily_metrics" ON public.daily_metrics FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- user_settings
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'Europe/Athens',
  pregnancy_edd date,
  fasting_target_max smallint,
  postmeal_1h_target_max smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_user_settings" ON public.user_settings;
CREATE POLICY "select_own_user_settings" ON public.user_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_user_settings" ON public.user_settings;
CREATE POLICY "insert_own_user_settings" ON public.user_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_user_settings" ON public.user_settings;
CREATE POLICY "update_own_user_settings" ON public.user_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_user_settings" ON public.user_settings;
CREATE POLICY "delete_own_user_settings" ON public.user_settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_meal_entries ON public.meal_entries;
CREATE TRIGGER set_updated_at_meal_entries BEFORE UPDATE ON public.meal_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_daily_metrics ON public.daily_metrics;
CREATE TRIGGER set_updated_at_daily_metrics BEFORE UPDATE ON public.daily_metrics
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_user_settings ON public.user_settings;
CREATE TRIGGER set_updated_at_user_settings BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_meal_entries_user_eaten_at ON public.meal_entries (user_id, eaten_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_carbs_meal_id ON public.meal_carbs (meal_id);
CREATE INDEX IF NOT EXISTS idx_meal_pairings_meal_id ON public.meal_pairings (meal_id);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_user_date ON public.daily_metrics (user_id, metric_date DESC);
