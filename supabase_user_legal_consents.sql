begin;

-- Never treat Auth metadata as proof of consent. Remove the legacy hook first
-- so rerunning this migration also hardens databases where it was installed.
drop trigger if exists record_signup_legal_consents_on_auth_user on auth.users;
drop function if exists public.record_signup_legal_consents();
drop function if exists public.record_user_legal_consent(text, text, text);

create table if not exists public.user_legal_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null check (
    consent_type in ('offer', 'privacy', 'personal_data', 'generation')
  ),
  document_version text not null check (btrim(document_version) <> ''),
  action_context text not null check (
    action_context in ('registration', 'upload', 'order')
  ),
  accepted_at timestamptz not null default clock_timestamp(),
  unique (user_id, consent_type, document_version)
);

alter table public.user_legal_consents enable row level security;

drop policy if exists "Users can read own legal consents" on public.user_legal_consents;
create policy "Users can read own legal consents"
  on public.user_legal_consents
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.user_legal_consents from public, anon, authenticated, service_role;
grant select on table public.user_legal_consents to authenticated, service_role;

create or replace function public.record_user_legal_consent(
  p_consent_type text,
  p_action_context text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_document_version text;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if (p_consent_type in ('offer', 'privacy', 'personal_data') and p_action_context <> 'registration')
     or (p_consent_type = 'generation' and p_action_context <> 'order')
     or p_consent_type not in ('offer', 'privacy', 'personal_data', 'generation') then
    raise exception 'INVALID_CONSENT' using errcode = '22023';
  end if;

  v_document_version := case p_consent_type
    when 'offer' then '2026-10-15'
    when 'privacy' then '2026-10-15'
    when 'personal_data' then '2026-10-15'
    when 'generation' then '2026-10-15'
  end;

  insert into public.user_legal_consents (
    user_id, consent_type, document_version, action_context
  ) values (
    v_user_id, p_consent_type, v_document_version, p_action_context
  ) on conflict (user_id, consent_type, document_version) do nothing;

  return true;
end;
$$;

revoke all on function public.record_user_legal_consent(text, text)
  from public, anon, service_role;
grant execute on function public.record_user_legal_consent(text, text)
  to authenticated;

commit;
