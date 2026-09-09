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
  values (
    auth.uid(),
    target_event_id,
    'VD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ) returning * into created;
  update public.events set member_reserved_count = member_reserved_count + 1, updated_at = now() where id = target_event_id;
  return query select created.id, created.confirmation_code, target.member_capacity - target.member_reserved_count - 1;
end;
$$;

revoke all on function public.reserve_event(uuid) from public;
grant execute on function public.reserve_event(uuid) to authenticated;
