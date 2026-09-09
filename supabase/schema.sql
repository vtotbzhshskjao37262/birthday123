create table if not exists public.birthday_configs (
  id uuid primary key,
  slug text unique not null,
  name text not null,
  message text not null,
  photos jsonb not null default '[]'::jsonb,
  music_url text not null,
  created_at timestamptz not null default now()
);

alter table public.birthday_configs enable row level security;

-- The application reads/writes this table server-side using the Supabase service_role key.
-- No public table policies are required.

insert into storage.buckets (id, name, public)
values ('birthday-assets', 'birthday-assets', true)
on conflict (id) do update set public = true;
