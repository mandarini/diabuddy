import { useState, useEffect, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface WeightModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (weightKg: number, measuredAt: string) => Promise<void>;
  currentValue?: number | null;
  currentMeasuredAt?: string | null;
}

export function WeightModal({
  open,
  onClose,
  onSave,
  currentValue,
  currentMeasuredAt,
}: WeightModalProps) {
  const [weight, setWeight] = useState('');
  const [measuredAt, setMeasuredAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setWeight(currentValue?.toString() ?? '');
    const defaultTime = currentMeasuredAt ? new Date(currentMeasuredAt) : new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setMeasuredAt(
      `${defaultTime.getFullYear()}-${pad(defaultTime.getMonth() + 1)}-${pad(defaultTime.getDate())}T${pad(defaultTime.getHours())}:${pad(defaultTime.getMinutes())}`
    );
  }, [open, currentValue, currentMeasuredAt]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const val = parseFloat(weight);
    if (isNaN(val) || val < 30 || val > 250) {
      setError('Enter a value between 30 and 250 kg');
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
      title="Weight"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="weight-form" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    >
      <form id="weight-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Weight (kg)"
          type="number"
          step="0.1"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="e.g., 68.5"
          required
          inputMode="decimal"
          autoFocus
        />
        <Input
          label="Measured at"
          type="datetime-local"
          value={measuredAt}
          onChange={(e) => setMeasuredAt(e.target.value)}
          required
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
