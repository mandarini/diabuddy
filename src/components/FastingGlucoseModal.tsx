import { useState, useEffect, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface FastingGlucoseModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (glucose: number, measuredAt: string) => Promise<void>;
  currentValue?: number | null;
  currentMeasuredAt?: string | null;
  targetMax?: number | null;
}

export function FastingGlucoseModal({
  open,
  onClose,
  onSave,
  currentValue,
  currentMeasuredAt,
  targetMax,
}: FastingGlucoseModalProps) {
  const [glucose, setGlucose] = useState('');
  const [measuredAt, setMeasuredAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setGlucose(currentValue?.toString() ?? '');
    const defaultTime = currentMeasuredAt ? new Date(currentMeasuredAt) : new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setMeasuredAt(
      `${defaultTime.getFullYear()}-${pad(defaultTime.getMonth() + 1)}-${pad(defaultTime.getDate())}T${pad(defaultTime.getHours())}:${pad(defaultTime.getMinutes())}`
    );
  }, [open, currentValue, currentMeasuredAt]);

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

  const isHigh = currentValue && targetMax && currentValue > targetMax;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Fasting glucose"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="fasting-form" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    >
      <form id="fasting-form" onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Glucose (mg/dL)"
          type="number"
          value={glucose}
          onChange={(e) => setGlucose(e.target.value)}
          placeholder="e.g., 90"
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
        {isHigh && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            This reading is above your target of {targetMax} mg/dL
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
