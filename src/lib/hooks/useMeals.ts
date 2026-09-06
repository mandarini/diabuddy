import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { MealWithRelations, MealEntry } from '@/lib/types';

export function useTodayMeals(dayDate: string) {
  const [meals, setMeals] = useState<MealWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeals = useCallback(async () => {
    setLoading(true);
    const startISO = `${dayDate}T00:00:00+03:00`;
    const endISO = `${dayDate}T23:59:59.999+03:00`;
    const { data, error } = await supabase
      .from('meal_entries')
      .select('*, meal_carbs(*, food:foods(*, category:categories(*))), meal_pairings(*, food:foods(*, category:categories(*)))')
      .gte('eaten_at', startISO)
      .lte('eaten_at', endISO)
      .order('eaten_at', { ascending: true });
    if (error) {
      console.error('Error fetching meals:', error.message);
      setMeals([]);
    } else {
      setMeals(data as MealWithRelations[]);
    }
    setLoading(false);
  }, [dayDate]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  return { meals, loading, refetch: fetchMeals };
}

export function useAllMeals() {
  const [meals, setMeals] = useState<MealWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeals = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('meal_entries')
      .select('*, meal_carbs(*, food:foods(*, category:categories(*))), meal_pairings(*, food:foods(*, category:categories(*)))')
      .order('eaten_at', { ascending: false });
    if (error) {
      console.error('Error fetching meals:', error.message);
      setMeals([]);
    } else {
      setMeals(data as MealWithRelations[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  return { meals, loading, refetch: fetchMeals };
}

export async function createMeal(
  meal: Omit<MealEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<{ data: MealEntry | null; error: string | null }> {
  const { data, error } = await supabase
    .from('meal_entries')
    .insert(meal)
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as MealEntry, error: null };
}

export async function updateMeal(
  id: string,
  updates: Partial<MealEntry>
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('meal_entries').update(updates).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteMeal(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('meal_entries').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export async function setMealCarbs(
  mealId: string,
  carbs: { food_id: string; quantity?: number; unit?: string }[]
): Promise<{ error: string | null }> {
  const { error: delError } = await supabase
    .from('meal_carbs')
    .delete()
    .eq('meal_id', mealId);
  if (delError) return { error: delError.message };
  if (carbs.length === 0) return { error: null };
  const { error: insError } = await supabase.from('meal_carbs').insert(
    carbs.map((c) => ({ ...c, meal_id: mealId }))
  );
  return { error: insError?.message ?? null };
}

export async function setMealPairings(
  mealId: string,
  pairings: { food_id: string; quantity?: number; unit?: string }[]
): Promise<{ error: string | null }> {
  const { error: delError } = await supabase
    .from('meal_pairings')
    .delete()
    .eq('meal_id', mealId);
  if (delError) return { error: delError.message };
  if (pairings.length === 0) return { error: null };
  const { error: insError } = await supabase.from('meal_pairings').insert(
    pairings.map((p) => ({ ...p, meal_id: mealId }))
  );
  return { error: insError?.message ?? null };
}
