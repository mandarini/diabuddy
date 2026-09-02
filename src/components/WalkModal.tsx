import { useState, useEffect, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface WalkModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (walked: boolean, minutes: number | null) => Promise<void>;
  currentWalked?: boolean;
  currentMinutes?: number | null;
}

export function WalkModal({
  open,
  onClose,
  onSave,
  currentWalked = false,
  currentMinutes = null,
}: WalkModalProps) {
  const [walked, setWalked] = useState(currentWalked);
  const [minutes, setMinutes] = useState(currentMinutes?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setWalked(currentWalked);
    setMinutes(currentMinutes?.toString() ?? '');
  }, [open, currentWalked, currentMinutes]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const mins = minutes ? parseInt(minutes) : null;
      await onSave(walked, mins);
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
      title="Post-meal walk"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="walk-form" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    >
      <form id="walk-form" onSubmit={handleSubmit} className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={walked}
            onChange={(e) => setWalked(e.target.checked)}
            className="w-5 h-5 rounded-lg border-stone-300 text-teal-600 focus:ring-teal-500/30"
          />
          <span className="text-sm font-medium text-stone-700">Walked after this meal</span>
        </label>
        {walked && (
          <Input
            label="Duration (minutes)"
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="e.g., 15"
            inputMode="numeric"
            min={1}
            max={240}
          />
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
