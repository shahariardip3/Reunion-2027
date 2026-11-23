
-- =====================================================================
-- Reunion 2027 — COMPLETE Supabase setup (v4)
--
-- Run in Supabase Dashboard → SQL Editor → New query
--
-- Safe to run on existing projects.
-- Does not delete registrations, photos or notices.
-- Includes Attendance, Gift Received and Food Received tracking.
-- =====================================================================


-- ---------- 1. Settings ----------
create table if not exists public.settings (
  id int primary key,
  event_title text default 'Reunion 2027',
  event_note text default '',
  reunion_date date,
  venue text default '',
  show_public boolean default false,
  payment_method text default 'bKash',
  payment_number text default '',
  amount int default 1000,
  payment_note text default ''
);

alter table public.settings add column if not exists event_title_bn text;
alter table public.settings add column if not exists event_title_en text;
alter table public.settings add column if not exists event_note_bn text;
alter table public.settings add column if not exists event_note_en text;
alter table public.settings add column if not exists venue_bn text;
alter table public.settings add column if not exists venue_en text;
alter table public.settings add column if not exists payment_note_bn text;
alter table public.settings add column if not exists payment_note_en text;
alter table public.settings add column if not exists facebook_page_url text;
alter table public.settings add column if not exists registration_open boolean not null default true;
alter table public.settings add column if not exists email_field_enabled boolean not null default true;
alter table public.settings add column if not exists email_field_required boolean not null default true;
alter table public.settings add column if not exists tshirt_field_enabled boolean not null default false;
alter table public.settings add column if not exists tshirt_field_required boolean not null default false;
alter table public.settings add column if not exists tshirt_sizes text[] not null default array['S','M','L','XL','XXL','XXXL'];

-- Payment channels
alter table public.settings add column if not exists bkash_number text default '';
alter table public.settings add column if not exists nagad_number text default '';
alter table public.settings add column if not exists bank_name text default '';
alter table public.settings add column if not exists bank_branch text default '';
alter table public.settings add column if not exists bank_account_name text default '';
alter table public.settings add column if not exists bank_account_number text default '';
alter table public.settings add column if not exists bank_routing text default '';
alter table public.settings add column if not exists bank_note text default '';

insert into public.settings (id)
values (1)
on conflict (id) do nothing;

-- Carry old payment number into new payment fields
update public.settings
set bkash_number = payment_number
where coalesce(bkash_number, '') = ''
  and coalesce(payment_number, '') <> ''
  and lower(coalesce(payment_method, '')) like '%bkash%';

update public.settings
set nagad_number = payment_number
where coalesce(nagad_number, '') = ''
  and coalesce(payment_number, '') <> ''
  and lower(coalesce(payment_method, '')) like '%nagad%';


-- ---------- 2. Registrations ----------
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  ssc_batch text not null,
  phone text,
  photo_path text not null,
  trx_id text not null,
  profession text not null default '',
  phone_public boolean not null default false,
  checkin_token uuid not null default gen_random_uuid(),

  -- Attendance
  attended_at timestamptz,
  attended_by text,

  -- Gift received
  gift_received_at timestamptz,
  gift_received_by text,

  -- Food received
  food_received_at timestamptz,
  food_received_by text,

  status text not null default 'pending',
  reg_code text,
  pay_method text not null default 'bkash',
  created_at timestamptz default now()
);

-- Existing registrations: add missing columns safely
alter table public.registrations
add column if not exists profession text not null default '';

alter table public.registrations
add column if not exists phone_public boolean not null default false;

alter table public.registrations
add column if not exists checkin_token uuid not null default gen_random_uuid();

alter table public.registrations
add column if not exists attended_at timestamptz;

alter table public.registrations
add column if not exists attended_by text;

alter table public.registrations
add column if not exists gift_received_at timestamptz;

alter table public.registrations
add column if not exists gift_received_by text;

alter table public.registrations
add column if not exists food_received_at timestamptz;

alter table public.registrations
add column if not exists food_received_by text;

alter table public.registrations
add column if not exists reg_code text;

alter table public.registrations
add column if not exists pay_method text not null default 'bkash';


-- Registration indexes
create unique index if not exists registrations_trx_unique
on public.registrations (trx_id);

create unique index if not exists registrations_checkin_token_uidx
on public.registrations (checkin_token);

create unique index if not exists registrations_reg_code_uidx
on public.registrations (reg_code);

create index if not exists registrations_alumni_batch_idx
on public.registrations (status, ssc_batch, full_name);

create index if not exists registrations_attendance_idx
on public.registrations (attended_at);

create index if not exists registrations_gift_received_idx
on public.registrations (gift_received_at);

create index if not exists registrations_food_received_idx
on public.registrations (food_received_at);

create index if not exists registrations_created_idx
on public.registrations (created_at desc);


-- ---------- 3. Notices ----------
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  title_bn text not null
    check (char_length(title_bn) between 1 and 140),
  title_en text not null
    check (char_length(title_en) between 1 and 140),
  body_bn text not null
    check (char_length(body_bn) between 1 and 5000),
  body_en text not null
    check (char_length(body_en) between 1 and 5000),
  published boolean not null default false,
  pinned boolean not null default false,
  expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notices_public_order_idx
on public.notices (published, pinned desc, created_at desc);


-- ---------- 4. Email delivery history ----------
create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid references public.registrations(id) on delete set null,
  recipient text not null,
  email_type text not null check (email_type in ('registered','approved')),
  subject text not null,
  status text not null default 'sending' check (status in ('sending','sent','failed')),
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists email_logs_created_idx on public.email_logs (created_at desc);
create index if not exists email_logs_registration_idx on public.email_logs (registration_id);

-- ---------- 5. Admin accounts, audit history and recycle bin ----------
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username ~ '^[a-z0-9_.-]{3,32}$'),
  display_name text not null check (char_length(display_name) between 2 and 80),
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists admin_users_active_idx on public.admin_users (is_active);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_username text not null,
  admin_name text not null,
  admin_role text not null check (admin_role in ('main','sub')),
  action text not null,
  registration_id uuid,
  registration_name text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists activity_logs_created_idx on public.activity_logs (created_at desc);
create index if not exists activity_logs_registration_idx on public.activity_logs (registration_id);

create table if not exists public.registration_trash (
  id uuid primary key default gen_random_uuid(),
  original_id uuid not null,
  registration_data jsonb not null,
  deleted_by text not null,
  deleted_at timestamptz not null default now()
);
create index if not exists registration_trash_deleted_idx on public.registration_trash (deleted_at desc);

-- ---------- 6. Rate limiting ----------
create table if not exists public.security_rate_limits (
  key_hash text primary key,
  window_start timestamptz not null,
  request_count integer not null default 0,
  blocked_until timestamptz
);


-- ---------- 5. Row Level Security ----------
alter table public.settings enable row level security;
alter table public.registrations enable row level security;
alter table public.notices enable row level security;
alter table public.security_rate_limits enable row level security;
alter table public.email_logs enable row level security;
alter table public.admin_users enable row level security;
alter table public.activity_logs enable row level security;
alter table public.registration_trash enable row level security;

revoke all on public.settings from anon, authenticated;
revoke all on public.registrations from anon, authenticated;
revoke all on public.notices from anon, authenticated;
revoke all on public.security_rate_limits from anon, authenticated;
revoke all on public.email_logs from anon, authenticated;
revoke all on public.admin_users from anon, authenticated;
revoke all on public.activity_logs from anon, authenticated;
revoke all on public.registration_trash from anon, authenticated;


-- ---------- 6. Registration ID generator ----------
create sequence if not exists public.reg_seq start 1;

-- Keep the sequence ahead of all active and soft-deleted registration numbers.
do $$
declare
  max_code bigint;
  seq_value bigint;
  seq_called boolean;
begin
  select max(substring(code from '^REU-([0-9]+)$')::bigint)
    into max_code
  from (
    select reg_code as code from public.registrations
    union all
    select registration_data->>'reg_code' as code from public.registration_trash
  ) all_codes
  where code ~ '^REU-[0-9]+$';

  select last_value, is_called into seq_value, seq_called from public.reg_seq;
  if max_code is not null and (not seq_called or seq_value < max_code) then
    perform setval('public.reg_seq', max_code, true);
  end if;
end;
$$;

create or replace function public.approve_registration(p_id uuid)
returns text
language plpgsql
as $$
declare
  code text;
begin
  select reg_code
  into code
  from public.registrations
  where id = p_id;

  if code is null then
    code := 'REU-' || lpad(
      nextval('public.reg_seq')::text,
      4,
      '0'
    );
  end if;

  update public.registrations
  set status = 'approved',
      reg_code = code
  where id = p_id;

  return code;
end;
$$;


-- ---------- 7. Registration number allocator ----------
create or replace function public.next_registration_code()
returns text
language sql
security definer
set search_path = public, pg_temp
as $$
  select 'REU-' || lpad(nextval('public.reg_seq')::text, 4, '0');
$$;

revoke all on function public.next_registration_code() from public, anon, authenticated;
grant execute on function public.next_registration_code() to service_role;

-- ---------- 8. Safe Sub Admin account creation (maximum 5) ----------
create or replace function public.create_subadmin(
  p_username text,
  p_display_name text,
  p_password_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('reunion2027_subadmin_limit')::bigint);
  if (select count(*) from public.admin_users) >= 5 then
    raise exception 'MAX_SUBADMINS';
  end if;
  insert into public.admin_users(username, display_name, password_hash, is_active)
  values (p_username, p_display_name, p_password_hash, true)
  returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.create_subadmin(text,text,text) from public, anon, authenticated;
grant execute on function public.create_subadmin(text,text,text) to service_role;

-- ---------- 9. Rate limit function ----------
create or replace function public.consume_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_row public.security_rate_limits%rowtype;
  now_at timestamptz := now();
begin

  insert into public.security_rate_limits (
    key_hash,
    window_start,
    request_count
  )
  values (
    p_key_hash,
    now_at,
    1
  )
  on conflict (key_hash) do nothing;

  select *
  into current_row
  from public.security_rate_limits
  where key_hash = p_key_hash
  for update;

  if current_row.blocked_until is not null
     and current_row.blocked_until > now_at then

    return jsonb_build_object(
      'allowed', false,
      'retry_after',
      greatest(
        1,
        ceil(
          extract(
            epoch from current_row.blocked_until - now_at
          )
        )::int
      )
    );
  end if;

  if current_row.window_start
     + make_interval(secs => p_window_seconds) <= now_at then

    update public.security_rate_limits
    set window_start = now_at,
        request_count = 1,
        blocked_until = null
    where key_hash = p_key_hash;

    return jsonb_build_object(
      'allowed', true,
      'retry_after', 0
    );
  end if;

  if current_row.request_count >= p_limit then

    update public.security_rate_limits
    set blocked_until =
      now_at + make_interval(secs => p_window_seconds)
    where key_hash = p_key_hash;

    return jsonb_build_object(
      'allowed', false,
      'retry_after', p_window_seconds
    );
  end if;

  update public.security_rate_limits
  set request_count = request_count + 1
  where key_hash = p_key_hash;

  return jsonb_build_object(
    'allowed', true,
    'retry_after', 0
  );

end;
$$;


-- ---------- 8. Function permissions ----------
revoke all on function public.approve_registration(uuid)
from public, anon, authenticated;

revoke all on function public.consume_rate_limit(text, integer, integer)
from public, anon, authenticated;


-- ---------- 9. Server key permissions ----------
grant usage on schema public to service_role;

grant all privileges
on all tables in schema public
to service_role;

grant all privileges
on all sequences in schema public
to service_role;

grant execute
on function public.approve_registration(uuid)
to service_role;

grant execute
on function public.consume_rate_limit(text, integer, integer)
to service_role;

alter default privileges in schema public
grant all on tables to service_role;

alter default privileges in schema public
grant all on sequences to service_role;


-- ---------- 10. Private photo bucket ----------
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'photos',
  'photos',
  false,
  225280,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = 225280,
    allowed_mime_types =
      array['image/jpeg','image/png','image/webp'];

-- =====================================================================
-- END OF REUNION 2027 SCHEMA
-- =====================================================================
