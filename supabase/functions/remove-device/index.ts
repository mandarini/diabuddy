import { pipeline } from '@supabase/middleware';
import { withDeviceRequest } from '../_shared/with-device-request.ts';

export default {
  fetch: pipeline([withDeviceRequest()], async (_req, ctx) => {
    const { error } = await ctx.supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', ctx.pushSubscription.endpoint);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ removed: true });
  }),
};
