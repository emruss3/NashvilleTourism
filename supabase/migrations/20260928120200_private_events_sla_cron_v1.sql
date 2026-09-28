-- Hourly SLA watchdog for private event leads. Calls the site's server route
-- with the same Vault cron token the Supabase functions accept; the route
-- compares it with NASHROAM_CRON_TOKEN in Vercel. docs/PRIVATE-EVENTS.md.
select cron.unschedule(jobid) from cron.job where jobname = 'nashroam-events-sla';
select cron.schedule(
  'nashroam-events-sla',
  '25 * * * *',
  $$
  select net.http_post(
    url := 'https://nashroam.com/api/private-events/sla/',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-nashroam-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='nashroam_cron_token')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
