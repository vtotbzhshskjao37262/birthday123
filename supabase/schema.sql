create table if not exists public.birthday_configs (
  id uuid primary key,
  slug text unique,
  name text not null,
  message text not null,
  photos jsonb not null default '[]'::jsonb,
  music_url text,
  created_at timestamptz not null default now()
);

alter table public.birthday_configs enable row level security;

alter table public.birthday_configs add column if not exists slug text;
alter table public.birthday_configs add column if not exists music_url text;

insert into storage.buckets (id, name, public)
values ('birthday-assets', 'birthday-assets', true)
on conflict (id) do update set public = true;
