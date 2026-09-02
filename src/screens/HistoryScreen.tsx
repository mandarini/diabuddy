import { useState, useMemo, useCallback } from 'react';
import { Pencil, Trash2, Plus, Search, Filter } from 'lucide-react';
import { useAllMeals, updateMeal, deleteMeal, setMealCarbs, setMealPairings } from '@/lib/hooks/useMeals';
import { useUserSettings } from '@/lib/hooks/useUserSettings';
import { MEAL_SLOTS, CARB_FAMILIES, type MealWithRelations, type MealSlot } from '@/lib/types';
import { MealCard } from '@/components/MealCard';
import { MealFormModal, type MealFormData } from '@/components/MealFormModal';
import { GlucoseModal } from '@/components/GlucoseModal';
import { WalkModal } from '@/components/WalkModal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Loading';
import { formatDateFromISO, formatTimeFromISO } from '@/lib/date';

export function HistoryScreen() {
  const { meals, loading, refetch } = useAllMeals();
  const { settings } = useUserSettings();

  const [search, setSearch] = useState('');
  const [slotFilter, setSlotFilter] = useState<MealSlot | 'all'>('all');
  const [carbFilter, setCarbFilter] = useState('all');
  const [editingMeal, setEditingMeal] = useState<MealWithRelations | null>(null);
  const [mealFormOpen, setMealFormOpen] = useState(false);
  const [glucoseModalMeal, setGlucoseModalMeal] = useState<MealWithRelations | null>(null);
  const [walkModalMeal, setWalkModalMeal] = useState<MealWithRelations | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MealWithRelations | null>(null);

  const filteredMeals = useMemo(() => {
    return meals.filter((m) => {
      if (slotFilter !== 'all' && m.meal_slot !== slotFilter) return false;
      if (carbFilter !== 'all') {
        const hasCarb = m.meal_carbs.some((c) => c.carb_family === carbFilter);
        if (!hasCarb) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const text = [
          m.main_meal,
          ...m.meal_carbs.map((c) => `${c.carb_family} ${c.item_name ?? ''}`),
          ...m.meal_pairings.map((p) => `${p.pairing_family} ${p.item_name ?? ''}`),
          m.notes,
        ].join(' ').toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [meals, slotFilter, carbFilter, search]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, MealWithRelations[]> = {};
    for (const meal of filteredMeals) {
      const date = meal.eaten_at.slice(0, 10);
      if (!groups[date]) groups[date] = [];
      groups[date].push(meal);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredMeals]);

  const handleSaveMeal = useCallback(
    async (data: MealFormData) => {
      if (!editingMeal) return;
      const { error } = await updateMeal(editingMeal.id, {
        eaten_at: data.eaten_at,
        meal_slot: data.meal_slot,
        main_meal: data.main_meal || null,
        notes: data.notes || null,
      });
      if (error) throw new Error(error);
      const { error: carbErr } = await setMealCarbs(
        editingMeal.id,
        data.carbs.map((c) => ({
          carb_family: c.carb_family,
          item_name: c.item_name || undefined,
          quantity: c.quantity ? Number(c.quantity) : undefined,
          unit: c.unit || undefined,
        }))
      );
      if (carbErr) throw new Error(carbErr);
      const { error: pairingErr } = await setMealPairings(
        editingMeal.id,
        data.pairings.map((p) => ({
          pairing_family: p.pairing_family,
          item_name: p.item_name || undefined,
          quantity: p.quantity ? Number(p.quantity) : undefined,
          unit: p.unit || undefined,
        }))
      );
      if (pairingErr) throw new Error(pairingErr);
      refetch();
      setEditingMeal(null);
    },
    [editingMeal, refetch]
  );

  const handleSaveGlucose = useCallback(
    async (glucose: number, measuredAt: string) => {
      if (!glucoseModalMeal) return;
      const { error } = await updateMeal(glucoseModalMeal.id, {
        glucose_1h_mg_dl: glucose,
        glucose_measured_at: measuredAt,
      });
      if (error) throw new Error(error);
      refetch();
      setGlucoseModalMeal(null);
    },
    [glucoseModalMeal, refetch]
  );

  const handleSaveWalk = useCallback(
    async (walked: boolean, minutes: number | null) => {
      if (!walkModalMeal) return;
      const { error } = await updateMeal(walkModalMeal.id, {
        walked_after: walked,
        walk_minutes: minutes,
      });
      if (error) throw new Error(error);
      refetch();
      setWalkModalMeal(null);
    },
    [walkModalMeal, refetch]
  );

  const handleDeleteMeal = useCallback(async () => {
    if (!deleteConfirm) return;
    const { error } = await deleteMeal(deleteConfirm.id);
    if (error) {
      console.error(error);
    } else {
      refetch();
    }
    setDeleteConfirm(null);
  }, [deleteConfirm, refetch]);

  const postmealTarget = settings?.postmeal_1h_target_max ?? 140;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-stone-800">History</h1>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-stone-100 p-3 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
            placeholder="Search meals, carbs, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select
            className="flex-1 text-sm"
            value={slotFilter}
            onChange={(e) => setSlotFilter(e.target.value as MealSlot | 'all')}
          >
            <option value="all">All meal slots</option>
            {MEAL_SLOTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
          <Select
            className="flex-1 text-sm"
            value={carbFilter}
            onChange={(e) => setCarbFilter(e.target.value)}
          >
            <option value="all">All carb types</option>
            {CARB_FAMILIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : groupedByDate.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-stone-100">
          <Filter className="mx-auto text-stone-300 mb-2" size={32} />
          <p className="text-stone-400 text-sm">No meals match your filters</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByDate.map(([date, dateMeals]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-stone-400 mb-2 px-1">
                {formatDateFromISO(dateMeals[0].eaten_at)}
              </h2>
              <div className="space-y-3">
                {dateMeals.map((meal) => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    targetMax={postmealTarget}
                    onEdit={() => {
                      setEditingMeal(meal);
                      setMealFormOpen(true);
                    }}
                    onDelete={() => setDeleteConfirm(meal)}
                    onAddGlucose={() => setGlucoseModalMeal(meal)}
                    onAddWalk={() => setWalkModalMeal(meal)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <MealFormModal
        open={mealFormOpen}
        onClose={() => {
          setMealFormOpen(false);
          setEditingMeal(null);
        }}
        onSave={handleSaveMeal}
        editingMeal={editingMeal}
      />
      <GlucoseModal
        open={!!glucoseModalMeal}
        onClose={() => setGlucoseModalMeal(null)}
        onSave={handleSaveGlucose}
        mealEatenAt={glucoseModalMeal?.eaten_at ?? new Date().toISOString()}
        currentValue={glucoseModalMeal?.glucose_1h_mg_dl}
        currentMeasuredAt={glucoseModalMeal?.glucose_measured_at}
      />
      <WalkModal
        open={!!walkModalMeal}
        onClose={() => setWalkModalMeal(null)}
        onSave={handleSaveWalk}
        currentWalked={walkModalMeal?.walked_after}
        currentMinutes={walkModalMeal?.walk_minutes}
      />

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-stone-800 mb-2">Delete this meal?</h3>
            <p className="text-sm text-stone-500 mb-4">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDeleteMeal}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
