import { pipeline } from '@supabase/middleware';
import { withCors } from '@supabase/middleware/cors';
import { withSupabase } from '@supabase/server';
import { configureVapid, sendPush, type PushSubscriptionKeys } from '../_shared/push.ts';

const ALLOWED_ORIGINS = ['https://diabuddy.netlify.app', 'http://localhost:5173'];

const TEST_PAYLOAD = JSON.stringify({
  title: 'Test notification',
  body: 'Reminders are working on this device.',
  tag: 'test',
});

export default {
  fetch: pipeline(
    [
      // Runs ahead of the auth gate so the browser preflight is answered unauthenticated.
      withCors({ origin: ALLOWED_ORIGINS, methods: ['POST'] }),
      // Untyped client: the single row read below is narrowed to PushSubscriptionKeys.
      withSupabase<any>({ auth: 'user', cors: 'disabled' }),
    ],
    async (req, ctx) => {
      if (req.method !== 'POST') {
        return Response.json({ error: 'Method not allowed' }, { status: 405 });
      }

      let endpoint: unknown;
      try {
        ({ endpoint } = await req.json());
      } catch {
        return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
      }
      if (typeof endpoint !== 'string' || endpoint === '') {
        return Response.json({ error: 'endpoint is required' }, { status: 400 });
      }

      // RLS scopes this client to the caller, so a hit proves the device is theirs.
      const db = ctx.supabase;
      const { data, error } = await db
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('endpoint', endpoint)
        .maybeSingle();
      if (error) return Response.json({ error: error.message }, { status: 500 });
      if (!data) {
        return Response.json({ error: 'Reminders are not enabled on this device' }, { status: 404 });
      }

      configureVapid();
      const result = await sendPush(data as PushSubscriptionKeys, TEST_PAYLOAD);
      if (result.ok) return Response.json({ sent: true });

      if (result.gone) {
        await db.from('push_subscriptions').delete().eq('endpoint', endpoint);
        return Response.json(
          { error: 'This device’s subscription has expired. Disable and re-enable reminders.' },
          { status: 410 },
        );
      }

      console.error('test push failed', { status: result.status, message: result.message });
      return Response.json({ error: 'The push service rejected the notification' }, { status: 502 });
    },
  ),
};
