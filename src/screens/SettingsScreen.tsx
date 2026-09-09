import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useUserSettings, upsertUserSettings } from '@/lib/hooks/useUserSettings';
import { useAllMeals } from '@/lib/hooks/useMeals';
import { useAllDailyMetrics } from '@/lib/hooks/useDailyMetrics';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Loading';
import { RemindersCard } from '@/components/RemindersCard';
import { fetchDoctorReport } from '@/lib/export/doctorReport';
import { Download, LogOut, Baby, Target, Clock, Github } from 'lucide-react';
import { formatFoodLabel, type MealWithRelations, type DailyMetrics, type MealSlot } from '@/lib/types';

function csvField(value: string | number): string {
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function mealsToCSV(meals: MealWithRelations[]): string {
  const rows: string[] = [];
  rows.push('date,time,meal_slot,main_meal,carbs,pairings,glucose_1h_mg_dl,glucose_measured_at,glucose_followup_mg_dl,glucose_followup_measured_at,walked_after,walk_minutes,notes');

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
      meal.glucose_followup_mg_dl ?? '',
      meal.glucose_followup_measured_at ?? '',
      meal.walked_after ? 'yes' : 'no',
      meal.walk_minutes ?? '',
      meal.notes ?? '',
    ].map(csvField);
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

function dailyMetricsToCSV(metrics: DailyMetrics[]): string {
  const rows: string[] = [];
  rows.push(
    'date,fasting_glucose_mg_dl,fasting_measured_at,morning_bp_systolic,morning_bp_diastolic,morning_pulse,morning_bp_measured_at,evening_bp_systolic,evening_bp_diastolic,evening_pulse,evening_bp_measured_at,weight_kg,weight_measured_at,notes'
  );

  for (const m of metrics) {
    const row = [
      m.metric_date,
      m.fasting_glucose_mg_dl ?? '',
      m.fasting_measured_at ?? '',
      m.morning_bp_systolic ?? '',
      m.morning_bp_diastolic ?? '',
      m.morning_pulse ?? '',
      m.morning_bp_measured_at ?? '',
      m.evening_bp_systolic ?? '',
      m.evening_bp_diastolic ?? '',
      m.evening_pulse ?? '',
      m.evening_bp_measured_at ?? '',
      m.weight_kg ?? '',
      m.weight_measured_at ?? '',
      m.notes ?? '',
    ].map(csvField);
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

function combinedToCSV(meals: MealWithRelations[], metrics: DailyMetrics[]): string {
  return [
    'MEALS',
    mealsToCSV(meals),
    '',
    'DAILY METRICS (fasting glucose, blood pressure, weight)',
    dailyMetricsToCSV(metrics),
  ].join('\n');
}

function doctorFormatToCSV(meals: MealWithRelations[], metrics: DailyMetrics[]): string {
  const rows: string[] = [];
  rows.push(
    'ΗΜ/ΝΙΑ,Πρωί νηστική,1 ώρα μετά το πρωινό,1 ώρα μετά μεσημεριανού,1 ώρα μετά το βραδινό,Αρτηριακή πίεση πρωί,Αρτηριακή πίεση απόγευμα,Σημειώσεις'
  );

  const mealsByDate = new Map<string, MealWithRelations[]>();
  for (const meal of meals) {
    const date = meal.eaten_at.slice(0, 10);
    const dayMeals = mealsByDate.get(date) ?? [];
    dayMeals.push(meal);
    mealsByDate.set(date, dayMeals);
  }

  const dates = new Set<string>([...mealsByDate.keys(), ...metrics.map((m) => m.metric_date)]);
  const ascendingDates = Array.from(dates).sort((a, b) => a.localeCompare(b));
  const sortedDates = [...ascendingDates].reverse();

  const WEIGHT_BLOCK_DAYS = 7;
  const weightByBlockEndDate = new Map<string, number>();
  for (let i = 0; i < ascendingDates.length; i += WEIGHT_BLOCK_DAYS) {
    const block = ascendingDates.slice(i, i + WEIGHT_BLOCK_DAYS);
    const blockEnd = block[block.length - 1];
    for (const date of block) {
      const weight = metrics.find((m) => m.metric_date === date)?.weight_kg;
      if (weight != null) weightByBlockEndDate.set(blockEnd, weight);
    }
  }

  const glucoseForSlot = (dayMeals: MealWithRelations[] | undefined, slot: MealSlot): string =>
    (dayMeals ?? [])
      .filter((meal) => meal.meal_slot === slot && meal.glucose_1h_mg_dl != null)
      .map((meal) => meal.glucose_1h_mg_dl)
      .join('; ');

  const formatBP = (systolic: number | null, diastolic: number | null): string =>
    systolic != null && diastolic != null ? `${systolic}/${diastolic}` : '';

  for (const date of sortedDates) {
    const dayMeals = mealsByDate.get(date);
    const dayMetrics = metrics.find((m) => m.metric_date === date);
    const noteParts = [dayMetrics?.notes, ...(dayMeals ?? []).map((m) => m.notes)].filter(Boolean);
    const blockWeight = weightByBlockEndDate.get(date);
    if (blockWeight != null) noteParts.push(`ΣΒ: ${blockWeight}`);
    const notes = noteParts.join('; ');

    const row = [
      date,
      dayMetrics?.fasting_glucose_mg_dl ?? '',
      glucoseForSlot(dayMeals, 'breakfast'),
      glucoseForSlot(dayMeals, 'lunch'),
      glucoseForSlot(dayMeals, 'dinner'),
      formatBP(dayMetrics?.morning_bp_systolic ?? null, dayMetrics?.morning_bp_diastolic ?? null),
      formatBP(dayMetrics?.evening_bp_systolic ?? null, dayMetrics?.evening_bp_diastolic ?? null),
      notes,
    ].map(csvField);
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([String.fromCharCode(0xfeff), csv], { type: 'text/csv;charset=utf-8' });
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
  const { metrics } = useAllDailyMetrics();

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
    const date = new Date().toISOString().slice(0, 10);
    downloadCSV(combinedToCSV(meals, metrics), `gd-tracker-export-${date}.csv`);
  };

  // The server-side report is gated per user; anyone the flag does not admit gets the local build.
  const handleExportDoctorFormat = async () => {
    const date = new Date().toISOString().slice(0, 10);
    const filename = `gd-tracker-doctor-format-${date}.csv`;
    const result = await fetchDoctorReport();
    if (result.kind === 'csv') {
      downloadCSV(result.csv, filename);
      return;
    }
    if (result.kind === 'error') console.error('Doctor report failed, exporting locally:', result.message);
    downloadCSV(doctorFormatToCSV(meals, metrics), filename);
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
          Download all your meal entries and daily metrics as a CSV file, or a simplified export
          in your doctor's fasting/1h-post-meal/blood pressure log format.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleExport} className="flex items-center gap-1.5">
            <Download size={16} /> Export CSV
          </Button>
          <Button variant="secondary" onClick={handleExportDoctorFormat} className="flex items-center gap-1.5">
            <Download size={16} /> Export for doctor
          </Button>
        </div>
      </Card>

      <RemindersCard />

      {/* Source code */}
      <Card className="p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-700 mb-2">
          <Github size={16} className="text-teal-600" /> Source code
        </h3>
        <p className="text-sm text-stone-500">
          Report bugs or request features on{' '}
          <a
            href="https://github.com/mandarini/diabuddy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 underline"
          >
            GitHub
          </a>
          .
        </p>
      </Card>

      {/* Sign out */}
      <Card className="p-4">
        <Button variant="danger" onClick={signOut} className="flex items-center gap-1.5 w-full">
          <LogOut size={16} /> Sign out
        </Button>
      </Card>

      <p className="text-center text-sm text-stone-400 pb-2">
        Created with 🐱 by{' '}
        <a
          href="https://psyber.city"
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-600 underline"
        >
          psybercity
        </a>
      </p>
    </div>
  );
}
