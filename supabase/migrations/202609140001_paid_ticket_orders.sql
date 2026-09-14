alter table public.ticket_types
add column quantity_reserved integer not null default 0 check (quantity_reserved >= 0),
add constraint ticket_inventory_within_total check (quantity_sold + quantity_reserved <= quantity_total);

create type public.ticket_order_status as enum ('pending', 'paid', 'expired', 'refunded');
create type public.paid_ticket_status as enum ('valid', 'used', 'refunded', 'void');

create table public.ticket_orders (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
  event_id uuid not null references public.events(id), ticket_type_id uuid not null references public.ticket_types(id),
  event_title text not null, event_venue text not null, event_starts_at timestamptz not null, ticket_type_name text not null,
  quantity integer not null check (quantity between 1 and 8), unit_price_cents integer not null,
  unit_fee_cents integer not null, total_cents integer not null, status public.ticket_order_status not null default 'pending',
  stripe_checkout_session_id text unique, stripe_payment_intent_id text,
  expires_at timestamptz not null, paid_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.paid_tickets (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.ticket_orders(id) on delete cascade,
  user_id uuid not null references public.profiles(id), event_id uuid not null references public.events(id),
  ticket_type_id uuid not null references public.ticket_types(id), admission_token uuid not null default gen_random_uuid() unique,
  status public.paid_ticket_status not null default 'valid', checked_in_at timestamptz, checked_in_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index ticket_orders_user_idx on public.ticket_orders(user_id, created_at desc);
create index paid_tickets_user_idx on public.paid_tickets(user_id, created_at desc);
alter table public.ticket_orders enable row level security;
alter table public.paid_tickets enable row level security;
create policy ticket_orders_select on public.ticket_orders for select to authenticated using (user_id = auth.uid() or public.is_admin() or public.staff_can('view_guest_list', event_id));
create policy paid_tickets_select on public.paid_tickets for select to authenticated using (user_id = auth.uid() or public.is_admin() or public.staff_can('view_guest_list', event_id));
grant select on public.ticket_orders, public.paid_tickets to authenticated;

create or replace function public.create_pending_ticket_order(target_ticket_type_id uuid, target_quantity integer)
returns public.ticket_orders language plpgsql security definer set search_path = '' as $$
declare tier public.ticket_types; event public.events; result public.ticket_orders;
begin
  if public.current_user_role() <> 'customer' then raise exception 'A customer account is required'; end if;
  if target_quantity < 1 or target_quantity > 8 then raise exception 'Choose between 1 and 8 tickets'; end if;
  select * into tier from public.ticket_types where id = target_ticket_type_id for update;
  if tier.id is null or not tier.sales_open then raise exception 'This ticket is not currently on sale'; end if;
  select * into event from public.events where id = tier.event_id;
  if event.status <> 'published' then raise exception 'This event is unavailable'; end if;
  if tier.quantity_total - tier.quantity_sold - tier.quantity_reserved < target_quantity then raise exception 'Not enough tickets remain'; end if;
  insert into public.ticket_orders(user_id,event_id,ticket_type_id,event_title,event_venue,event_starts_at,ticket_type_name,quantity,unit_price_cents,unit_fee_cents,total_cents,expires_at)
  values(auth.uid(),event.id,tier.id,event.title,event.venue,event.starts_at,tier.name,target_quantity,tier.price_cents,tier.service_fee_cents,(tier.price_cents+tier.service_fee_cents)*target_quantity,now()+interval '35 minutes') returning * into result;
  update public.ticket_types set quantity_reserved=quantity_reserved+target_quantity,updated_at=now() where id=tier.id;
  return result;
end; $$;

create or replace function public.release_pending_ticket_order(target_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare target public.ticket_orders;
begin
  select * into target from public.ticket_orders where id=target_order_id for update;
  if target.id is null or target.status <> 'pending' then return; end if;
  if auth.role() <> 'service_role' and target.user_id <> auth.uid() then raise exception 'Not allowed'; end if;
  update public.ticket_types set quantity_reserved=greatest(quantity_reserved-target.quantity,0),updated_at=now() where id=target.ticket_type_id;
  update public.ticket_orders set status='expired',updated_at=now() where id=target.id;
end; $$;

create or replace function public.complete_ticket_order(target_order_id uuid, checkout_session_id text, payment_intent_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare target public.ticket_orders; i integer;
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required'; end if;
  select * into target from public.ticket_orders where id=target_order_id for update;
  if target.id is null then raise exception 'Ticket order not found'; end if;
  if target.status='paid' then return; end if;
  if target.status <> 'pending' then raise exception 'Ticket order is no longer pending'; end if;
  update public.ticket_types set quantity_reserved=greatest(quantity_reserved-target.quantity,0),quantity_sold=quantity_sold+target.quantity,updated_at=now() where id=target.ticket_type_id;
  update public.ticket_orders set status='paid',stripe_checkout_session_id=checkout_session_id,stripe_payment_intent_id=payment_intent_id,paid_at=now(),updated_at=now() where id=target.id;
  for i in 1..target.quantity loop insert into public.paid_tickets(order_id,user_id,event_id,ticket_type_id) values(target.id,target.user_id,target.event_id,target.ticket_type_id); end loop;
end; $$;

create or replace function public.check_in_paid_ticket(scanned_token uuid, target_event_id uuid)
returns table(outcome text,guest_name text,event_title text,ticket_name text,check_in_time timestamptz)
language plpgsql security definer set search_path='' as $$
declare ticket public.paid_tickets; guest text; title text; tier text;
begin
  if not(public.is_admin() or public.staff_can('scan_tickets',target_event_id)) then raise exception 'You do not have permission to scan tickets'; end if;
  select * into ticket from public.paid_tickets where admission_token=scanned_token and event_id=target_event_id for update;
  if ticket.id is null then return query select 'invalid','','','',null::timestamptz; return; end if;
  select full_name into guest from public.profiles where id=ticket.user_id;
  select o.event_title,o.ticket_type_name into title,tier from public.ticket_orders o where o.id=ticket.order_id;
  if ticket.status='used' then return query select 'already_used',guest,title,tier,ticket.checked_in_at; return; end if;
  if ticket.status<>'valid' then return query select ticket.status::text,guest,title,tier,null::timestamptz; return; end if;
  update public.paid_tickets set status='used',checked_in_at=now(),checked_in_by=auth.uid() where id=ticket.id;
  return query select 'admitted',guest,title,tier,now();
end; $$;

revoke all on function public.create_pending_ticket_order(uuid,integer),public.release_pending_ticket_order(uuid),public.complete_ticket_order(uuid,text,text),public.check_in_paid_ticket(uuid,uuid) from public;
grant execute on function public.create_pending_ticket_order(uuid,integer),public.release_pending_ticket_order(uuid) to authenticated;
grant execute on function public.release_pending_ticket_order(uuid),public.complete_ticket_order(uuid,text,text) to service_role;
grant execute on function public.check_in_paid_ticket(uuid,uuid) to authenticated;
