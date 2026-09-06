import { useState, useCallback } from 'react';
import { Plus, Droplet, Heart, Scale, Activity } from 'lucide-react';
import { useTodayMeals, createMeal, updateMeal, deleteMeal, setMealCarbs, setMealPairings } from '@/lib/hooks/useMeals';
import { useDailyMetrics, upsertDailyMetrics } from '@/lib/hooks/useDailyMetrics';
import { useUserSettings } from '@/lib/hooks/useUserSettings';
import { getAthensDateString } from '@/lib/date';
import { MealCard } from '@/components/MealCard';
import { MealFormModal, type MealFormData } from '@/components/MealFormModal';
import { GlucoseModal } from '@/components/GlucoseModal';
import { WalkModal } from '@/components/WalkModal';
import { BloodPressureModal } from '@/components/BloodPressureModal';
import { FastingGlucoseModal } from '@/components/FastingGlucoseModal';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Loading';
import type { MealWithRelations, MealSlot } from '@/lib/types';

interface TodayScreenProps {
  userId: string;
}

export function TodayScreen({ userId: _userId }: TodayScreenProps) {
  const todayDate = getAthensDateString(new Date());
  const { meals, loading, refetch } = useTodayMeals(todayDate);
  const { metrics, refetch: refetchMetrics } = useDailyMetrics(todayDate);
  const { settings } = useUserSettings();

  const [mealFormOpen, setMealFormOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<MealWithRelations | null>(null);
  const [glucoseModalMeal, setGlucoseModalMeal] = useState<MealWithRelations | null>(null);
  const [walkModalMeal, setWalkModalMeal] = useState<MealWithRelations | null>(null);
  const [morningBpOpen, setMorningBpOpen] = useState(false);
  const [eveningBpOpen, setEveningBpOpen] = useState(false);
  const [fastingOpen, setFastingOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<MealWithRelations | null>(null);

  const handleSaveMeal = useCallback(
    async (data: MealFormData) => {
      if (editingMeal) {
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
            food_id: c.food_id,
            quantity: c.quantity ? Number(c.quantity) : undefined,
            unit: c.unit || undefined,
          }))
        );
        if (carbErr) throw new Error(carbErr);
        const { error: pairingErr } = await setMealPairings(
          editingMeal.id,
          data.pairings.map((p) => ({
            food_id: p.food_id,
            quantity: p.quantity ? Number(p.quantity) : undefined,
            unit: p.unit || undefined,
          }))
        );
        if (pairingErr) throw new Error(pairingErr);
      } else {
        const { data: meal, error } = await createMeal({
          eaten_at: data.eaten_at,
          meal_slot: data.meal_slot,
          main_meal: data.main_meal || null,
          notes: data.notes || null,
          glucose_1h_mg_dl: null,
          glucose_measured_at: null,
          walked_after: false,
          walk_minutes: null,
        });
        if (error || !meal) throw new Error(error ?? 'Failed to create meal');
        if (data.carbs.length > 0) {
          const { error: carbErr } = await setMealCarbs(
            meal.id,
            data.carbs.map((c) => ({
              food_id: c.food_id,
              quantity: c.quantity ? Number(c.quantity) : undefined,
              unit: c.unit || undefined,
            }))
          );
          if (carbErr) throw new Error(carbErr);
        }
        if (data.pairings.length > 0) {
          const { error: pairingErr } = await setMealPairings(
            meal.id,
            data.pairings.map((p) => ({
              food_id: p.food_id,
              quantity: p.quantity ? Number(p.quantity) : undefined,
              unit: p.unit || undefined,
            }))
          );
          if (pairingErr) throw new Error(pairingErr);
        }
      }
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

  const handleSaveMorningBp = useCallback(
    async (data: { systolic: number; diastolic: number; pulse?: number; measuredAt: string }) => {
      const { error } = await upsertDailyMetrics(todayDate, {
        morning_bp_systolic: data.systolic,
        morning_bp_diastolic: data.diastolic,
        morning_pulse: data.pulse ?? null,
        morning_bp_measured_at: data.measuredAt,
      });
      if (error) throw new Error(error);
      refetchMetrics();
    },
    [todayDate, refetchMetrics]
  );

  const handleSaveEveningBp = useCallback(
    async (data: { systolic: number; diastolic: number; pulse?: number; measuredAt: string }) => {
      const { error } = await upsertDailyMetrics(todayDate, {
        evening_bp_systolic: data.systolic,
        evening_bp_diastolic: data.diastolic,
        evening_pulse: data.pulse ?? null,
        evening_bp_measured_at: data.measuredAt,
      });
      if (error) throw new Error(error);
      refetchMetrics();
    },
    [todayDate, refetchMetrics]
  );

  const handleSaveFasting = useCallback(
    async (glucose: number, measuredAt: string) => {
      const { error } = await upsertDailyMetrics(todayDate, {
        fasting_glucose_mg_dl: glucose,
        fasting_measured_at: measuredAt,
      });
      if (error) throw new Error(error);
      refetchMetrics();
    },
    [todayDate, refetchMetrics]
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

  const fastingTarget = settings?.fasting_target_max ?? 95;
  const postmealTarget = settings?.postmeal_1h_target_max ?? 140;

  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Today</h1>
          <p className="text-sm text-stone-400">{dateLabel}</p>
        </div>
        <Button
          onClick={() => {
            setEditingMeal(null);
            setMealFormOpen(true);
          }}
          className="flex items-center gap-1.5"
        >
          <Plus size={18} /> Add meal
        </Button>
      </div>

      {/* Morning metrics card */}
      <div className="bg-gradient-to-br from-teal-50 to-stone-50 rounded-2xl border border-teal-100 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-teal-800 flex items-center gap-1.5">
          <Activity size={16} /> Morning metrics
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setFastingOpen(true)}
            className="bg-white rounded-xl p-3 text-left border border-stone-100 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1">
              <Droplet size={12} /> Fasting glucose
            </div>
            {metrics?.fasting_glucose_mg_dl ? (
              <p className={`text-lg font-bold ${
                metrics.fasting_glucose_mg_dl > fastingTarget ? 'text-amber-600' : 'text-stone-700'
              }`}>
                {metrics.fasting_glucose_mg_dl}
                <span className="text-xs font-normal text-stone-400 ml-1">mg/dL</span>
              </p>
            ) : (
              <p className="text-sm text-stone-300">Not logged</p>
            )}
          </button>

          <button
            onClick={() => setMorningBpOpen(true)}
            className="bg-white rounded-xl p-3 text-left border border-stone-100 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1">
              <Heart size={12} /> Morning BP
            </div>
            {metrics?.morning_bp_systolic ? (
              <p className="text-lg font-bold text-stone-700">
                {metrics.morning_bp_systolic}/{metrics.morning_bp_diastolic}
                <span className="text-xs font-normal text-stone-400 ml-1">mmHg</span>
              </p>
            ) : (
              <p className="text-sm text-stone-300">Not logged</p>
            )}
          </button>
        </div>
      </div>

      {/* Meals */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : meals.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-stone-100">
          <p className="text-stone-400 text-sm">No meals logged yet today</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => {
              setEditingMeal(null);
              setMealFormOpen(true);
            }}
          >
            <Plus size={16} className="mr-1" /> Add your first meal
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {meals.map((meal) => (
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
      )}

      {/* Evening BP card */}
      <button
        onClick={() => setEveningBpOpen(true)}
        className="w-full bg-white rounded-2xl border border-stone-100 p-4 text-left hover:shadow-sm transition-shadow"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-stone-400 mb-1">
              <Heart size={12} /> Evening blood pressure
            </div>
            {metrics?.evening_bp_systolic ? (
              <p className="text-lg font-bold text-stone-700">
                {metrics.evening_bp_systolic}/{metrics.evening_bp_diastolic}
                <span className="text-xs font-normal text-stone-400 ml-1">mmHg</span>
              </p>
            ) : (
              <p className="text-sm text-stone-300">Not logged</p>
            )}
          </div>
          {metrics?.evening_pulse && (
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs text-stone-400">
                <Scale size={12} /> Pulse
              </div>
              <p className="text-sm font-semibold text-stone-600">{metrics.evening_pulse} bpm</p>
            </div>
          )}
        </div>
      </button>

      {/* Modals */}
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
      <BloodPressureModal
        open={morningBpOpen}
        onClose={() => setMorningBpOpen(false)}
        onSave={handleSaveMorningBp}
        title="Morning blood pressure"
        currentSystolic={metrics?.morning_bp_systolic}
        currentDiastolic={metrics?.morning_bp_diastolic}
        currentPulse={metrics?.morning_pulse}
        currentMeasuredAt={metrics?.morning_bp_measured_at}
      />
      <BloodPressureModal
        open={eveningBpOpen}
        onClose={() => setEveningBpOpen(false)}
        onSave={handleSaveEveningBp}
        title="Evening blood pressure"
        currentSystolic={metrics?.evening_bp_systolic}
        currentDiastolic={metrics?.evening_bp_diastolic}
        currentPulse={metrics?.evening_pulse}
        currentMeasuredAt={metrics?.evening_bp_measured_at}
      />
      <FastingGlucoseModal
        open={fastingOpen}
        onClose={() => setFastingOpen(false)}
        onSave={handleSaveFasting}
        currentValue={metrics?.fasting_glucose_mg_dl}
        currentMeasuredAt={metrics?.fasting_measured_at}
        targetMax={fastingTarget}
      />

      {/* Delete confirmation */}
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
