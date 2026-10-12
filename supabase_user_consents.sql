-- Auditable personal-data consent. Apply after the Persona and photoshoot migrations.
begin;

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null,
  document_version text not null,
  document_path text not null,
  accepted_at timestamptz not null default now(),
  photoshoot_id uuid references public.photoshoots(id) on delete set null,
  constraint user_consents_type_check check (consent_type in ('personal_data'))
);

create unique index if not exists user_consents_evidence_unique
  on public.user_consents (
    user_id,
    consent_type,
    document_version,
    document_path,
    coalesce(photoshoot_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

alter table public.user_consents enable row level security;

drop policy if exists "Users can view own consent history" on public.user_consents;
create policy "Users can view own consent history"
  on public.user_consents for select
  using (auth.uid() = user_id);

revoke all on table public.user_consents from public, anon, authenticated;
grant select on table public.user_consents to authenticated;

create or replace function public.has_current_personal_data_consent()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.user_consents uc
    where uc.user_id = auth.uid()
      and uc.consent_type = 'personal_data'
      and uc.document_version = '2026-10-10'
      and uc.document_path = '/personal-data-consent'
  );
$$;

create or replace function public.accept_personal_data_consent(
  p_document_version text,
  p_document_path text
)
returns setof public.user_consents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_consent public.user_consents;
begin
  if v_user is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  if p_document_version is distinct from '2026-10-10'
     or p_document_path is distinct from '/personal-data-consent' then
    raise exception using errcode = '23514', message = 'INVALID_CONSENT_DOCUMENT';
  end if;

  insert into public.user_consents (
    user_id, consent_type, document_version, document_path
  ) values (
    v_user, 'personal_data', '2026-10-10', '/personal-data-consent'
  ) on conflict do nothing;

  select * into v_consent
  from public.user_consents
  where user_id = v_user
    and consent_type = 'personal_data'
    and document_version = '2026-10-10'
    and document_path = '/personal-data-consent'
    and photoshoot_id is null;

  return next v_consent;
end;
$$;

revoke all on function public.has_current_personal_data_consent() from public, anon, service_role;
revoke all on function public.accept_personal_data_consent(text, text) from public, anon, service_role;
grant execute on function public.has_current_personal_data_consent() to authenticated;
grant execute on function public.accept_personal_data_consent(text, text) to authenticated;

-- Email sign-up can finish without an active browser session. Record only the
-- exact current document declared in the sign-up request; all audit values and
-- accepted_at remain server-controlled.
create or replace function public.capture_signup_personal_data_consent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.raw_user_meta_data->>'personal_data_consent_accepted' = 'true'
     and new.raw_user_meta_data->>'personal_data_consent_version' = '2026-10-10'
     and new.raw_user_meta_data->>'personal_data_consent_path' = '/personal-data-consent' then
    insert into public.user_consents (
      user_id, consent_type, document_version, document_path
    ) values (
      new.id, 'personal_data', '2026-10-10', '/personal-data-consent'
    ) on conflict do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.capture_signup_personal_data_consent() from public, anon, authenticated, service_role;
drop trigger if exists capture_signup_personal_data_consent on auth.users;
create trigger capture_signup_personal_data_consent
after insert on auth.users
for each row execute function public.capture_signup_personal_data_consent();

create or replace function public.require_current_personal_data_consent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Trusted maintenance without an end-user JWT remains possible. Every
  -- authenticated end-user write must have current consent evidence.
  if auth.uid() is not null
     and not public.has_current_personal_data_consent() then
    raise exception using errcode = '42501', message = 'PERSONAL_DATA_CONSENT_REQUIRED';
  end if;
  return new;
end;
$$;

revoke all on function public.require_current_personal_data_consent() from public, anon, authenticated, service_role;
create or replace function public.require_personal_data_consent_for_persona_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Internal lifecycle-only updates must remain possible for existing users
  -- (for example photo deletion changing status). Any insert or change to
  -- Persona data itself requires the current consent version.
  if auth.uid() is not null
     and (
       tg_op = 'INSERT'
       or (to_jsonb(new) - array['status', 'is_default', 'updated_at'])
          is distinct from
          (to_jsonb(old) - array['status', 'is_default', 'updated_at'])
     )
     and not public.has_current_personal_data_consent() then
    raise exception using errcode = '42501', message = 'PERSONAL_DATA_CONSENT_REQUIRED';
  end if;
  return new;
end;
$$;

revoke all on function public.require_personal_data_consent_for_persona_write() from public, anon, authenticated, service_role;

drop trigger if exists require_personal_data_consent_personas on public.personas;
create trigger require_personal_data_consent_personas
before insert or update on public.personas
for each row execute function public.require_personal_data_consent_for_persona_write();

drop trigger if exists require_personal_data_consent_persona_photos on public.persona_photos;
create trigger require_personal_data_consent_persona_photos
before insert or update on public.persona_photos
for each row execute function public.require_current_personal_data_consent();

-- Protects every current create_photoshoot_with_persona overload, including
-- direct authenticated RPC calls, without changing lifecycle semantics.
drop trigger if exists require_personal_data_consent_photoshoots on public.photoshoots;
create trigger require_personal_data_consent_photoshoots
before insert on public.photoshoots
for each row execute function public.require_current_personal_data_consent();

commit;
