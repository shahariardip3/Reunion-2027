-- Run once in Supabase → SQL Editor if photo upload says "Photo details could not be saved".
-- Safe to run more than once.
create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('memories', 'reunion')),
  title_bn text not null default '',
  title_en text not null default '',
  storage_path text not null unique,
  created_at timestamptz not null default now()
);
-- CREATE TABLE IF NOT EXISTS does not repair an older table. Add every
-- column used by the current app explicitly, including the required path.
alter table public.gallery_photos add column if not exists category text;
alter table public.gallery_photos add column if not exists title_bn text not null default '';
alter table public.gallery_photos add column if not exists title_en text not null default '';
alter table public.gallery_photos add column if not exists storage_path text;
alter table public.gallery_photos add column if not exists created_at timestamptz not null default now();
alter table public.gallery_photos add column if not exists mime_type text;
alter table public.gallery_photos add column if not exists size_bytes integer;
alter table public.gallery_photos add column if not exists uploaded_by text default 'Main Admin';
alter table public.gallery_photos add column if not exists thumb_path text;
alter table public.gallery_photos add column if not exists updated_at timestamptz not null default now();
create unique index if not exists gallery_photos_storage_path_uidx on public.gallery_photos (storage_path);
alter table public.gallery_photos add column if not exists is_pinned boolean not null default false;
alter table public.gallery_photos add column if not exists sort_order integer not null default 0;
alter table public.gallery_photos alter column mime_type drop not null;
alter table public.gallery_photos alter column size_bytes drop not null;
alter table public.gallery_photos enable row level security;
revoke all on public.gallery_photos from anon, authenticated;
grant all privileges on public.gallery_photos to service_role;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery-photos', 'gallery-photos', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 8388608, allowed_mime_types = array['image/jpeg','image/png','image/webp'];
notify pgrst, 'reload schema';
