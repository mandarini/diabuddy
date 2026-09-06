export type MealSlot =
  | 'breakfast'
  | 'morning_snack'
  | 'lunch'
  | 'afternoon_snack'
  | 'dinner'
  | 'other';

export interface MealEntry {
  id: string;
  user_id: string;
  eaten_at: string;
  meal_slot: MealSlot;
  main_meal: string | null;
  glucose_1h_mg_dl: number | null;
  glucose_measured_at: string | null;
  glucose_followup_mg_dl: number | null;
  glucose_followup_measured_at: string | null;
  walked_after: boolean;
  walk_minutes: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CategoryType = 'carb' | 'pairing';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  sort_order: number;
}

export interface Food {
  id: string;
  category_id: string;
  user_id: string | null;
  name: string;
  created_at: string;
}

export interface FoodWithCategory extends Food {
  category: Category;
}

export interface MealCarb {
  id: string;
  meal_id: string;
  user_id: string;
  food_id: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  created_at: string;
  food?: FoodWithCategory;
}

export interface MealPairing {
  id: string;
  meal_id: string;
  user_id: string;
  food_id: string;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  created_at: string;
  food?: FoodWithCategory;
}

export function formatFoodLabel(food: FoodWithCategory): string {
  return food.name.toLowerCase() === food.category.name.toLowerCase()
    ? food.category.name
    : `${food.category.name} (${food.name})`;
}

export interface MealWithRelations extends MealEntry {
  meal_carbs: MealCarb[];
  meal_pairings: MealPairing[];
}

export interface DailyMetrics {
  user_id: string;
  metric_date: string;
  fasting_glucose_mg_dl: number | null;
  fasting_measured_at: string | null;
  morning_bp_systolic: number | null;
  morning_bp_diastolic: number | null;
  morning_pulse: number | null;
  morning_bp_measured_at: string | null;
  evening_bp_systolic: number | null;
  evening_bp_diastolic: number | null;
  evening_pulse: number | null;
  evening_bp_measured_at: string | null;
  weight_kg: number | null;
  weight_measured_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  timezone: string;
  pregnancy_edd: string | null;
  fasting_target_max: number | null;
  postmeal_1h_target_max: number | null;
  created_at: string;
  updated_at: string;
}

export const MEAL_SLOTS: { value: MealSlot; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'morning_snack', label: 'Morning snack' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'afternoon_snack', label: 'Afternoon snack' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'other', label: 'Other' },
];

export const CARB_UNITS = ['g', 'piece', 'slice', 'tbsp', 'tsp', 'cup', 'portion'];
