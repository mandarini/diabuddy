// `pg` is an optional peer of @supabase/server; a root import is what lets Deno resolve it
// for the postgres-admin entry.
import 'pg';
import { pipeline } from '@supabase/middleware';
import { withSupabase } from '@supabase/server';
import { withPostgresAdminClient } from '@supabase/server/middleware/postgres-admin';
import { configureVapid, sendPush, type PushSubscriptionKeys } from '../_shared/push.ts';

const REMINDER_DELAY_MINUTES = 60;
const RETRY_WINDOW_HOURS = 3;
const BATCH_LIMIT = 100;

const MEAL_SLOT_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  morning_snack: 'Morning snack',
  lunch: 'Lunch',
  afternoon_snack: 'Afternoon snack',
  dinner: 'Dinner',
  other: 'Meal',
};

interface Subscription extends PushSubscriptionKeys {
  id: string;
}

interface DueMeal {
  id: string;
  meal_slot: string;
  main_meal: string | null;
  subscriptions: Subscription[];
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
  fetch: pipeline(
    [withSupabase({ auth: 'secret:cron' }), withPostgresAdminClient()],
    async (_req, ctx) => {
      configureVapid();
      const sql = ctx.postgresAdmin;

      let dueMeals: DueMeal[];
      try {
        // A meal is due once its 1-hour reading is still missing at the 60-minute mark;
        // the 3-hour bound is the retry window. Meals whose user has no device drop out via the join.
        dueMeals = await sql.query`
          select m.id, m.meal_slot, m.main_meal,
                 json_agg(json_build_object(
                   'id', s.id, 'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth
                 )) as subscriptions
          from public.meal_entries m
          join public.push_subscriptions s on s.user_id = m.user_id
          where m.glucose_1h_mg_dl is null
            and m.reminder_sent_at is null
            and m.eaten_at <= now() - ${REMINDER_DELAY_MINUTES}::int * interval '1 minute'
            and m.eaten_at >  now() - ${RETRY_WINDOW_HOURS}::int * interval '1 hour'
          group by m.id
          order by m.eaten_at
          limit ${BATCH_LIMIT}
        `;
      } catch (err) {
        return Response.json({ error: (err as Error).message }, { status: 500 });
      }

      let sent = 0;
      let failed = 0;
      const deliveredMealIds: string[] = [];
      const staleSubscriptionIds = new Set<string>();

      for (const meal of dueMeals) {
        const payload = buildPayload(meal);
        let delivered = false;
        for (const sub of meal.subscriptions) {
          const result = await sendPush(sub, payload);
          if (result.ok) {
            sent += 1;
            delivered = true;
            continue;
          }
          failed += 1;
          // A dead subscription is pruned; any other failure is retried next tick.
          if (result.gone) {
            staleSubscriptionIds.add(sub.id);
          } else {
            console.error('push failed', {
              mealId: meal.id,
              subscriptionId: sub.id,
              status: result.status,
              message: result.message,
            });
          }
        }
        if (delivered) deliveredMealIds.push(meal.id);
      }

      if (deliveredMealIds.length > 0) {
        try {
          await sql.query`
            update public.meal_entries set reminder_sent_at = now()
            where id = any(${deliveredMealIds}::uuid[])
          `;
        } catch (err) {
          console.error('failed to mark reminders sent', (err as Error).message);
        }
      }

      if (staleSubscriptionIds.size > 0) {
        try {
          await sql.query`
            delete from public.push_subscriptions
            where id = any(${[...staleSubscriptionIds]}::uuid[])
          `;
        } catch (err) {
          console.error('failed to remove stale subscriptions', (err as Error).message);
        }
      }

      return Response.json({
        due: dueMeals.length,
        sent,
        failed,
        removedSubscriptions: staleSubscriptionIds.size,
      });
    },
  ),
};
