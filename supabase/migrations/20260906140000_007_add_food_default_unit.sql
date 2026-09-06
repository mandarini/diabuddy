ALTER TABLE public.foods ADD COLUMN IF NOT EXISTS default_unit text;

-- whole/countable items default to "piece" instead of the category fallback
UPDATE public.foods f
SET default_unit = 'piece'
FROM public.categories c
WHERE f.category_id = c.id AND c.type = 'carb' AND c.name = 'Fruit';

UPDATE public.foods f
SET default_unit = 'piece'
FROM public.categories c
WHERE f.category_id = c.id AND f.user_id IS NULL
  AND ((c.type = 'carb' AND c.name = 'Rusk' AND f.name = 'Rusk')
    OR (c.type = 'carb' AND c.name = 'Potato' AND f.name = 'Potato')
    OR (c.type = 'pairing' AND c.name = 'Fat' AND f.name = 'Avocado')
    OR (c.type = 'pairing' AND c.name = 'Fat' AND f.name = 'Nuts')
    OR (c.type = 'pairing' AND c.name = 'Protein' AND f.name = 'Cheese')
    OR (c.type = 'pairing' AND c.name = 'Protein' AND f.name = 'Egg'));

UPDATE public.foods f
SET default_unit = 'slice'
FROM public.categories c
WHERE f.category_id = c.id AND c.type = 'carb' AND c.name = 'Bread' AND f.name = 'Bread' AND f.user_id IS NULL;

UPDATE public.foods f
SET default_unit = 'tsp'
FROM public.categories c
WHERE f.category_id = c.id AND c.type = 'pairing' AND c.name = 'Fat' AND f.name = 'Nut butter' AND f.user_id IS NULL;
