create type public.reservation_status as enum ('confirmed', 'cancelled', 'attended');

alter table public.events
add column member_reserved_count integer not null default 0
check (member_reserved_count >= 0 and member_reserved_count <= member_capacity);

create table public.event_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  status public.reservation_status not null default 'confirmed',
  confirmation_code text not null unique,
  reserved_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create unique index one_active_reservation_per_user_event
on public.event_reservations(user_id, event_id)
where status in ('confirmed', 'attended');

alter table public.event_reservations enable row level security;

create policy reservations_select_own_or_operations
on public.event_reservations for select to authenticated
using (user_id = auth.uid() or public.is_admin() or public.staff_can('view_guest_list', event_id));

create or replace function public.reserve_event(target_event_id uuid)
returns table(reservation_id uuid, confirmation_code text, member_spots_remaining integer)
language plpgsql security definer set search_path = ''
as $$
declare target public.events; created public.event_reservations;
begin
  if auth.uid() is null or public.current_user_role() is null then raise exception 'An active account is required'; end if;
  select * into target from public.events where id = target_event_id for update;
  if target.id is null or target.status <> 'published' then raise exception 'Event is unavailable'; end if;
  if target.tier <> 'included' then raise exception 'Premium events require an upgrade'; end if;
  if target.member_reserved_count >= target.member_capacity then raise exception 'Member inventory is full'; end if;
  if exists (select 1 from public.event_reservations where user_id = auth.uid() and event_id = target_event_id and status in ('confirmed', 'attended')) then raise exception 'You already reserved this event'; end if;
  insert into public.event_reservations(user_id, event_id, confirmation_code)
  values (auth.uid(), target_event_id, 'VD-' || upper(encode(gen_random_bytes(4), 'hex'))) returning * into created;
  update public.events set member_reserved_count = member_reserved_count + 1, updated_at = now() where id = target_event_id;
  return query select created.id, created.confirmation_code, target.member_capacity - target.member_reserved_count - 1;
end;
$$;

create or replace function public.cancel_event_reservation(target_event_id uuid)
returns integer language plpgsql security definer set search_path = ''
as $$
declare target public.events; target_reservation_id uuid;
begin
  select * into target from public.events where id = target_event_id for update;
  select id into target_reservation_id from public.event_reservations
  where user_id = auth.uid() and event_id = target_event_id and status = 'confirmed' for update;
  if target_reservation_id is null then raise exception 'Active reservation not found'; end if;
  update public.event_reservations set status = 'cancelled', cancelled_at = now() where id = target_reservation_id;
  update public.events set member_reserved_count = greatest(member_reserved_count - 1, 0), updated_at = now() where id = target_event_id;
  return greatest(target.member_capacity - target.member_reserved_count + 1, 0);
end;
$$;

create trigger audit_event_reservations
after insert or update or delete on public.event_reservations
for each row execute function public.audit_sensitive_change();

revoke all on function public.reserve_event(uuid) from public;
revoke all on function public.cancel_event_reservation(uuid) from public;
grant execute on function public.reserve_event(uuid) to authenticated;
grant execute on function public.cancel_event_reservation(uuid) to authenticated;
grant select on public.event_reservations to authenticated;
