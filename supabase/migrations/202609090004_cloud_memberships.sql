create type public.membership_plan as enum ('monthly', 'annual');
create type public.membership_status as enum ('active', 'past_due', 'cancelled', 'expired');

create table public.memberships (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan public.membership_plan not null,
  status public.membership_status not null default 'active',
  home_city text not null default 'Washington, DC',
  credits_total integer not null check (credits_total > 0),
  credits_remaining integer not null check (credits_remaining >= 0 and credits_remaining <= credits_total),
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  payment_provider text not null default 'demo' check (payment_provider in ('demo', 'stripe')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (current_period_end > current_period_start)
);

alter table public.memberships enable row level security;

create policy memberships_select_own_or_admin
on public.memberships for select to authenticated
using (user_id = auth.uid() or public.is_admin());

create trigger audit_memberships
after insert or update or delete on public.memberships
for each row execute function public.audit_sensitive_change();

create or replace function public.activate_demo_membership(target_plan public.membership_plan)
returns public.memberships
language plpgsql security definer set search_path = ''
as $$
declare result public.memberships; total integer; initial_credits integer; period_end timestamptz;
begin
  if auth.uid() is null or public.current_user_role() <> 'customer' then
    raise exception 'A customer account is required';
  end if;
  total := case when target_plan = 'monthly' then 2 else 24 end;
  select greatest(total - count(*)::integer, 0) into initial_credits
  from public.event_reservations
  where user_id = auth.uid() and status in ('confirmed', 'attended');
  period_end := case when target_plan = 'monthly' then now() + interval '1 month' else now() + interval '1 year' end;
  insert into public.memberships (
    user_id, plan, status, credits_total, credits_remaining,
    current_period_start, current_period_end, payment_provider, updated_at
  ) values (
    auth.uid(), target_plan, 'active', total, initial_credits,
    now(), period_end, 'demo', now()
  )
  on conflict (user_id) do update set
    plan = excluded.plan,
    status = 'active',
    credits_total = excluded.credits_total,
    credits_remaining = excluded.credits_remaining,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    payment_provider = 'demo',
    cancel_at_period_end = false,
    updated_at = now()
  returning * into result;
  return result;
end;
$$;

drop function public.reserve_event(uuid);
drop function public.cancel_event_reservation(uuid);

create function public.reserve_event(target_event_id uuid)
returns table(reservation_id uuid, confirmation_code text, member_spots_remaining integer, credits_remaining integer)
language plpgsql security definer set search_path = ''
as $$
declare target public.events; created public.event_reservations; membership public.memberships; remaining_credits integer;
begin
  if auth.uid() is null or public.current_user_role() is null then raise exception 'An active account is required'; end if;
  select * into membership from public.memberships where user_id = auth.uid() for update;
  if membership.user_id is null or membership.status <> 'active' or membership.current_period_end <= now() then raise exception 'An active membership is required'; end if;
  if membership.credits_remaining < 1 then raise exception 'No membership credits remain'; end if;
  select * into target from public.events where id = target_event_id for update;
  if target.id is null or target.status <> 'published' then raise exception 'Event is unavailable'; end if;
  if target.tier <> 'included' then raise exception 'Premium events require an upgrade'; end if;
  if target.member_reserved_count >= target.member_capacity then raise exception 'Member inventory is full'; end if;
  if exists (select 1 from public.event_reservations where user_id = auth.uid() and event_id = target_event_id and status in ('confirmed', 'attended')) then raise exception 'You already reserved this event'; end if;
  insert into public.event_reservations(user_id, event_id, confirmation_code)
  values (auth.uid(), target_event_id, 'VD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))) returning * into created;
  update public.events set member_reserved_count = member_reserved_count + 1, updated_at = now() where id = target_event_id;
  update public.memberships set credits_remaining = public.memberships.credits_remaining - 1, updated_at = now() where user_id = auth.uid()
  returning public.memberships.credits_remaining into remaining_credits;
  return query select created.id, created.confirmation_code, target.member_capacity - target.member_reserved_count - 1, remaining_credits;
end;
$$;

create function public.cancel_event_reservation(target_event_id uuid)
returns table(member_spots_remaining integer, credits_remaining integer)
language plpgsql security definer set search_path = ''
as $$
declare target public.events; target_reservation_id uuid; remaining_credits integer;
begin
  select * into target from public.events where id = target_event_id for update;
  select id into target_reservation_id from public.event_reservations
  where user_id = auth.uid() and event_id = target_event_id and status = 'confirmed' for update;
  if target_reservation_id is null then raise exception 'Active reservation not found'; end if;
  update public.event_reservations set status = 'cancelled', cancelled_at = now() where id = target_reservation_id;
  update public.events set member_reserved_count = greatest(member_reserved_count - 1, 0), updated_at = now() where id = target_event_id;
  update public.memberships set credits_remaining = least(public.memberships.credits_remaining + 1, public.memberships.credits_total), updated_at = now()
  where user_id = auth.uid() returning public.memberships.credits_remaining into remaining_credits;
  return query select greatest(target.member_capacity - target.member_reserved_count + 1, 0), remaining_credits;
end;
$$;

revoke all on table public.memberships from anon;
revoke all on function public.activate_demo_membership(public.membership_plan) from public;
revoke all on function public.reserve_event(uuid) from public;
revoke all on function public.cancel_event_reservation(uuid) from public;
grant select on public.memberships to authenticated;
grant execute on function public.activate_demo_membership(public.membership_plan) to authenticated;
grant execute on function public.reserve_event(uuid) to authenticated;
grant execute on function public.cancel_event_reservation(uuid) to authenticated;
