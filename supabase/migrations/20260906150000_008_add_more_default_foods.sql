-- Unsweetened cocoa powder, Corn, Green peas don't fit any existing named
-- carb category, so they land in carb/Other alongside Vegetables in Fiber
INSERT INTO public.foods (category_id, name, default_unit)
SELECT c.id, 'Unsweetened cocoa powder', 'tbsp'
FROM public.categories c WHERE c.name = 'Other' AND c.type = 'carb';

INSERT INTO public.foods (category_id, name)
SELECT c.id, 'Corn'
FROM public.categories c WHERE c.name = 'Other' AND c.type = 'carb';

INSERT INTO public.foods (category_id, name)
SELECT c.id, 'Green peas'
FROM public.categories c WHERE c.name = 'Other' AND c.type = 'carb';

INSERT INTO public.foods (category_id, name)
SELECT c.id, 'Vegetables'
FROM public.categories c WHERE c.name = 'Fiber' AND c.type = 'pairing';
