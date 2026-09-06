-- Sweet potato is a distinct-enough item to fit under the existing Potato category
INSERT INTO public.foods (category_id, name, default_unit)
SELECT c.id, 'Sweet potato', 'piece'
FROM public.categories c WHERE c.name = 'Potato' AND c.type = 'carb';

INSERT INTO public.foods (category_id, name)
SELECT c.id, 'Lentils'
FROM public.categories c WHERE c.name = 'Other' AND c.type = 'carb';
