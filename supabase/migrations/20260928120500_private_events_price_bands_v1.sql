-- Public pages show a price band, never a stored minimum. The exact minimum
-- stays on event_spaces for ranking, filtering and fee estimates. Adds an
-- optional per-person ceiling so a per-person range can be shown, and widens
-- the brief's budget enum to the same bands (old values kept for old rows).

alter table public.event_spaces
  add column if not exists per_person_max_cents integer check (per_person_max_cents is null or per_person_max_cents >= 0);

comment on column public.event_spaces.per_person_max_cents is 'Optional top of the per-person range shown publicly; per_person_cents is the bottom.';

alter table public.event_inquiries drop constraint if exists event_inquiries_budget_range_check;
alter table public.event_inquiries add constraint event_inquiries_budget_range_check
  check (budget_range is null or budget_range in ('under-5k', '5k-15k', '15k-50k', 'over-50k', 'undecided', '$', '$$', '$$$', '$$$$', '$$$$$'));
