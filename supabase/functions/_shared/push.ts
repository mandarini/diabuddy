import webpush from 'web-push';

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type PushResult =
  | { ok: true }
  | { ok: false; gone: boolean; status: number | undefined; message: string };

const PUSH_TTL_SECONDS = 60 * 60;

export function configureVapid() {
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  );
}

// `gone` (404/410) means the push service dropped the subscription; the row is dead.
export async function sendPush(sub: PushSubscriptionKeys, payload: string): Promise<PushResult> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
      { TTL: PUSH_TTL_SECONDS },
    );
    return { ok: true };
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    return {
      ok: false,
      gone: status === 404 || status === 410,
      status,
      message: (err as Error).message,
    };
  }
}
