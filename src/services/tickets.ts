import { supabase } from '../lib/supabase';
import { Ticket } from '../types';

function client() {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

export async function createTicketCheckout(ticketTypeId: string, quantity: number): Promise<string> {
  const { data, error } = await client().functions.invoke('create-ticket-checkout', {
    body: { ticketTypeId, quantity },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error('Stripe Checkout URL was not returned.');
  return data.url as string;
}

export async function listPaidTickets(userId: string, holderName: string): Promise<Ticket[]> {
  const { data, error } = await client()
    .from('paid_tickets')
    .select('id, order_id, event_id, ticket_type_id, admission_token, status, checked_in_at, created_at, ticket_orders!inner(ticket_type_name, event_title, event_venue, event_starts_at)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(raw => {
    const row = raw as Record<string, any>;
    const order = (Array.isArray(row.ticket_orders) ? row.ticket_orders[0] : row.ticket_orders) as Record<string, any>;
    const eventDate = new Date(order.event_starts_at);
    return {
      id: row.id,
      orderId: row.order_id,
      eventId: row.event_id,
      ticketTypeId: row.ticket_type_id,
      ticketTypeName: order.ticket_type_name,
      holderName,
      purchasedAt: row.created_at,
      status: row.status,
      qrPayload: `VDT1|${row.event_id}|${row.admission_token}`,
      checkedInAt: row.checked_in_at,
      eventTitle: order.event_title,
      eventDisplayDate: eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
      eventVenue: order.event_venue,
    } as Ticket;
  });
}
