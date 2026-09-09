import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

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

export async function disableReminders(): Promise<{ error: string | null }> {
  const subscription = await getSubscription();
  if (!subscription) return { error: null };
  const { endpoint } = subscription;
  await subscription.unsubscribe();
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  return { error: error?.message ?? null };
}

async function describeFunctionError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (typeof body?.error === 'string') return body.error;
    } catch {
      // fall through to the generic message
    }
  }
  return error instanceof Error ? error.message : 'Request failed';
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
