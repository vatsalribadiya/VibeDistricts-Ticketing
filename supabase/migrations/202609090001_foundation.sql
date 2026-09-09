-- Vibe Districts phase two foundation
-- Run through the Supabase CLI migration workflow. Do not paste service keys into the app.

create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'staff', 'customer');
create type public.event_status as enum ('draft', 'published', 'cancelled', 'completed');
create type public.event_tier as enum ('included', 'premium');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  role public.app_role not null default 'customer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 120),
  subtitle text not null default '',
  description text not null default '',
  venue text not null,
  city text not null default 'Washington, DC',
  starts_at timestamptz not null,
  ends_at timestamptz,
  status public.event_status not null default 'draft',
  tier public.event_tier not null default 'included',
  age_requirement text not null default '21+',
  dress_code text not null default '',
  member_capacity integer not null default 0 check (member_capacity >= 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_time_order check (ends_at is null or ends_at > starts_at)
);

create table public.staff_permissions (
  staff_id uuid primary key references public.profiles(id) on delete cascade,
  can_view_events boolean not null default true,
  can_create_events boolean not null default false,
  can_edit_events boolean not null default false,
  can_delete_events boolean not null default false,
  can_publish_events boolean not null default false,
  can_manage_inventory boolean not null default false,
  can_view_guest_list boolean not null default false,
  can_scan_tickets boolean not null default false,
  can_issue_refunds boolean not null default false,
  scope_all_events boolean not null default false,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.staff_event_assignments (
  staff_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id),
  assigned_at timestamptz not null default now(),
  primary key (staff_id, event_id)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);

create index events_status_starts_at_idx on public.events(status, starts_at);
create index staff_event_assignments_event_idx on public.staff_event_assignments(event_id);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid() and is_active = true;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create or replace function public.staff_can(permission_name text, target_event_id uuid default null)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  allowed boolean := false;
  all_events boolean := false;
begin
  if public.is_admin() then return true; end if;
  if public.current_user_role() <> 'staff' then return false; end if;

  select
    case permission_name
      when 'view_events' then can_view_events
      when 'create_events' then can_create_events
      when 'edit_events' then can_edit_events
      when 'delete_events' then can_delete_events
      when 'publish_events' then can_publish_events
      when 'manage_inventory' then can_manage_inventory
      when 'view_guest_list' then can_view_guest_list
      when 'scan_tickets' then can_scan_tickets
      when 'issue_refunds' then can_issue_refunds
      else false
    end,
    scope_all_events
  into allowed, all_events
  from public.staff_permissions
  where staff_id = auth.uid();

  if not coalesce(allowed, false) then return false; end if;
  if target_event_id is null or coalesce(all_events, false) then return true; end if;

  return exists (
    select 1 from public.staff_event_assignments
    where staff_id = auth.uid() and event_id = target_event_id
  );
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    'customer'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.protect_profile_access_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (old.role, old.is_active) is distinct from (new.role, new.is_active)
     and not public.is_admin() then
    raise exception 'Only an admin can change roles or account access';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger protect_profile_access_fields
before update on public.profiles
for each row execute function public.protect_profile_access_fields();

create or replace function public.audit_sensitive_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, old_values, new_values)
  values (
    auth.uid(), lower(tg_op), tg_table_name,
    coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id',
             (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'staff_id'),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger audit_events after insert or update or delete on public.events
for each row execute function public.audit_sensitive_change();
create trigger audit_staff_permissions after insert or update or delete on public.staff_permissions
for each row execute function public.audit_sensitive_change();
create trigger audit_staff_assignments after insert or update or delete on public.staff_event_assignments
for each row execute function public.audit_sensitive_change();

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.staff_permissions enable row level security;
alter table public.staff_event_assignments enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy events_select on public.events for select to anon, authenticated
using (
  status = 'published'
  or public.is_admin()
  or public.staff_can('view_events', id)
);
create policy events_insert on public.events for insert to authenticated
with check (public.is_admin() or public.staff_can('create_events'));
create policy events_update on public.events for update to authenticated
using (public.is_admin() or public.staff_can('edit_events', id))
with check (
  public.is_admin()
  or (
    public.staff_can('edit_events', id)
    and (status <> 'published' or public.staff_can('publish_events', id))
  )
);
create policy events_delete on public.events for delete to authenticated
using (public.is_admin() or public.staff_can('delete_events', id));

create policy staff_permissions_select on public.staff_permissions for select to authenticated
using (staff_id = auth.uid() or public.is_admin());
create policy staff_permissions_admin_all on public.staff_permissions for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy staff_assignments_select on public.staff_event_assignments for select to authenticated
using (staff_id = auth.uid() or public.is_admin());
create policy staff_assignments_admin_all on public.staff_event_assignments for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy audit_logs_admin_select on public.audit_logs for select to authenticated
using (public.is_admin());

revoke all on function public.current_user_role() from public;
revoke all on function public.is_admin() from public;
revoke all on function public.staff_can(text, uuid) from public;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.staff_can(text, uuid) to authenticated;

grant select on public.events to anon;
grant select, insert, update, delete on public.events to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.staff_permissions to authenticated;
grant select, insert, update, delete on public.staff_event_assignments to authenticated;
grant select on public.audit_logs to authenticated;

-- Bootstrap the first administrator only after signing up that account.
-- Run this once in the SQL editor, replacing the email, then remove it from your notes:
-- update public.profiles set role = 'admin' where email = 'owner@example.com';
