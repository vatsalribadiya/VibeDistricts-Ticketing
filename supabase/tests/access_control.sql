begin;

select plan(5);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'events', 'events table exists');
select has_table('public', 'staff_permissions', 'staff permissions table exists');
select has_table('public', 'staff_event_assignments', 'staff event assignments table exists');
select has_table('public', 'audit_logs', 'audit log table exists');

select * from finish();
rollback;
