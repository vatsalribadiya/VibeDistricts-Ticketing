create table public.billing_customers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.billing_customers enable row level security;
alter table public.stripe_webhook_events enable row level security;

create policy billing_customers_select_own_or_admin
on public.billing_customers for select to authenticated
using (user_id = auth.uid() or public.is_admin());

revoke all on table public.billing_customers from anon, authenticated;
grant select on table public.billing_customers to authenticated;
revoke all on table public.stripe_webhook_events from anon, authenticated;

drop function public.activate_demo_membership(public.membership_plan);

update public.memberships
set status = 'expired', updated_at = now()
where payment_provider = 'demo';
