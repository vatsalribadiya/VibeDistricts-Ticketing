create or replace function public.list_guest_list_events()
returns table(
  event_id uuid, title text, starts_at timestamptz, member_capacity integer,
  confirmed_count bigint, attended_count bigint, cancelled_count bigint
)
language sql stable security definer set search_path = ''
as $$
  select e.id, e.title, e.starts_at, e.member_capacity,
    count(r.id) filter (where r.status = 'confirmed'),
    count(r.id) filter (where r.status = 'attended'),
    count(r.id) filter (where r.status = 'cancelled')
  from public.events e
  left join public.event_reservations r on r.event_id = e.id
  where public.is_admin() or public.staff_can('view_guest_list', e.id)
  group by e.id, e.title, e.starts_at, e.member_capacity
  order by e.starts_at desc;
$$;

create or replace function public.get_event_guest_list(target_event_id uuid)
returns table(
  reservation_id uuid, full_name text, email text, reservation_status text,
  confirmation_code text, reserved_at timestamptz, checked_in_at timestamptz,
  checked_in_by_name text
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (public.is_admin() or public.staff_can('view_guest_list', target_event_id)) then
    raise exception 'You do not have permission to view this guest list';
  end if;
  return query
  select r.id, p.full_name, p.email, r.status::text, r.confirmation_code,
    r.reserved_at, r.checked_in_at, checker.full_name
  from public.event_reservations r
  join public.profiles p on p.id = r.user_id
  left join public.profiles checker on checker.id = r.checked_in_by
  where r.event_id = target_event_id
  order by
    case r.status when 'confirmed' then 1 when 'attended' then 2 else 3 end,
    p.full_name;
end;
$$;

revoke all on function public.list_guest_list_events() from public;
revoke all on function public.get_event_guest_list(uuid) from public;
grant execute on function public.list_guest_list_events() to authenticated;
grant execute on function public.get_event_guest_list(uuid) to authenticated;
