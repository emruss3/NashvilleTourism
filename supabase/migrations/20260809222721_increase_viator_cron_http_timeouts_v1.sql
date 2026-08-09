select cron.unschedule('nashroam-viator-products');
select cron.unschedule('nashroam-viator-tags');
select cron.unschedule('nashroam-viator-destinations');

select cron.schedule(
  'nashroam-viator-products',
  '17 */6 * * *',
  $$
  select net.http_post(
    url := 'https://aeomrsutkhwmnscvvfur.supabase.co/functions/v1/viator-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-nashroam-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='nashroam_cron_token')
    ),
    body := '{"mode":"sync_products","maxPages":3,"count":50,"limit":150,"sort":"DEFAULT","campaign":"catalog-sync"}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

select cron.schedule(
  'nashroam-viator-tags',
  '35 8 * * 0',
  $$
  select net.http_post(
    url := 'https://aeomrsutkhwmnscvvfur.supabase.co/functions/v1/viator-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-nashroam-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='nashroam_cron_token')
    ),
    body := '{"mode":"sync_tags"}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

select cron.schedule(
  'nashroam-viator-destinations',
  '50 8 * * 0',
  $$
  select net.http_post(
    url := 'https://aeomrsutkhwmnscvvfur.supabase.co/functions/v1/viator-sync',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-nashroam-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='nashroam_cron_token')
    ),
    body := '{"mode":"sync_destinations"}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
