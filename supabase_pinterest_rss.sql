begin;

alter table public.pinterest_feed_items
  add column if not exists rss_scheduled_at timestamptz;

create or replace function public.next_pinterest_feed_slot(received timestamptz)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_day date := (received at time zone 'Europe/Moscow')::date;
  candidate_slot timestamptz;
begin
  perform pg_catalog.pg_advisory_xact_lock(188273, 1);
  loop
    foreach candidate_slot in array array[
      (candidate_day + time '10:00') at time zone 'Europe/Moscow',
      (candidate_day + time '18:00') at time zone 'Europe/Moscow'
    ]
    loop
      if candidate_slot >= received
        and not exists (
          select 1
          from public.pinterest_feed_items
          where rss_scheduled_at = candidate_slot
        )
      then
        return candidate_slot;
      end if;
    end loop;
    candidate_day := candidate_day + 1;
  end loop;
end;
$$;

revoke all on function public.next_pinterest_feed_slot(timestamptz) from public;

create or replace function public.assign_pinterest_feed_slot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.rss_scheduled_at := public.next_pinterest_feed_slot(new.received_at);
  return new;
end;
$$;

revoke all on function public.assign_pinterest_feed_slot() from public;

drop trigger if exists assign_pinterest_feed_slot_before_insert
  on public.pinterest_feed_items;
create trigger assign_pinterest_feed_slot_before_insert
before insert on public.pinterest_feed_items
for each row execute function public.assign_pinterest_feed_slot();

do $$
declare
  pending record;
begin
  for pending in
    select id, received_at
    from public.pinterest_feed_items
    where rss_scheduled_at is null
    order by received_at, bundle_id
  loop
    update public.pinterest_feed_items
    set rss_scheduled_at = public.next_pinterest_feed_slot(pending.received_at)
    where id = pending.id;
  end loop;
end;
$$;

alter table public.pinterest_feed_items
  alter column rss_scheduled_at set not null;

create unique index if not exists pinterest_feed_items_rss_scheduled_at_key
  on public.pinterest_feed_items (rss_scheduled_at);

grant update (pinterest_excluded) on table public.pinterest_feed_items to service_role;

commit;
