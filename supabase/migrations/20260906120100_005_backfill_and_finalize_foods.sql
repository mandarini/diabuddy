-- one-off custom foods for historical entries that don't fit any seeded default
-- (both logged under the account's only user; "Other" categories start empty by design)
INSERT INTO public.foods (category_id, user_id, name)
SELECT c.id, (SELECT user_id FROM public.meal_entries ORDER BY created_at LIMIT 1), 'Chia seeds'
FROM public.categories c WHERE c.name = 'Other' AND c.type = 'carb';

INSERT INTO public.foods (category_id, user_id, name)
SELECT c.id, (SELECT user_id FROM public.meal_entries ORDER BY created_at LIMIT 1), '99% dark chocolate'
FROM public.categories c WHERE c.name = 'Other' AND c.type = 'pairing';

-- backfill meal_carbs.food_id
-- direct matches, brand/dish-name folds (Milhouse/Millhouse->Oats, Manna->Rusk, Mac and cheese->Pasta),
-- and the one custom "Chia seeds" carb entry
UPDATE public.meal_carbs mc
SET food_id = f.id
FROM public.foods f
JOIN public.categories c ON c.id = f.category_id
WHERE mc.food_id IS NULL
  AND (
    (mc.carb_family = 'Fruit' AND c.type = 'carb' AND c.name = 'Fruit' AND f.name = btrim(mc.item_name))
    OR (mc.carb_family = 'Quinoa' AND c.type = 'carb' AND c.name = 'Quinoa' AND f.name = 'Quinoa')
    OR (mc.carb_family = 'Rice' AND c.type = 'carb' AND c.name = 'Rice' AND f.name = 'Rice')
    OR (mc.carb_family = 'Oats' AND c.type = 'carb' AND c.name = 'Oats' AND f.name = 'Oats')
    OR (mc.carb_family = 'Rusk' AND c.type = 'carb' AND c.name = 'Rusk' AND f.name = 'Rusk')
    OR (mc.carb_family = 'Pasta' AND c.type = 'carb' AND c.name = 'Pasta' AND f.name = 'Pasta')
    OR (mc.carb_family = 'Other' AND c.type = 'carb' AND c.name = 'Other'
        AND btrim(mc.item_name) = 'Chia seeds' AND f.name = 'Chia seeds')
  );

-- backfill meal_pairings.food_id
-- direct matches, miscategorization corrections (Tahini/Avocado/Flax/Kefir/Olive oil were
-- logged under the old "Nut butter"/"Other" families), subtype folds (Almonds->Nuts,
-- Peanut butter->Nut butter, La Vache Qui Rit->Cheese), and the custom dark-chocolate entry
UPDATE public.meal_pairings mp
SET food_id = f.id
FROM public.foods f
JOIN public.categories c ON c.id = f.category_id
WHERE mp.food_id IS NULL
  AND (
    (mp.pairing_family = 'Tahini' AND c.type = 'pairing' AND c.name = 'Fat' AND f.name = 'Tahini')
    OR (mp.pairing_family = 'Yogurt' AND c.type = 'pairing' AND c.name = 'Protein' AND f.name = 'Yogurt')
    OR (mp.pairing_family = 'Nut butter' AND btrim(mp.item_name) = 'Tahini'
        AND c.type = 'pairing' AND c.name = 'Fat' AND f.name = 'Tahini')
    OR (mp.pairing_family = 'Nut butter' AND btrim(mp.item_name) = 'Peanut butter'
        AND c.type = 'pairing' AND c.name = 'Fat' AND f.name = 'Nut butter')
    OR (mp.pairing_family = 'Nuts' AND c.type = 'pairing' AND c.name = 'Fat' AND f.name = 'Nuts')
    OR (mp.pairing_family = 'Cheese' AND btrim(mp.item_name) = 'La Vache Qui Rit'
        AND c.type = 'pairing' AND c.name = 'Protein' AND f.name = 'Cheese')
    OR (mp.pairing_family = 'Other' AND btrim(mp.item_name) = 'Avocado'
        AND c.type = 'pairing' AND c.name = 'Fat' AND f.name = 'Avocado')
    OR (mp.pairing_family = 'Other' AND btrim(mp.item_name) = 'Flax'
        AND c.type = 'pairing' AND c.name = 'Fiber' AND f.name = 'Flax')
    OR (mp.pairing_family = 'Other' AND btrim(mp.item_name) = 'Kefir'
        AND c.type = 'pairing' AND c.name = 'Protein' AND f.name = 'Kefir')
    OR (mp.pairing_family = 'Other' AND lower(btrim(mp.item_name)) = 'olive oil'
        AND c.type = 'pairing' AND c.name = 'Fat' AND f.name = 'Olive oil')
    OR (mp.pairing_family = 'Other' AND btrim(mp.item_name) = '99% dark chocolate'
        AND c.type = 'pairing' AND c.name = 'Other' AND f.name = '99% dark chocolate')
  );

-- fail loudly instead of hitting a cryptic NOT NULL violation below
DO $$
DECLARE
  missing_carbs int;
  missing_pairings int;
BEGIN
  SELECT count(*) INTO missing_carbs FROM public.meal_carbs WHERE food_id IS NULL;
  SELECT count(*) INTO missing_pairings FROM public.meal_pairings WHERE food_id IS NULL;
  IF missing_carbs > 0 THEN
    RAISE EXCEPTION '% meal_carbs rows failed to backfill food_id', missing_carbs;
  END IF;
  IF missing_pairings > 0 THEN
    RAISE EXCEPTION '% meal_pairings rows failed to backfill food_id', missing_pairings;
  END IF;
END $$;

-- finalize
ALTER TABLE public.meal_carbs ALTER COLUMN food_id SET NOT NULL;
ALTER TABLE public.meal_carbs DROP COLUMN carb_family;
ALTER TABLE public.meal_carbs DROP COLUMN item_name;

ALTER TABLE public.meal_pairings ALTER COLUMN food_id SET NOT NULL;
ALTER TABLE public.meal_pairings DROP COLUMN pairing_family;
ALTER TABLE public.meal_pairings DROP COLUMN item_name;

CREATE INDEX IF NOT EXISTS idx_meal_carbs_food_id ON public.meal_carbs (food_id);
CREATE INDEX IF NOT EXISTS idx_meal_pairings_food_id ON public.meal_pairings (food_id);
CREATE INDEX IF NOT EXISTS idx_foods_category_id ON public.foods (category_id);
