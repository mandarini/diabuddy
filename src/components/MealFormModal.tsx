import { useState, useEffect, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Plus, Trash2 } from 'lucide-react';
import {
  MEAL_SLOTS,
  CARB_FAMILIES,
  PAIRING_FAMILIES,
  CARB_UNITS,
  COMMON_FRUITS,
  type MealSlot,
  type MealWithRelations,
} from '@/lib/types';

interface MealFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: MealFormData) => Promise<void>;
  editingMeal?: MealWithRelations | null;
  defaultSlot?: MealSlot;
}

export interface CarbRow {
  carb_family: string;
  item_name: string;
  quantity: string;
  unit: string;
}

export interface PairingRow {
  pairing_family: string;
  item_name: string;
  quantity: string;
  unit: string;
}

export interface MealFormData {
  eaten_at: string;
  meal_slot: MealSlot;
  main_meal: string;
  carbs: CarbRow[];
  pairings: PairingRow[];
  notes: string;
}

export interface MealSubmitData {
  eaten_at: string;
  meal_slot: MealSlot;
  main_meal: string | undefined;
  carbs: { carb_family: string; item_name: string; quantity: string; unit: string }[];
  pairings: { pairing_family: string; item_name: string; quantity: string; unit: string }[];
  notes: string | undefined;
}

function toLocalDatetimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function emptyCarb(): CarbRow {
  return { carb_family: 'Rice', item_name: '', quantity: '', unit: 'g' };
}

function emptyPairing(): PairingRow {
  return { pairing_family: 'Nuts', item_name: '', quantity: '', unit: '' };
}

export function MealFormModal({
  open,
  onClose,
  onSave,
  editingMeal,
  defaultSlot = 'breakfast',
}: MealFormModalProps) {
  const [eatenAt, setEatenAt] = useState(toLocalDatetimeInput(new Date()));
  const [mealSlot, setMealSlot] = useState<MealSlot>(defaultSlot);
  const [mainMeal, setMainMeal] = useState('');
  const [carbs, setCarbs] = useState<CarbRow[]>([emptyCarb()]);
  const [pairings, setPairings] = useState<PairingRow[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingMeal) {
      setEatenAt(toLocalDatetimeInput(new Date(editingMeal.eaten_at)));
      setMealSlot(editingMeal.meal_slot);
      setMainMeal(editingMeal.main_meal ?? '');
      setCarbs(
        editingMeal.meal_carbs.length > 0
          ? editingMeal.meal_carbs.map((c) => ({
              carb_family: c.carb_family,
              item_name: c.item_name ?? '',
              quantity: c.quantity?.toString() ?? '',
              unit: c.unit ?? 'g',
            }))
          : [emptyCarb()]
      );
      setPairings(
        editingMeal.meal_pairings.map((p) => ({
          pairing_family: p.pairing_family,
          item_name: p.item_name ?? '',
          quantity: p.quantity?.toString() ?? '',
          unit: p.unit ?? '',
        }))
      );
      setNotes(editingMeal.notes ?? '');
    } else {
      setEatenAt(toLocalDatetimeInput(new Date()));
      setMealSlot(defaultSlot);
      setMainMeal('');
      setCarbs([emptyCarb()]);
      setPairings([]);
      setNotes('');
    }
  }, [open, editingMeal, defaultSlot]);

  const handleAddCarb = () => setCarbs([...carbs, emptyCarb()]);
  const handleRemoveCarb = (idx: number) => setCarbs(carbs.filter((_, i) => i !== idx));
  const handleCarbChange = (idx: number, field: keyof CarbRow, value: string) => {
    setCarbs(carbs.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  const handleAddPairing = () => setPairings([...pairings, emptyPairing()]);
  const handleRemovePairing = (idx: number) =>
    setPairings(pairings.filter((_, i) => i !== idx));
  const handlePairingChange = (idx: number, field: keyof PairingRow, value: string) => {
    setPairings(pairings.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({
        eaten_at: new Date(eatenAt).toISOString(),
        meal_slot: mealSlot,
        main_meal: mainMeal.trim(),
        carbs: carbs.filter((c) => c.carb_family),
        pairings: pairings.filter((p) => p.pairing_family),
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save meal');
    } finally {
      setSaving(false);
    }
  };

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
                    value={carb.carb_family}
                    onChange={(e) => handleCarbChange(idx, 'carb_family', e.target.value)}
                  >
                    {CARB_FAMILIES.map((f) => (
                      <option key={f} value={f}>
                        {f}
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
                {carb.carb_family === 'Fruit' ? (
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                    value={carb.item_name}
                    onChange={(e) => handleCarbChange(idx, 'item_name', e.target.value)}
                  >
                    <option value="">Select fruit (optional)</option>
                    {COMMON_FRUITS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                    placeholder="Specific item (optional)"
                    value={carb.item_name}
                    onChange={(e) => handleCarbChange(idx, 'item_name', e.target.value)}
                  />
                )}
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                    placeholder="Qty"
                    type="number"
                    inputMode="decimal"
                    value={carb.quantity}
                    onChange={(e) => handleCarbChange(idx, 'quantity', e.target.value)}
                  />
                  <select
                    className="w-28 px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                    value={carb.unit}
                    onChange={(e) => handleCarbChange(idx, 'unit', e.target.value)}
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
            <span className="text-sm font-medium text-stone-600">Pairings (fat/protein)</span>
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
                      value={pairing.pairing_family}
                      onChange={(e) => handlePairingChange(idx, 'pairing_family', e.target.value)}
                    >
                      {PAIRING_FAMILIES.map((f) => (
                        <option key={f} value={f}>
                          {f}
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
                    placeholder="Specific item (optional)"
                    value={pairing.item_name}
                    onChange={(e) => handlePairingChange(idx, 'item_name', e.target.value)}
                  />
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                      placeholder="Qty"
                      type="number"
                      inputMode="decimal"
                      value={pairing.quantity}
                      onChange={(e) => handlePairingChange(idx, 'quantity', e.target.value)}
                    />
                    <input
                      className="w-28 px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                      placeholder="Unit"
                      value={pairing.unit}
                      onChange={(e) => handlePairingChange(idx, 'unit', e.target.value)}
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
