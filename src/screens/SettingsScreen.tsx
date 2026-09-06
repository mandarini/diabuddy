import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useUserSettings, upsertUserSettings } from '@/lib/hooks/useUserSettings';
import { useAllMeals } from '@/lib/hooks/useMeals';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Loading';
import { Download, LogOut, Baby, Target, Clock } from 'lucide-react';
import { formatFoodLabel, type MealWithRelations } from '@/lib/types';

function csvField(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function mealsToCSV(meals: MealWithRelations[]): string {
  const rows: string[] = [];
  rows.push('date,time,meal_slot,main_meal,carbs,pairings,glucose_1h_mg_dl,glucose_measured_at,walked_after,walk_minutes,notes');

  for (const meal of meals) {
    const date = meal.eaten_at.slice(0, 10);
    const time = meal.eaten_at.slice(11, 16);
    const carbs = meal.meal_carbs
      .filter((c) => c.food)
      .map((c) => [formatFoodLabel(c.food!), c.quantity, c.unit].filter(Boolean).join(' '))
      .join('; ');
    const pairings = meal.meal_pairings
      .filter((p) => p.food)
      .map((p) => [formatFoodLabel(p.food!), p.quantity, p.unit].filter(Boolean).join(' '))
      .join('; ');

    const row = [
      date,
      time,
      meal.meal_slot,
      meal.main_meal ?? '',
      carbs,
      pairings,
      meal.glucose_1h_mg_dl ?? '',
      meal.glucose_measured_at ?? '',
      meal.walked_after ? 'yes' : 'no',
      meal.walk_minutes ?? '',
      meal.notes ?? '',
    ].map(csvField);
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SettingsScreen() {
  const { signOut } = useAuth();
  const { settings, loading, refetch } = useUserSettings();
  const { meals } = useAllMeals();

  const [edd, setEdd] = useState('');
  const [fastingTarget, setFastingTarget] = useState('');
  const [postmealTarget, setPostmealTarget] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    if (settings) {
      setEdd(settings.pregnancy_edd ?? '');
      setFastingTarget(settings.fasting_target_max?.toString() ?? '');
      setPostmealTarget(settings.postmeal_1h_target_max?.toString() ?? '');
    }
  }, [settings]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    const updates: Record<string, string | number | null> = {};
    if (edd) updates.pregnancy_edd = edd;
    else updates.pregnancy_edd = null;
    if (fastingTarget) updates.fasting_target_max = parseInt(fastingTarget);
    if (postmealTarget) updates.postmeal_1h_target_max = parseInt(postmealTarget);

    const { error } = await upsertUserSettings(updates);
    setSaving(false);
    if (error) {
      console.error(error);
    } else {
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 2000);
      refetch();
    }
  }, [edd, fastingTarget, postmealTarget, refetch]);

  const handleExport = () => {
    const csv = mealsToCSV(meals);
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `gd-tracker-export-${date}.csv`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-stone-800">Settings</h1>

      {/* Pregnancy settings */}
      <Card className="p-4 space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-700">
          <Baby size={16} className="text-teal-600" /> Pregnancy
        </h3>
        <Input
          label="Estimated due date (EDD)"
          type="date"
          value={edd}
          onChange={(e) => setEdd(e.target.value)}
          hint="Used to calculate gestational age on the Insights screen"
        />
      </Card>

      {/* Glucose targets */}
      <Card className="p-4 space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-700">
          <Target size={16} className="text-teal-600" /> Glucose targets
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Fasting max (mg/dL)"
            type="number"
            value={fastingTarget}
            onChange={(e) => setFastingTarget(e.target.value)}
            placeholder="95"
            inputMode="numeric"
          />
          <Input
            label="1h post-meal max (mg/dL)"
            type="number"
            value={postmealTarget}
            onChange={(e) => setPostmealTarget(e.target.value)}
            placeholder="140"
            inputMode="numeric"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save settings'}
          </Button>
          {savedMessage && <span className="text-sm text-teal-600">Saved</span>}
        </div>
      </Card>

      {/* Timezone info */}
      <Card className="p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-700 mb-2">
          <Clock size={16} className="text-teal-600" /> Timezone
        </h3>
        <p className="text-sm text-stone-500">
          {settings?.timezone ?? 'Europe/Athens'} (Athens, Greece)
        </p>
      </Card>

      {/* Data export */}
      <Card className="p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-700 mb-3">
          <Download size={16} className="text-teal-600" /> Data export
        </h3>
        <p className="text-sm text-stone-500 mb-3">
          Download all your meal entries as a CSV file.
        </p>
        <Button variant="secondary" onClick={handleExport} className="flex items-center gap-1.5">
          <Download size={16} /> Export CSV
        </Button>
      </Card>

      {/* Sign out */}
      <Card className="p-4">
        <Button variant="danger" onClick={signOut} className="flex items-center gap-1.5 w-full">
          <LogOut size={16} /> Sign out
        </Button>
      </Card>
    </div>
  );
}
