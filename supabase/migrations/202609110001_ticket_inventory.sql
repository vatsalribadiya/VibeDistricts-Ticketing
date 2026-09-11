create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  service_fee_cents integer not null default 0 check (service_fee_cents >= 0),
  quantity_total integer not null check (quantity_total >= 0),
  quantity_sold integer not null default 0 check (quantity_sold >= 0 and quantity_sold <= quantity_total),
  sales_open boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ticket_types_event_idx on public.ticket_types(event_id, sort_order);
alter table public.ticket_types enable row level security;

create policy ticket_types_select
on public.ticket_types for select to anon, authenticated
using (
  exists (select 1 from public.events e where e.id = event_id and e.status = 'published')
  or public.is_admin()
  or public.staff_can('view_events', event_id)
);

create policy ticket_types_insert
on public.ticket_types for insert to authenticated
with check (public.is_admin() or public.staff_can('manage_inventory', event_id));

create policy ticket_types_update
on public.ticket_types for update to authenticated
using (public.is_admin() or public.staff_can('manage_inventory', event_id))
with check (public.is_admin() or public.staff_can('manage_inventory', event_id));

create policy ticket_types_delete
on public.ticket_types for delete to authenticated
using (public.is_admin() or public.staff_can('manage_inventory', event_id));

create trigger audit_ticket_types
after insert or update or delete on public.ticket_types
for each row execute function public.audit_sensitive_change();

grant select on public.ticket_types to anon, authenticated;
grant insert, update, delete on public.ticket_types to authenticated;
