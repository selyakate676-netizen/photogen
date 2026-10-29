begin;

create table if not exists public.pinterest_feed_items (
  id uuid primary key default gen_random_uuid(),
  schema_version integer not null check (schema_version = 1),
  bundle_id text not null unique,
  bundle_sha256 text not null check (bundle_sha256 ~ '^[a-f0-9]{64}$'),
  pack_id text not null check (pack_id ~ '^SP-[0-9]{3}$'),
  hero_composition_id text not null check (hero_composition_id ~ '^HC-[0-9]{3}$'),
  pack_url text not null,
  preview_path text not null,
  preview_sha256 text not null check (preview_sha256 ~ '^[a-f0-9]{64}$'),
  telegram_channel_message_id bigint not null check (telegram_channel_message_id > 0),
  telegram_comment_message_id bigint not null check (telegram_comment_message_id > 0),
  telegram_prompt_url text not null,
  pinterest_excluded boolean not null default false,
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  received_at timestamptz not null default now()
);

alter table public.pinterest_feed_items enable row level security;
revoke all on table public.pinterest_feed_items from public, anon, authenticated;
grant select, insert on table public.pinterest_feed_items to service_role;

commit;
