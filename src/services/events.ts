import { supabase } from '../lib/supabase';
import { EventItem, EventTier, Reservation } from '../types';

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

export interface ManagedEvent {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  venue: string;
  city: string;
  startsAt: string;
  endsAt: string | null;
  status: EventStatus;
  tier: EventTier;
  ageRequirement: string;
  dressCode: string;
  memberCapacity: number;
  memberReservedCount: number;
  createdBy: string;
}

export interface EventDraft {
  title: string;
  subtitle: string;
  description: string;
  venue: string;
  city: string;
  startsAt: string;
  tier: EventTier;
  ageRequirement: string;
  dressCode: string;
  memberCapacity: number;
}

function client() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function mapManaged(row: Record<string, any>): ManagedEvent {
  return {
    id: row.id, title: row.title, subtitle: row.subtitle, description: row.description,
    venue: row.venue, city: row.city, startsAt: row.starts_at, endsAt: row.ends_at,
    status: row.status, tier: row.tier, ageRequirement: row.age_requirement,
    dressCode: row.dress_code, memberCapacity: row.member_capacity, memberReservedCount: row.member_reserved_count ?? 0, createdBy: row.created_by,
  };
}

export async function listOperationalEvents() {
  const { data, error } = await client().from('events').select('*').order('starts_at');
  if (error) throw error;
  return (data ?? []).map(mapManaged);
}

export async function listPublishedEvents() {
  const { data, error } = await client().from('events').select('*').eq('status', 'published').order('starts_at');
  if (error) throw error;
  return (data ?? []).map(mapManaged).map(toEventItem);
}

export async function listCustomerReservations(userId: string): Promise<Reservation[]> {
  const { data, error } = await client()
    .from('event_reservations')
    .select('event_id, reserved_at, status, confirmation_code')
    .eq('user_id', userId)
    .order('reserved_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(row => ({
    eventId: row.event_id,
    reservedAt: row.reserved_at,
    status: row.status,
    confirmationCode: row.confirmation_code,
  }));
}

export async function createEvent(draft: EventDraft, createdBy: string) {
  const { error } = await client().from('events').insert({
    title: draft.title.trim(), subtitle: draft.subtitle.trim(), description: draft.description.trim(),
    venue: draft.venue.trim(), city: draft.city.trim(), starts_at: new Date(draft.startsAt).toISOString(),
    tier: draft.tier, age_requirement: draft.ageRequirement.trim(), dress_code: draft.dressCode.trim(),
    member_capacity: draft.memberCapacity, created_by: createdBy, status: 'draft',
  });
  if (error) throw error;
}

export async function updateEvent(id: string, draft: EventDraft) {
  const { error } = await client().from('events').update({
    title: draft.title.trim(), subtitle: draft.subtitle.trim(), description: draft.description.trim(),
    venue: draft.venue.trim(), city: draft.city.trim(), starts_at: new Date(draft.startsAt).toISOString(),
    tier: draft.tier, age_requirement: draft.ageRequirement.trim(), dress_code: draft.dressCode.trim(),
    member_capacity: draft.memberCapacity, updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
}

export async function setEventStatus(id: string, status: EventStatus) {
  const { error } = await client().from('events').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteEvent(id: string) {
  const { error } = await client().from('events').delete().eq('id', id);
  if (error) throw error;
}

export async function reserveCloudEvent(eventId: string) {
  const { data, error } = await client().rpc('reserve_event', { target_event_id: eventId }).single();
  if (error) throw error;
  const result = data as { confirmation_code: string; member_spots_remaining: number; credits_remaining: number };
  return { confirmationCode: result.confirmation_code, spotsRemaining: result.member_spots_remaining, creditsRemaining: result.credits_remaining };
}

export async function cancelCloudReservation(eventId: string) {
  const { data, error } = await client().rpc('cancel_event_reservation', { target_event_id: eventId }).single();
  if (error) throw error;
  const result = data as { member_spots_remaining: number; credits_remaining: number };
  return { spotsRemaining: result.member_spots_remaining, creditsRemaining: result.credits_remaining };
}

function toEventItem(event: ManagedEvent): EventItem {
  const date = new Date(event.startsAt);
  return {
    id: event.id, title: event.title, subtitle: event.subtitle, venue: event.venue, city: event.city,
    date: event.startsAt, displayDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
    time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }), tier: event.tier,
    memberSpotsRemaining: Math.max(event.memberCapacity - event.memberReservedCount, 0), accent: event.tier === 'premium' ? '#382016' : '#25332B',
    tags: [event.tier], dressCode: event.dressCode, age: event.ageRequirement, ticketTypes: [],
  };
}
