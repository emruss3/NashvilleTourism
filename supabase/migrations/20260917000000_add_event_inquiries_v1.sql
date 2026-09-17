-- Private event inquiries from /private-events/ (Corporate gatherings, holiday
-- parties, convention receptions, private celebrations). Written only by the
-- Next.js API route with the service role; never readable by anon/authenticated.

create table if not exists public.event_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'closed', 'spam')),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (position('@' in email) > 1 and char_length(email) <= 254),
  company text check (char_length(company) <= 160),
  event_type text not null check (event_type in ('corporate', 'holiday', 'convention', 'celebration', 'other')),
  guests integer check (guests between 1 and 5000),
  preferred_date date,
  flexible_dates boolean not null default false,
  budget_range text check (budget_range in ('under-5k', '5k-15k', '15k-50k', 'over-50k', 'undecided')),
  details text check (char_length(details) <= 4000),
  need_hotel_rooms boolean not null default false,
  source_path text check (char_length(source_path) <= 300),
  user_agent text check (char_length(user_agent) <= 500)
);

comment on table public.event_inquiries is 'Private event inquiries submitted from nashroam.com/private-events/. Service-role writes only.';

create index if not exists event_inquiries_created_idx on public.event_inquiries (created_at desc);
create index if not exists event_inquiries_status_idx on public.event_inquiries (status);

alter table public.event_inquiries enable row level security;

revoke all on table public.event_inquiries from public, anon, authenticated;
grant select, insert, update on table public.event_inquiries to service_role;
