-- Run this in Supabase SQL Editor after creating your Supabase project.
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  domain text default '',
  url text default '',
  provider text default '',
  status text not null default 'Building' check (status in ('Live', 'Building', 'Paused')),
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

-- Replace YOUR-OWNER-USER-UUID below with your own account UUID from
-- Supabase Dashboard > Authentication > Users after creating your account.
-- This locks the table to ONE account, even if other people can reach the app.
create policy "Only my account can read projects" on public.projects
for select to authenticated
using (auth.uid() = 'YOUR-OWNER-USER-UUID'::uuid and user_id = auth.uid());

create policy "Only my account can add projects" on public.projects
for insert to authenticated
with check (auth.uid() = 'YOUR-OWNER-USER-UUID'::uuid and user_id = auth.uid());

create policy "Only my account can update projects" on public.projects
for update to authenticated
using (auth.uid() = 'YOUR-OWNER-USER-UUID'::uuid and user_id = auth.uid())
with check (auth.uid() = 'YOUR-OWNER-USER-UUID'::uuid and user_id = auth.uid());

create policy "Only my account can delete projects" on public.projects
for delete to authenticated
using (auth.uid() = 'YOUR-OWNER-USER-UUID'::uuid and user_id = auth.uid());
