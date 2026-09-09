CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- re-running this migration replaces the job rather than duplicating it
SELECT cron.unschedule('send-glucose-reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-glucose-reminders');

SELECT cron.schedule(
  'send-glucose-reminders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/send-glucose-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
  $$
);
