import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  disableReminders,
  enableReminders,
  getPushSupport,
  isEnabledOnThisDevice,
  sendTestNotification,
  type PushSupport,
} from '@/lib/push/reminders';

const SUPPORT_MESSAGES: Record<Exclude<PushSupport, 'available'>, string> = {
  unsupported: 'Reminders are not supported in this browser.',
  'ios-needs-install':
    'Reminders are not supported in this browser. Add DiaBuddy to your Home Screen to enable them.',
  denied:
    'Notifications are blocked for this site. Allow them in your browser settings to enable reminders.',
};

export function RemindersCard() {
  const [support, setSupport] = useState<PushSupport>('unsupported');
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    const current = getPushSupport();
    setSupport(current);
    if (current === 'available') isEnabledOnThisDevice().then(setEnabled);
  }, []);

  const handleEnable = async () => {
    setBusy(true);
    setError(null);
    const result = await enableReminders();
    setBusy(false);
    setSupport(getPushSupport());
    if (result.error) {
      setError(result.error);
      return;
    }
    setEnabled(true);
  };

  const handleDisable = async () => {
    setBusy(true);
    setError(null);
    const result = await disableReminders();
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEnabled(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setError(null);
    setTestSent(false);
    const result = await sendTestNotification();
    setTesting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setTestSent(true);
    setTimeout(() => setTestSent(false), 4000);
  };

  return (
    <Card className="p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-700 mb-2">
        <Bell size={16} className="text-teal-600" /> Reminders
      </h3>
      <p className="text-sm text-stone-500 mb-3">
        Get a notification on this device one hour after each meal if the reading is still missing.
      </p>

      {support !== 'available' ? (
        <p className="text-sm text-stone-500">{SUPPORT_MESSAGES[support]}</p>
      ) : enabled ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-teal-600">Enabled on this device</span>
          <Button variant="secondary" size="sm" onClick={handleTest} disabled={busy || testing}>
            {testing ? 'Sending...' : 'Send test notification'}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDisable} disabled={busy || testing}>
            {busy ? 'Disabling...' : 'Disable'}
          </Button>
        </div>
      ) : (
        <Button onClick={handleEnable} disabled={busy}>
          {busy ? 'Enabling...' : 'Enable on this device'}
        </Button>
      )}

      {testSent && <p className="text-sm text-teal-600 mt-2">Sent — check your notifications.</p>}
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </Card>
  );
}
