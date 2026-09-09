import { supabase } from '@/lib/supabase/client';
import { describeFunctionError as describeFunctionErrorInfo } from '@/lib/supabase/functionError';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export type PushSupport = 'available' | 'unsupported' | 'ios-needs-install' | 'denied';

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// iOS Safari exposes PushManager only once the site is installed to the Home Screen.
export function getPushSupport(): PushSupport {
  const supported =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!supported) return isIOS() ? 'ios-needs-install' : 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return 'available';
}

async function getSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function isEnabledOnThisDevice(): Promise<boolean> {
  if (getPushSupport() !== 'available') return false;
  return (await getSubscription()) !== null;
}

export async function enableReminders(): Promise<{ error: string | null }> {
  if (!VAPID_PUBLIC_KEY) return { error: 'VITE_VAPID_PUBLIC_KEY is not configured' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { error: 'Notification permission was not granted' };

  const registration = await navigator.serviceWorker.ready;
  // A fresh subscription guarantees a new endpoint, so a device previously used
  // by another account never collides with that account's row.
  const existing = await registration.pushManager.getSubscription();
  if (existing) await existing.unsubscribe();

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: VAPID_PUBLIC_KEY,
  });
  const { endpoint, keys } = subscription.toJSON();
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    await subscription.unsubscribe();
    return { error: 'Browser returned an incomplete push subscription' };
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ endpoint, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: 'endpoint' });
  if (error) {
    await subscription.unsubscribe();
    return { error: error.message };
  }
  return { error: null };
}

export interface DeviceInfo {
  endpoint: string;
  label: string;
  createdAt: string;
  isThisDevice: boolean;
}

// The push service host is the only device hint a subscription carries.
function labelForEndpoint(endpoint: string): string {
  const host = new URL(endpoint).hostname;
  if (host.endsWith('push.apple.com')) return 'Safari / iPhone';
  if (host === 'fcm.googleapis.com' || host.endsWith('android.googleapis.com')) return 'Chrome / Android';
  if (host.endsWith('push.services.mozilla.com')) return 'Firefox';
  if (host.endsWith('notify.windows.com')) return 'Edge / Windows';
  return host;
}

export async function listDevices(): Promise<{ devices: DeviceInfo[]; error: string | null }> {
  const current = getPushSupport() === 'available' ? await getSubscription() : null;
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, created_at')
    .order('created_at', { ascending: true });
  if (error) return { devices: [], error: error.message };
  const devices = (data ?? []).map((row) => ({
    endpoint: row.endpoint as string,
    label: labelForEndpoint(row.endpoint as string),
    createdAt: row.created_at as string,
    isThisDevice: current?.endpoint === row.endpoint,
  }));
  return { devices, error: null };
}

export async function removeDevice(endpoint: string): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke('remove-device', { body: { endpoint } });
  if (error) return { error: await describeFunctionError(error) };
  if (!data?.removed) return { error: 'Unexpected response from the reminder service' };

  const current = getPushSupport() === 'available' ? await getSubscription() : null;
  if (current?.endpoint === endpoint) await current.unsubscribe();
  return { error: null };
}

export async function disableReminders(): Promise<{ error: string | null }> {
  const subscription = await getSubscription();
  if (!subscription) return { error: null };
  return removeDevice(subscription.endpoint);
}

async function describeFunctionError(error: unknown): Promise<string> {
  return (await describeFunctionErrorInfo(error)).message;
}

export async function sendTestNotification(): Promise<{ error: string | null }> {
  if (getPushSupport() !== 'available') return { error: 'Reminders are not available in this browser' };
  const subscription = await getSubscription();
  if (!subscription) return { error: 'Enable reminders on this device first' };

  const { data, error } = await supabase.functions.invoke('send-test-notification', {
    body: { endpoint: subscription.endpoint },
  });
  if (error) return { error: await describeFunctionError(error) };
  return data?.sent ? { error: null } : { error: 'Unexpected response from the reminder service' };
}
