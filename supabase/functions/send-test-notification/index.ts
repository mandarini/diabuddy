import { pipeline } from '@supabase/middleware';
import { configureVapid, sendPush } from '../_shared/push.ts';
import { withDeviceRequest } from '../_shared/with-device-request.ts';

const TEST_PAYLOAD = JSON.stringify({
  title: 'Test notification',
  body: 'Reminders are working on this device.',
  tag: 'test',
});

export default {
  fetch: pipeline([withDeviceRequest()], async (_req, ctx) => {
    configureVapid();
    const result = await sendPush(ctx.pushSubscription, TEST_PAYLOAD);
    if (result.ok) return Response.json({ sent: true });

    if (result.gone) {
      await ctx.supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', ctx.pushSubscription.endpoint);
      return Response.json(
        { error: 'This device’s subscription has expired. Disable and re-enable reminders.' },
        { status: 410 },
      );
    }

    console.error('test push failed', { status: result.status, message: result.message });
    return Response.json({ error: 'The push service rejected the notification' }, { status: 502 });
  }),
};
