import { supabase } from '../lib/supabase';

export interface GuestListEvent {
  id: string;
  title: string;
  startsAt: string;
  memberCapacity: number;
  confirmedCount: number;
  attendedCount: number;
  cancelledCount: number;
}

export interface GuestListEntry {
  id: string;
  fullName: string;
  email: string;
  status: 'confirmed' | 'attended' | 'cancelled';
  confirmationCode: string;
  reservedAt: string;
  checkedInAt: string | null;
  checkedInByName: string | null;
}

function client() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

export async function listGuestListEvents(): Promise<GuestListEvent[]> {
  const { data, error } = await client().rpc('list_guest_list_events');
  if (error) throw error;
  return (data ?? []).map((row: Record<string, any>) => ({
    id: row.event_id, title: row.title, startsAt: row.starts_at,
    memberCapacity: row.member_capacity, confirmedCount: Number(row.confirmed_count),
    attendedCount: Number(row.attended_count), cancelledCount: Number(row.cancelled_count),
  }));
}

export async function getEventGuestList(eventId: string): Promise<GuestListEntry[]> {
  const { data, error } = await client().rpc('get_event_guest_list', { target_event_id: eventId });
  if (error) throw error;
  return (data ?? []).map((row: Record<string, any>) => ({
    id: row.reservation_id, fullName: row.full_name, email: row.email,
    status: row.reservation_status, confirmationCode: row.confirmation_code,
    reservedAt: row.reserved_at, checkedInAt: row.checked_in_at,
    checkedInByName: row.checked_in_by_name,
  }));
}
