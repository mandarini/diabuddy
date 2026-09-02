import { useState, useEffect, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface BloodPressureModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    systolic: number;
    diastolic: number;
    pulse?: number;
    measuredAt: string;
  }) => Promise<void>;
  title: string;
  currentSystolic?: number | null;
  currentDiastolic?: number | null;
  currentPulse?: number | null;
  currentMeasuredAt?: string | null;
}

export function BloodPressureModal({
  open,
  onClose,
  onSave,
  title,
  currentSystolic,
  currentDiastolic,
  currentPulse,
  currentMeasuredAt,
}: BloodPressureModalProps) {
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [measuredAt, setMeasuredAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSystolic(currentSystolic?.toString() ?? '');
    setDiastolic(currentDiastolic?.toString() ?? '');
    setPulse(currentPulse?.toString() ?? '');
    const defaultTime = currentMeasuredAt ? new Date(currentMeasuredAt) : new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setMeasuredAt(
      `${defaultTime.getFullYear()}-${pad(defaultTime.getMonth() + 1)}-${pad(defaultTime.getDate())}T${pad(defaultTime.getHours())}:${pad(defaultTime.getMinutes())}`
    );
  }, [open, currentSystolic, currentDiastolic, currentPulse, currentMeasuredAt]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const sys = parseInt(systolic);
    const dia = parseInt(diastolic);
    if (isNaN(sys) || isNaN(dia) || sys < 50 || sys > 300 || dia < 30 || dia > 200) {
      setError('Enter valid blood pressure values');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        systolic: sys,
        diastolic: dia,
        pulse: pulse ? parseInt(pulse) : undefined,
        measuredAt: new Date(measuredAt).toISOString(),
      });
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
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="bp-form" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    >
      <form id="bp-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Systolic (mmHg)"
            type="number"
            value={systolic}
            onChange={(e) => setSystolic(e.target.value)}
            placeholder="e.g., 120"
            required
            inputMode="numeric"
            autoFocus
          />
          <Input
            label="Diastolic (mmHg)"
            type="number"
            value={diastolic}
            onChange={(e) => setDiastolic(e.target.value)}
            placeholder="e.g., 80"
            required
            inputMode="numeric"
          />
        </div>
        <Input
          label="Pulse (bpm, optional)"
          type="number"
          value={pulse}
          onChange={(e) => setPulse(e.target.value)}
          placeholder="e.g., 75"
          inputMode="numeric"
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
