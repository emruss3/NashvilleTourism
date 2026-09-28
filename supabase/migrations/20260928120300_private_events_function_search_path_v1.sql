-- Pin search_path on the private events trigger functions (Supabase security
-- advisor: function_search_path_mutable). Behaviour is unchanged.

alter function public.event_space_publish_check() set search_path = public, pg_temp;
alter function public.event_venue_publish_check() set search_path = public, pg_temp;
alter function public.event_inquiry_fee_due() set search_path = public, pg_temp;
