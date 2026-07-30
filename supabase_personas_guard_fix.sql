-- Apply after supabase_personas_hardening.sql.
-- PostgreSQL returns NULL for a missing custom setting, so coalesce is required.
create or replace function public.guard_persona_protected_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if coalesce(current_setting('app.persona_internal_write', true), '') <> 'on'
     and (new.user_id, new.is_default, new.status) is distinct from (old.user_id, old.is_default, old.status) then
    raise exception using errcode = '42501', message = 'PROTECTED_PERSONA_FIELDS';
  end if;
  return new;
end $$;
