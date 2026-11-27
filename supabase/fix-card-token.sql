-- Fix: ID card / Status page never worked because registrations.card_token did not exist.
-- Safe to run more than once. Run in Supabase -> SQL Editor.
alter table public.registrations
  add column if not exists card_token uuid not null default gen_random_uuid();

-- Every existing row gets its own random token from the default above.
create unique index if not exists registrations_card_token_key
  on public.registrations (card_token);
