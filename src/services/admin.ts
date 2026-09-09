import { supabase } from '../lib/supabase';
import { StaffPermissions, UserRole } from '../types';

export interface ManagedUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  permissions: StaffPermissions | null;
}

export const emptyStaffPermissions: StaffPermissions = {
  canViewEvents: true,
  canCreateEvents: false,
  canEditEvents: false,
  canDeleteEvents: false,
  canPublishEvents: false,
  canManageInventory: false,
  canViewGuestList: false,
  canScanTickets: false,
  canIssueRefunds: false,
  scopeAllEvents: false,
};

function mapPermissions(row: Record<string, boolean>): StaffPermissions {
  return {
    canViewEvents: row.can_view_events ?? false,
    canCreateEvents: row.can_create_events ?? false,
    canEditEvents: row.can_edit_events ?? false,
    canDeleteEvents: row.can_delete_events ?? false,
    canPublishEvents: row.can_publish_events ?? false,
    canManageInventory: row.can_manage_inventory ?? false,
    canViewGuestList: row.can_view_guest_list ?? false,
    canScanTickets: row.can_scan_tickets ?? false,
    canIssueRefunds: row.can_issue_refunds ?? false,
    scopeAllEvents: row.scope_all_events ?? false,
  };
}

function requireClient() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

export async function listManagedUsers(): Promise<ManagedUser[]> {
  const client = requireClient();
  const [{ data: profiles, error }, { data: permissionRows, error: permissionError }] = await Promise.all([
    client.from('profiles').select('id, full_name, email, role, is_active, created_at').order('created_at'),
    client.from('staff_permissions').select('*'),
  ]);
  if (error) throw error;
  if (permissionError) throw permissionError;
  const byStaffId = new Map((permissionRows ?? []).map(row => [row.staff_id, mapPermissions(row)]));
  return (profiles ?? []).map(row => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    permissions: byStaffId.get(row.id) ?? null,
  }));
}

export async function setManagedUserRole(userId: string, role: 'customer' | 'staff', adminId: string) {
  const client = requireClient();
  const { error } = await client.from('profiles').update({ role }).eq('id', userId);
  if (error) throw error;
  if (role === 'staff') {
    const { error: permissionError } = await client.from('staff_permissions').upsert({
      staff_id: userId,
      can_view_events: true,
      updated_by: adminId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'staff_id' });
    if (permissionError) throw permissionError;
  } else {
    const { error: assignmentError } = await client.from('staff_event_assignments').delete().eq('staff_id', userId);
    if (assignmentError) throw assignmentError;
    const { error: permissionError } = await client.from('staff_permissions').delete().eq('staff_id', userId);
    if (permissionError) throw permissionError;
  }
}

export async function setManagedUserActive(userId: string, isActive: boolean) {
  const { error } = await requireClient().from('profiles').update({ is_active: isActive }).eq('id', userId);
  if (error) throw error;
}

export async function saveStaffPermissions(staffId: string, permissions: StaffPermissions, adminId: string) {
  const { error } = await requireClient().from('staff_permissions').upsert({
    staff_id: staffId,
    can_view_events: permissions.canViewEvents,
    can_create_events: permissions.canCreateEvents,
    can_edit_events: permissions.canEditEvents,
    can_delete_events: permissions.canDeleteEvents,
    can_publish_events: permissions.canPublishEvents,
    can_manage_inventory: permissions.canManageInventory,
    can_view_guest_list: permissions.canViewGuestList,
    can_scan_tickets: permissions.canScanTickets,
    can_issue_refunds: permissions.canIssueRefunds,
    scope_all_events: permissions.scopeAllEvents,
    updated_by: adminId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'staff_id' });
  if (error) throw error;
}
