import { withSupabase } from '@supabase/server';
import webpush from 'web-push';

const REMINDER_DELAY_MS = 60 * 60 * 1000;
const RETRY_WINDOW_MS = 3 * 60 * 60 * 1000;
const BATCH_LIMIT = 100;
const PUSH_TTL_SECONDS = 60 * 60;

const MEAL_SLOT_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  morning_snack: 'Morning snack',
  lunch: 'Lunch',
  afternoon_snack: 'Afternoon snack',
  dinner: 'Dinner',
  other: 'Meal',
};

interface DueMeal {
  id: string;
  user_id: string;
  meal_slot: string;
  main_meal: string | null;
}

interface Subscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function configureVapid() {
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  );
}

function buildPayload(meal: DueMeal): string {
  const label = MEAL_SLOT_LABELS[meal.meal_slot] ?? 'Meal';
  return JSON.stringify({
    title: 'Time for your 1-hour reading',
    body: meal.main_meal ? `${label} · ${meal.main_meal}` : label,
    tag: `meal-${meal.id}`,
    data: { mealId: meal.id },
  });
}

export default {
  // Untyped client: rows are narrowed to DueMeal / Subscription below.
  fetch: withSupabase<any>({ auth: 'secret:cron' }, async (_req, ctx) => {
    configureVapid();
    const db = ctx.supabaseAdmin;
    const now = Date.now();
    const dueBefore = new Date(now - REMINDER_DELAY_MS).toISOString();
    const notBefore = new Date(now - RETRY_WINDOW_MS).toISOString();

    const { data: candidateRows, error: mealsError } = await db
      .from('meal_entries')
      .select('id, user_id, meal_slot, main_meal')
      .is('glucose_1h_mg_dl', null)
      .is('reminder_sent_at', null)
      .lte('eaten_at', dueBefore)
      .gt('eaten_at', notBefore)
      .limit(BATCH_LIMIT);
    if (mealsError) return Response.json({ error: mealsError.message }, { status: 500 });
    const candidates = (candidateRows ?? []) as DueMeal[];

    const userIds = [...new Set(candidates.map((m) => m.user_id))];
    let subscriptions: Subscription[] = [];
    if (userIds.length > 0) {
      const { data, error } = await db
        .from('push_subscriptions')
        .select('id, user_id, endpoint, p256dh, auth')
        .in('user_id', userIds);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      subscriptions = (data ?? []) as Subscription[];
    }

    const subsByUser = new Map<string, Subscription[]>();
    for (const sub of subscriptions) {
      subsByUser.set(sub.user_id, [...(subsByUser.get(sub.user_id) ?? []), sub]);
    }

    const dueMeals = candidates.filter((m) => subsByUser.has(m.user_id));
    let sent = 0;
    let failed = 0;
    const deliveredMealIds: string[] = [];
    const staleSubscriptionIds = new Set<string>();

    for (const meal of dueMeals) {
      const payload = buildPayload(meal);
      let delivered = false;
      for (const sub of subsByUser.get(meal.user_id)!) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            { TTL: PUSH_TTL_SECONDS },
          );
          sent += 1;
          delivered = true;
        } catch (err) {
          failed += 1;
          const status = (err as { statusCode?: number }).statusCode;
          // 404/410 mean the browser dropped the subscription; anything else is retried next tick.
          if (status === 404 || status === 410) {
            staleSubscriptionIds.add(sub.id);
          } else {
            console.error('push failed', {
              mealId: meal.id,
              subscriptionId: sub.id,
              status,
              message: (err as Error).message,
            });
          }
        }
      }
      if (delivered) deliveredMealIds.push(meal.id);
    }

    if (deliveredMealIds.length > 0) {
      const { error } = await db
        .from('meal_entries')
        .update({ reminder_sent_at: new Date().toISOString() })
        .in('id', deliveredMealIds);
      if (error) console.error('failed to mark reminders sent', error.message);
    }

    if (staleSubscriptionIds.size > 0) {
      const { error } = await db
        .from('push_subscriptions')
        .delete()
        .in('id', [...staleSubscriptionIds]);
      if (error) console.error('failed to remove stale subscriptions', error.message);
    }

    return Response.json({
      due: dueMeals.length,
      sent,
      failed,
      removedSubscriptions: staleSubscriptionIds.size,
    });
  }),
};
