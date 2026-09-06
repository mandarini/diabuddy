-- categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('carb', 'pairing')),
  sort_order smallint NOT NULL DEFAULT 0,
  UNIQUE (name, type)
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_categories" ON public.categories;
CREATE POLICY "select_categories" ON public.categories FOR SELECT
  TO authenticated USING (true);

-- foods
CREATE TABLE IF NOT EXISTS public.foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- a plain UNIQUE table constraint can't take expressions (COALESCE/lower),
-- so the per-category-per-owner uniqueness is a unique index instead
CREATE UNIQUE INDEX IF NOT EXISTS idx_foods_unique_per_owner
  ON public.foods (category_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_foods" ON public.foods;
CREATE POLICY "select_foods" ON public.foods FOR SELECT
  TO authenticated USING (user_id IS NULL OR user_id = auth.uid());
DROP POLICY IF EXISTS "insert_own_foods" ON public.foods;
CREATE POLICY "insert_own_foods" ON public.foods FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "update_own_foods" ON public.foods;
CREATE POLICY "update_own_foods" ON public.foods FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "delete_own_foods" ON public.foods;
CREATE POLICY "delete_own_foods" ON public.foods FOR DELETE
  TO authenticated USING (user_id = auth.uid());

GRANT SELECT ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foods TO authenticated;

-- seed categories
INSERT INTO public.categories (name, type, sort_order) VALUES
  ('Rice', 'carb', 1),
  ('Quinoa', 'carb', 2),
  ('Rusk', 'carb', 3),
  ('Bread', 'carb', 4),
  ('Oats', 'carb', 5),
  ('Potato', 'carb', 6),
  ('Pasta', 'carb', 7),
  ('Fruit', 'carb', 8),
  ('Other', 'carb', 9),
  ('Fat', 'pairing', 1),
  ('Protein', 'pairing', 2),
  ('Fiber', 'pairing', 3),
  ('Other', 'pairing', 4)
ON CONFLICT (name, type) DO NOTHING;

-- seed foods: one generic food per single-item carb category
INSERT INTO public.foods (category_id, name)
SELECT id, name FROM public.categories
WHERE type = 'carb' AND name IN ('Rice', 'Quinoa', 'Rusk', 'Bread', 'Oats', 'Potato', 'Pasta');

-- seed foods: Fruit
INSERT INTO public.foods (category_id, name)
SELECT c.id, f.name
FROM public.categories c, unnest(ARRAY[
  'Banana','Apple','Peach','Pear','Kiwi','Strawberries','Orange','Grapes',
  'Watermelon','Mandarin','Prickly pear','Dried Prunes','Dried Mango'
]) AS f(name)
WHERE c.name = 'Fruit' AND c.type = 'carb';

-- seed foods: Fat
INSERT INTO public.foods (category_id, name)
SELECT c.id, f.name
FROM public.categories c, unnest(ARRAY[
  'Olive oil','Avocado','Tahini','Nut butter','Nuts','Butter','Coconut'
]) AS f(name)
WHERE c.name = 'Fat' AND c.type = 'pairing';

-- seed foods: Protein
INSERT INTO public.foods (category_id, name)
SELECT c.id, f.name
FROM public.categories c, unnest(ARRAY[
  'Yogurt','Kefir','Cheese','Egg','Chicken'
]) AS f(name)
WHERE c.name = 'Protein' AND c.type = 'pairing';

-- seed foods: Fiber
INSERT INTO public.foods (category_id, name)
SELECT c.id, f.name
FROM public.categories c, unnest(ARRAY[
  'Flax','Chia seeds'
]) AS f(name)
WHERE c.name = 'Fiber' AND c.type = 'pairing';

-- add nullable food_id columns (NOT NULL comes after backfill, in migration 2)
ALTER TABLE public.meal_carbs ADD COLUMN IF NOT EXISTS food_id uuid REFERENCES public.foods(id) ON DELETE RESTRICT;
ALTER TABLE public.meal_pairings ADD COLUMN IF NOT EXISTS food_id uuid REFERENCES public.foods(id) ON DELETE RESTRICT;

-- a carb entry may only reference a carb-type food; a pairing entry only a pairing-type food
CREATE OR REPLACE FUNCTION public.validate_meal_carb_food()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.food_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.foods f
    JOIN public.categories c ON c.id = f.category_id
    WHERE f.id = NEW.food_id AND c.type = 'carb'
  ) THEN
    RAISE EXCEPTION 'food_id % is not a carb-type food', NEW.food_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_meal_carb_food_trigger ON public.meal_carbs;
CREATE TRIGGER validate_meal_carb_food_trigger
  BEFORE INSERT OR UPDATE OF food_id ON public.meal_carbs
  FOR EACH ROW EXECUTE FUNCTION public.validate_meal_carb_food();

CREATE OR REPLACE FUNCTION public.validate_meal_pairing_food()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.food_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.foods f
    JOIN public.categories c ON c.id = f.category_id
    WHERE f.id = NEW.food_id AND c.type = 'pairing'
  ) THEN
    RAISE EXCEPTION 'food_id % is not a pairing-type food', NEW.food_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_meal_pairing_food_trigger ON public.meal_pairings;
CREATE TRIGGER validate_meal_pairing_food_trigger
  BEFORE INSERT OR UPDATE OF food_id ON public.meal_pairings
  FOR EACH ROW EXECUTE FUNCTION public.validate_meal_pairing_food();
