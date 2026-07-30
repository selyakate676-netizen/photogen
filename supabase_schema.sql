-- PhotoGen authoritative Supabase schema
-- Safe to run more than once in the Supabase SQL Editor.
-- This file is the source of truth for the `photoshoots` table.

create extension if not exists "uuid-ossp";

create table if not exists public.photoshoots (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,

  style_id text not null,
  status text not null default 'pending'
    check (status in ('pending', 'training', 'generating', 'completed', 'error')),

  images text[] not null default '{}',
  result_images text[] not null default '{}',

  gender text not null default 'woman'
    check (gender in ('woman', 'man')),
  body_type text not null default 'average',
  eye_color text not null default 'brown',
  hair_color text not null default 'dark',

  training_id text,
  lora_url text,
  generation_id text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bring older databases up to the current schema without dropping data.
alter table public.photoshoots
  add column if not exists result_images text[] not null default '{}',
  add column if not exists gender text not null default 'woman',
  add column if not exists body_type text not null default 'average',
  add column if not exists eye_color text not null default 'brown',
  add column if not exists hair_color text not null default 'dark',
  add column if not exists training_id text,
  add column if not exists lora_url text,
  add column if not exists generation_id text,
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_photoshoots_updated_at on public.photoshoots;

create trigger set_photoshoots_updated_at
before update on public.photoshoots
for each row
execute function public.set_updated_at();

create index if not exists photoshoots_user_id_created_at_idx
  on public.photoshoots (user_id, created_at desc);

create index if not exists photoshoots_status_idx
  on public.photoshoots (status);

alter table public.photoshoots enable row level security;

drop policy if exists "Users can view their own photoshoots" on public.photoshoots;
drop policy if exists "Users can create their own photoshoots" on public.photoshoots;
drop policy if exists "Users can update their own photoshoots" on public.photoshoots;
drop policy if exists "Users can view own photoshoots" on public.photoshoots;
drop policy if exists "Users can insert own photoshoots" on public.photoshoots;
drop policy if exists "Users can update own photoshoots" on public.photoshoots;

create policy "Users can view their own photoshoots"
on public.photoshoots
for select
using (auth.uid() = user_id);

create policy "Users can create their own photoshoots"
on public.photoshoots
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own photoshoots"
on public.photoshoots
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
