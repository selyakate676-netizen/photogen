create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null check (consent_type in ('privacy', 'personal_data', 'generation')),
  document_version text not null check (btrim(document_version) <> ''),
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, consent_type, document_version)
);

alter table public.user_consents enable row level security;

drop policy if exists "Users can read own consents" on public.user_consents;
create policy "Users can read own consents"
  on public.user_consents for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can record own consents" on public.user_consents;
create policy "Users can record own consents"
  on public.user_consents for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on table public.user_consents from anon, authenticated;
grant select, insert on table public.user_consents to authenticated;
grant all on table public.user_consents to service_role;

create or replace function public.record_signup_consents()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_consents jsonb := new.raw_user_meta_data -> 'legal_consents';
begin
  if v_consents ->> 'privacy' = 'v1'
     and v_consents ->> 'personal_data' = 'v1' then
    insert into public.user_consents (user_id, consent_type, document_version, accepted_at)
    values
      (new.id, 'privacy', 'v1', coalesce(new.created_at, now())),
      (new.id, 'personal_data', 'v1', coalesce(new.created_at, now()))
    on conflict (user_id, consent_type, document_version) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.record_signup_consents() from public, anon, authenticated;

drop trigger if exists record_signup_consents_on_auth_user on auth.users;
create trigger record_signup_consents_on_auth_user
  after insert on auth.users
  for each row execute function public.record_signup_consents();
