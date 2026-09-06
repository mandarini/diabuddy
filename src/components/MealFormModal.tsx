import { useState, useEffect, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Plus, Trash2 } from 'lucide-react';
import { MEAL_SLOTS, CARB_UNITS, type MealSlot, type MealWithRelations, type Food } from '@/lib/types';
import { useCategories, useFoods, findOrCreateFood } from '@/lib/hooks/useFoods';

interface MealFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: MealFormData) => Promise<void>;
  editingMeal?: MealWithRelations | null;
  defaultSlot?: MealSlot;
}

export interface CarbRow {
  category_id: string;
  food_name: string;
  quantity: string;
  unit: string;
}

export interface PairingRow {
  category_id: string;
  food_name: string;
  quantity: string;
  unit: string;
}

export interface MealFormData {
  eaten_at: string;
  meal_slot: MealSlot;
  main_meal: string | undefined;
  carbs: { food_id: string; quantity: string; unit: string }[];
  pairings: { food_id: string; quantity: string; unit: string }[];
  notes: string | undefined;
}

function toLocalDatetimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function emptyRow(categoryId: string, categoryName: string, unit: string): CarbRow {
  return { category_id: categoryId, food_name: categoryName, quantity: '', unit };
}

export function MealFormModal({
  open,
  onClose,
  onSave,
  editingMeal,
  defaultSlot = 'breakfast',
}: MealFormModalProps) {
  const { categories } = useCategories();
  const { foods, refetch: refetchFoods } = useFoods();
  const carbCategories = categories.filter((c) => c.type === 'carb');
  const pairingCategories = categories.filter((c) => c.type === 'pairing');

  const [eatenAt, setEatenAt] = useState(toLocalDatetimeInput(new Date()));
  const [mealSlot, setMealSlot] = useState<MealSlot>(defaultSlot);
  const [mainMeal, setMainMeal] = useState('');
  const [carbs, setCarbs] = useState<CarbRow[]>([]);
  const [pairings, setPairings] = useState<PairingRow[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) refetchFoods();
  }, [open, refetchFoods]);

  useEffect(() => {
    if (!open || categories.length === 0) return;
    setError(null);
    if (editingMeal) {
      setEatenAt(toLocalDatetimeInput(new Date(editingMeal.eaten_at)));
      setMealSlot(editingMeal.meal_slot);
      setMainMeal(editingMeal.main_meal ?? '');
      setCarbs(
        editingMeal.meal_carbs.map((c) => ({
          category_id: c.food?.category_id ?? '',
          food_name: c.food?.name ?? '',
          quantity: c.quantity?.toString() ?? '',
          unit: c.unit ?? 'g',
        }))
      );
      setPairings(
        editingMeal.meal_pairings.map((p) => ({
          category_id: p.food?.category_id ?? '',
          food_name: p.food?.name ?? '',
          quantity: p.quantity?.toString() ?? '',
          unit: p.unit ?? '',
        }))
      );
      setNotes(editingMeal.notes ?? '');
    } else {
      const firstCarbCategory = categories.find((c) => c.type === 'carb');
      setEatenAt(toLocalDatetimeInput(new Date()));
      setMealSlot(defaultSlot);
      setMainMeal('');
      setCarbs(firstCarbCategory ? [emptyRow(firstCarbCategory.id, firstCarbCategory.name, 'g')] : []);
      setPairings([]);
      setNotes('');
    }
  }, [open, editingMeal, defaultSlot, categories]);

  const handleAddCarb = () => {
    if (!carbCategories[0]) return;
    setCarbs([...carbs, emptyRow(carbCategories[0].id, carbCategories[0].name, 'g')]);
  };
  const handleRemoveCarb = (idx: number) => setCarbs(carbs.filter((_, i) => i !== idx));
  const handleCarbCategoryChange = (idx: number, categoryId: string) => {
    const category = carbCategories.find((c) => c.id === categoryId);
    setCarbs(
      carbs.map((c, i) =>
        i === idx ? { ...c, category_id: categoryId, food_name: category?.name ?? '' } : c
      )
    );
  };
  const handleCarbFieldChange = (idx: number, field: 'food_name' | 'quantity' | 'unit', value: string) => {
    setCarbs(carbs.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  const handleAddPairing = () => {
    if (!pairingCategories[0]) return;
    setPairings([...pairings, emptyRow(pairingCategories[0].id, pairingCategories[0].name, '')]);
  };
  const handleRemovePairing = (idx: number) => setPairings(pairings.filter((_, i) => i !== idx));
  const handlePairingCategoryChange = (idx: number, categoryId: string) => {
    const category = pairingCategories.find((c) => c.id === categoryId);
    setPairings(
      pairings.map((p, i) =>
        i === idx ? { ...p, category_id: categoryId, food_name: category?.name ?? '' } : p
      )
    );
  };
  const handlePairingFieldChange = (idx: number, field: 'food_name' | 'quantity' | 'unit', value: string) => {
    setPairings(pairings.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const resolvedCarbs: { food_id: string; quantity: string; unit: string }[] = [];
      for (const c of carbs) {
        if (!c.food_name.trim()) continue;
        const { data: food, error: foodErr } = await findOrCreateFood(c.category_id, c.food_name);
        if (foodErr || !food) throw new Error(foodErr ?? 'Failed to resolve food');
        resolvedCarbs.push({ food_id: food.id, quantity: c.quantity, unit: c.unit });
      }
      const resolvedPairings: { food_id: string; quantity: string; unit: string }[] = [];
      for (const p of pairings) {
        if (!p.food_name.trim()) continue;
        const { data: food, error: foodErr } = await findOrCreateFood(p.category_id, p.food_name);
        if (foodErr || !food) throw new Error(foodErr ?? 'Failed to resolve food');
        resolvedPairings.push({ food_id: food.id, quantity: p.quantity, unit: p.unit });
      }
      await onSave({
        eaten_at: new Date(eatenAt).toISOString(),
        meal_slot: mealSlot,
        main_meal: mainMeal.trim(),
        carbs: resolvedCarbs,
        pairings: resolvedPairings,
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save meal');
    } finally {
      setSaving(false);
    }
  };

  const foodsForCategory = (categoryId: string): Food[] =>
    foods.filter((f) => f.category_id === categoryId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingMeal ? 'Edit meal' : 'Add meal'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="meal-form" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    >
      <form id="meal-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="When"
            type="datetime-local"
            value={eatenAt}
            onChange={(e) => setEatenAt(e.target.value)}
            required
          />
          <Select label="Meal slot" value={mealSlot} onChange={(e) => setMealSlot(e.target.value as MealSlot)}>
            {MEAL_SLOTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <Input
          label="Main meal"
          value={mainMeal}
          onChange={(e) => setMainMeal(e.target.value)}
          placeholder="e.g., Lentil soup, salad, chicken"
        />

        {/* Carbs section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-stone-600">Carbohydrate components</span>
            <button
              type="button"
              onClick={handleAddCarb}
              className="text-teal-600 hover:text-teal-700 text-sm font-medium flex items-center gap-1"
            >
              <Plus size={16} /> Add
            </button>
          </div>
          <div className="space-y-2">
            {carbs.map((carb, idx) => (
              <div key={idx} className="bg-stone-50 rounded-xl p-3 space-y-2">
                <div className="flex gap-2">
                  <select
                    className="flex-1 px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                    value={carb.category_id}
                    onChange={(e) => handleCarbCategoryChange(idx, e.target.value)}
                  >
                    {carbCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveCarb(idx)}
                    className="p-2 text-stone-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <input
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  placeholder="Which food?"
                  list={`carb-food-options-${idx}`}
                  value={carb.food_name}
                  onChange={(e) => handleCarbFieldChange(idx, 'food_name', e.target.value)}
                />
                <datalist id={`carb-food-options-${idx}`}>
                  {foodsForCategory(carb.category_id).map((f) => (
                    <option key={f.id} value={f.name} />
                  ))}
                </datalist>
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                    placeholder="Qty"
                    type="number"
                    inputMode="decimal"
                    value={carb.quantity}
                    onChange={(e) => handleCarbFieldChange(idx, 'quantity', e.target.value)}
                  />
                  <select
                    className="w-28 px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                    value={carb.unit}
                    onChange={(e) => handleCarbFieldChange(idx, 'unit', e.target.value)}
                  >
                    {CARB_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pairings section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-stone-600">Pairings (fat/protein/fiber)</span>
            <button
              type="button"
              onClick={handleAddPairing}
              className="text-teal-600 hover:text-teal-700 text-sm font-medium flex items-center gap-1"
            >
              <Plus size={16} /> Add
            </button>
          </div>
          {pairings.length === 0 ? (
            <p className="text-xs text-stone-400 py-2">No pairings added</p>
          ) : (
            <div className="space-y-2">
              {pairings.map((pairing, idx) => (
                <div key={idx} className="bg-stone-50 rounded-xl p-3 space-y-2">
                  <div className="flex gap-2">
                    <select
                      className="flex-1 px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                      value={pairing.category_id}
                      onChange={(e) => handlePairingCategoryChange(idx, e.target.value)}
                    >
                      {pairingCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleRemovePairing(idx)}
                      className="p-2 text-stone-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                    placeholder="Which food?"
                    list={`pairing-food-options-${idx}`}
                    value={pairing.food_name}
                    onChange={(e) => handlePairingFieldChange(idx, 'food_name', e.target.value)}
                  />
                  <datalist id={`pairing-food-options-${idx}`}>
                    {foodsForCategory(pairing.category_id).map((f) => (
                      <option key={f.id} value={f.name} />
                    ))}
                  </datalist>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                      placeholder="Qty"
                      type="number"
                      inputMode="decimal"
                      value={pairing.quantity}
                      onChange={(e) => handlePairingFieldChange(idx, 'quantity', e.target.value)}
                    />
                    <input
                      className="w-28 px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                      placeholder="Unit"
                      value={pairing.unit}
                      onChange={(e) => handlePairingFieldChange(idx, 'unit', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Input
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How you felt, cravings, etc."
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
