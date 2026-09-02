import { Pencil, Trash2, Droplet, Footprints, Clock } from 'lucide-react';
import type { MealWithRelations } from '@/lib/types';
import { MEAL_SLOTS } from '@/lib/types';
import { formatTimeFromISO, minutesAfterMeal } from '@/lib/date';

interface MealCardProps {
  meal: MealWithRelations;
  onEdit: () => void;
  onDelete: () => void;
  onAddGlucose: () => void;
  onAddWalk: () => void;
  targetMax?: number | null;
}

function glucoseColor(value: number, targetMax?: number | null): string {
  if (targetMax && value > targetMax) return 'text-amber-600 bg-amber-50 border-amber-200';
  if (value > 140) return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-teal-700 bg-teal-50 border-teal-200';
}

export function MealCard({
  meal,
  onEdit,
  onDelete,
  onAddGlucose,
  onAddWalk,
  targetMax,
}: MealCardProps) {
  const slotLabel = MEAL_SLOTS.find((s) => s.value === meal.meal_slot)?.label ?? meal.meal_slot;
  const eatenTime = formatTimeFromISO(meal.eaten_at);
  const carbsText = meal.meal_carbs
    .map((c) => (c.item_name ? `${c.carb_family} (${c.item_name})` : c.carb_family))
    .join(', ');
  const pairingsText = meal.meal_pairings
    .map((p) => (p.item_name ? `${p.pairing_family} (${p.item_name})` : p.pairing_family))
    .join(', ');

  const minutesAfter = meal.glucose_measured_at
    ? minutesAfterMeal(meal.eaten_at, meal.glucose_measured_at)
    : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-stone-50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-stone-700">{slotLabel}</span>
          <span className="text-xs text-stone-400 flex items-center gap-1">
            <Clock size={12} /> {eatenTime}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="px-4 py-3 space-y-2">
        {meal.main_meal && (
          <p className="text-sm text-stone-800 font-medium">{meal.main_meal}</p>
        )}
        {carbsText && (
          <p className="text-sm text-stone-600">
            <span className="text-stone-400">Carbs: </span>
            {carbsText}
          </p>
        )}
        {pairingsText && (
          <p className="text-sm text-stone-600">
            <span className="text-stone-400">Pairings: </span>
            {pairingsText}
          </p>
        )}
        {meal.notes && (
          <p className="text-sm text-stone-500 italic">{meal.notes}</p>
        )}
      </div>

      <div className="px-4 py-3 border-t border-stone-50 flex items-center gap-2 flex-wrap">
        <button
          onClick={onAddGlucose}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            meal.glucose_1h_mg_dl
              ? glucoseColor(meal.glucose_1h_mg_dl, targetMax)
              : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'
          }`}
        >
          <Droplet size={14} />
          {meal.glucose_1h_mg_dl ? `${meal.glucose_1h_mg_dl} mg/dL` : 'Add glucose'}
          {minutesAfter !== null && meal.glucose_1h_mg_dl && (
            <span className="text-xs opacity-70">({minutesAfter}m)</span>
          )}
        </button>

        <button
          onClick={onAddWalk}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
            meal.walked_after
              ? 'bg-teal-50 text-teal-700 border-teal-200'
              : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'
          }`}
        >
          <Footprints size={14} />
          {meal.walked_after
            ? `${meal.walk_minutes ?? ''}m walk`
            : 'Add walk'}
        </button>
      </div>
    </div>
  );
}
