import { defineMiddleware } from '@supabase/middleware';
import type { SupabaseContext } from '@supabase/server';
import type { PushSubscriptionKeys } from './push.ts';

type Upstream = Pick<SupabaseContext<any>, 'supabase'>;

// Resolves `{ endpoint }` from a POST body to the caller's own push subscription.
// The upstream client is RLS-scoped, so a hit is proof the device belongs to the caller.
export const withPushSubscription = defineMiddleware<
  'pushSubscription',
  void,
  Upstream,
  PushSubscriptionKeys
>({
  key: 'pushSubscription',
  run: () => async (req, ctx) => {
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

    const { data, error } = await ctx.supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('endpoint', endpoint)
      .maybeSingle();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (!data) {
      return Response.json({ error: 'Reminders are not enabled on this device' }, { status: 404 });
    }

    return { pushSubscription: data as PushSubscriptionKeys };
  },
});
