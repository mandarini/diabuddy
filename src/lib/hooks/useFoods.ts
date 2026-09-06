import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Category, Food } from '@/lib/types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .order('type', { ascending: true })
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setCategories(data as Category[]);
        setLoading(false);
      });
  }, []);

  return { categories, loading };
}

export function useFoods() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFoods = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('foods')
      .select('*')
      .order('name', { ascending: true });
    if (!error && data) setFoods(data as Food[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFoods();
  }, [fetchFoods]);

  return { foods, loading, refetch: fetchFoods };
}

export async function findOrCreateFood(
  categoryId: string,
  name: string
): Promise<{ data: Food | null; error: string | null }> {
  const trimmed = name.trim();

  const { data: existing, error: selErr } = await supabase
    .from('foods')
    .select('*')
    .eq('category_id', categoryId);
  if (selErr) return { data: null, error: selErr.message };

  const match = (existing as Food[]).find(
    (f) => f.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (match) return { data: match, error: null };

  const { data: created, error: insErr } = await supabase
    .from('foods')
    .insert({ category_id: categoryId, name: trimmed })
    .select()
    .single();

  if (insErr) {
    if (insErr.code === '23505') {
      const { data: retry, error: retryErr } = await supabase
        .from('foods')
        .select('*')
        .eq('category_id', categoryId);
      if (retryErr) return { data: null, error: retryErr.message };
      const retryMatch = (retry as Food[]).find(
        (f) => f.name.toLowerCase() === trimmed.toLowerCase()
      );
      return retryMatch
        ? { data: retryMatch, error: null }
        : { data: null, error: 'Food exists but could not be found' };
    }
    return { data: null, error: insErr.message };
  }

  return { data: created as Food, error: null };
}
