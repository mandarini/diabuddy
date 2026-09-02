import { useState, useEffect, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { minutesAfterMeal } from '@/lib/date';

interface GlucoseModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (glucose: number, measuredAt: string) => Promise<void>;
  mealEatenAt: string;
  currentValue?: number | null;
  currentMeasuredAt?: string | null;
}

export function GlucoseModal({
  open,
  onClose,
  onSave,
  mealEatenAt,
  currentValue,
  currentMeasuredAt,
}: GlucoseModalProps) {
  const [glucose, setGlucose] = useState('');
  const [measuredAt, setMeasuredAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setGlucose(currentValue?.toString() ?? '');
    const defaultTime = currentMeasuredAt
      ? new Date(currentMeasuredAt)
      : new Date(Date.now() + 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    setMeasuredAt(
      `${defaultTime.getFullYear()}-${pad(defaultTime.getMonth() + 1)}-${pad(defaultTime.getDate())}T${pad(defaultTime.getHours())}:${pad(defaultTime.getMinutes())}`
    );
  }, [open, currentValue, currentMeasuredAt]);

  const minutesAfter = measuredAt
    ? minutesAfterMeal(mealEatenAt, new Date(measuredAt).toISOString())
    : 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const val = parseFloat(glucose);
    if (isNaN(val) || val < 20 || val > 600) {
      setError('Enter a value between 20 and 600 mg/dL');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(val, new Date(measuredAt).toISOString());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Post-meal glucose"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="glucose-form" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    >
      <form id="glucose-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Glucose (mg/dL)"
          type="number"
          value={glucose}
          onChange={(e) => setGlucose(e.target.value)}
          placeholder="e.g., 120"
          required
          inputMode="numeric"
          autoFocus
        />
        <Input
          label="Measured at"
          type="datetime-local"
          value={measuredAt}
          onChange={(e) => setMeasuredAt(e.target.value)}
          required
        />
        {minutesAfter > 0 && (
          <p className="text-sm text-stone-500 bg-stone-50 rounded-lg px-3 py-2">
            {minutesAfter} minutes after the meal
          </p>
        )}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
