INSERT INTO public.categories (name, type, sort_order) VALUES
  ('Dairy', 'carb', 13)
ON CONFLICT (name, type) DO NOTHING;

INSERT INTO public.foods (category_id, name, default_unit)
SELECT c.id, 'Milk', 'cup'
FROM public.categories c WHERE c.name = 'Dairy' AND c.type = 'carb';
