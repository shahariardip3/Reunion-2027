-- v10 migration: only the history timeline table. (Also included at the end of schema.sql; safe to run twice.)
create table if not exists public.history_events (
  id uuid primary key default gen_random_uuid(),
  year smallint not null check (year between 1800 and 2100),
  title_bn text not null check (char_length(title_bn) between 1 and 140),
  title_en text not null check (char_length(title_en) between 1 and 140),
  body_bn text not null default '' check (char_length(body_bn) <= 1000),
  body_en text not null default '' check (char_length(body_en) <= 1000),
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists history_events_order_idx
  on public.history_events (published, year, sort_order);
alter table public.history_events enable row level security;
revoke all on public.history_events from anon, authenticated;
