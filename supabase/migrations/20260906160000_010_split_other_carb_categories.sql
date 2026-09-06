INSERT INTO public.categories (name, type, sort_order) VALUES
  ('Starchy veg', 'carb', 10),
  ('Legumes', 'carb', 11),
  ('Cocoa', 'carb', 12)
ON CONFLICT (name, type) DO NOTHING;

UPDATE public.foods f
SET category_id = c.id
FROM public.categories c
WHERE c.name = 'Starchy veg' AND c.type = 'carb'
  AND f.name IN ('Corn', 'Green peas')
  AND f.category_id IN (SELECT id FROM public.categories WHERE name = 'Other' AND type = 'carb');

UPDATE public.foods f
SET category_id = c.id
FROM public.categories c
WHERE c.name = 'Legumes' AND c.type = 'carb'
  AND f.name = 'Lentils'
  AND f.category_id IN (SELECT id FROM public.categories WHERE name = 'Other' AND type = 'carb');

UPDATE public.foods f
SET category_id = c.id
FROM public.categories c
WHERE c.name = 'Cocoa' AND c.type = 'carb'
  AND f.name = 'Unsweetened cocoa powder'
  AND f.category_id IN (SELECT id FROM public.categories WHERE name = 'Other' AND type = 'carb');
