alter table public.event_reservations
add column admission_token uuid not null default gen_random_uuid() unique,
add column checked_in_at timestamptz,
add column checked_in_by uuid references public.profiles(id);

create index event_reservations_event_status_idx
on public.event_reservations(event_id, status);

create or replace function public.check_in_member_pass(scanned_token uuid, target_event_id uuid)
returns table(outcome text, guest_name text, event_title text, check_in_time timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare reservation public.event_reservations; guest text; title text;
begin
  if not (public.is_admin() or public.staff_can('scan_tickets', target_event_id)) then
    raise exception 'You do not have permission to scan passes';
  end if;

  select * into reservation
  from public.event_reservations
  where admission_token = scanned_token and event_id = target_event_id
  for update;

  if reservation.id is null then
    return query select 'invalid', '', '', null::timestamptz;
    return;
  end if;

  select full_name into guest from public.profiles where id = reservation.user_id;
  select public.events.title into title from public.events where id = reservation.event_id;

  if reservation.status = 'attended' then
    return query select 'already_used', guest, title, reservation.checked_in_at;
    return;
  end if;
  if reservation.status = 'cancelled' then
    return query select 'cancelled', guest, title, null::timestamptz;
    return;
  end if;

  update public.event_reservations
  set status = 'attended', checked_in_at = now(), checked_in_by = auth.uid()
  where id = reservation.id;

  return query select 'admitted', guest, title, now();
end;
$$;

revoke all on function public.check_in_member_pass(uuid, uuid) from public;
grant execute on function public.check_in_member_pass(uuid, uuid) to authenticated;
