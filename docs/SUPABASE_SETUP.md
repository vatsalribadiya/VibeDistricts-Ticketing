# Supabase setup

This phase creates the production data foundation and backend-enforced roles. It does not enable real payments yet.

## Create the project

1. Create a Supabase project for Vibe Districts.
2. Record the Project URL and the public anonymous key from Project Settings and API.
3. Copy `.env.example` to `.env.local`.
4. Put only the public values in `.env.local`. Never place the service role key or Stripe secret key in the mobile app.

## Apply the migration

Install and authenticate the Supabase CLI, link the repository to the project, and push the migration:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The migration creates profiles, events, staff permissions, event assignments, audit logs, helper functions, triggers, and Row Level Security policies.

## Create the first admin

1. Create the owner account through Supabase Authentication.
2. Open the Supabase SQL editor.
3. Run the following once with the real owner email:

```sql
update public.profiles
set role = 'admin'
where email = 'owner@example.com';
```

All later staff roles and permissions must be assigned by an authenticated admin workflow. New accounts always start as customers.

## Verify before connecting the app

- A customer can read published events and their own profile.
- A customer cannot change a role or create an event.
- A new staff member has no event-management access until an admin grants it.
- Assigned staff can act only on assigned events unless `scope_all_events` is enabled.
- Only admins can assign roles, permissions, and event scopes.
- Event and permission changes appear in `audit_logs`.

## Environment rules

- `.env.local` is ignored by Git.
- `EXPO_PUBLIC_` values are visible in the compiled app and must never contain secrets.
- Stripe secret keys, webhook signing secrets, and the Supabase service role key will live only in Supabase Edge Function secrets.
