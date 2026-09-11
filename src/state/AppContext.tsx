import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { EVENTS } from '../data/events';
import { cancelCloudReservation, listCustomerReservations, reserveCloudEvent } from '../services/events';
import { createMembershipCheckout, getMembership } from '../services/memberships';
import { CheckInResult, EventItem, MemberProfile, Membership, MembershipPlan, Reservation, Ticket, TicketOrder } from '../types';
import { useAuth } from './AuthContext';

interface AppStateValue {
  membership: Membership;
  reservations: Reservation[];
  orders: TicketOrder[];
  tickets: Ticket[];
  profile: MemberProfile | null;
  hasOnboarded: boolean;
  activate: (plan: MembershipPlan) => Promise<{ ok: boolean; message: string }>;
  reserve: (event: EventItem) => Promise<{ ok: boolean; message: string }>;
  cancelReservation: (eventId: string) => Promise<{ ok: boolean; message: string }>;
  purchaseTickets: (event: EventItem, ticketTypeId: string, quantity: number) => { ok: boolean; message: string; orderId?: string };
  checkInTicket: (qrPayload: string) => CheckInResult;
  reservationFor: (eventId: string) => Reservation | undefined;
  finishOnboarding: (profile: MemberProfile) => void;
  resetDemo: () => void;
}

const defaultMembership: Membership = {
  active: false,
  plan: null,
  homeCity: 'Washington, DC',
  creditsRemaining: 0,
  creditsTotal: 0,
  renewalDate: null,
};

const STORAGE_KEY_PREFIX = '@vibe-districts/demo-state-v2';
const AppStateContext = createContext<AppStateValue | null>(null);

function confirmationCode() {
  return `VD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`.toUpperCase();
}

function ticketPayload(ticketId: string, eventId: string) {
  return `VDT1|${ticketId}|${eventId}|${Math.random().toString(36).slice(2, 14)}`;
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

export function AppStateProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const storageKey = `${STORAGE_KEY_PREFIX}:${session?.user.id ?? 'signed-out'}`;
  const [membership, setMembership] = useState<Membership>(defaultMembership);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [orders, setOrders] = useState<TicketOrder[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setHydratedKey(null);
    setMembership(defaultMembership);
    setReservations([]);
    setOrders([]);
    setTickets([]);
    setProfile(null);
    setHasOnboarded(false);

    Promise.all([
      AsyncStorage.getItem(storageKey),
      session ? getMembership() : Promise.resolve(null),
      session ? listCustomerReservations(session.user.id) : Promise.resolve([]),
    ])
      .then(([value, cloudMembership, cloudReservations]) => {
        if (cancelled) return;
        if (value) {
          const parsed = JSON.parse(value) as {
          membership: Membership;
          reservations: Reservation[];
          orders?: TicketOrder[];
          tickets?: Ticket[];
          profile?: MemberProfile | null;
          hasOnboarded: boolean;
        };
          setOrders(parsed.orders ?? []);
          setTickets(parsed.tickets ?? []);
          setProfile(parsed.profile ?? null);
          setHasOnboarded(parsed.hasOnboarded);
        }
        setMembership(cloudMembership ?? defaultMembership);
        setReservations(cloudReservations);
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setHydratedKey(storageKey); });
    return () => { cancelled = true; };
  }, [storageKey]);

  useEffect(() => {
    if (!session) return;
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      Promise.all([getMembership(), listCustomerReservations(session.user.id)])
        .then(([nextMembership, nextReservations]) => {
          setMembership(nextMembership ?? defaultMembership);
          setReservations(nextReservations);
        })
        .catch(() => undefined);
    });
    return () => listener.remove();
  }, [session]);

  useEffect(() => {
    if (hydratedKey !== storageKey) return;
    AsyncStorage.setItem(storageKey, JSON.stringify({ membership, reservations, orders, tickets, profile, hasOnboarded })).catch(
      () => undefined,
    );
  }, [membership, reservations, orders, tickets, profile, hasOnboarded, hydratedKey, storageKey]);

  const activate = async (plan: MembershipPlan) => {
    try {
      const checkoutUrl = await createMembershipCheckout(plan);
      await Linking.openURL(checkoutUrl);
      return { ok: true, message: 'Complete payment in Stripe Checkout, then return to the app.' };
    } catch (error) {
      return { ok: false, message: errorMessage(error, 'Membership could not be activated.') };
    }
  };

  const reserve = async (event: EventItem) => {
    if (!membership.active) return { ok: false, message: 'Choose a membership before reserving.' };
    if (event.city !== membership.homeCity) return { ok: false, message: 'This event is outside your home city.' };
    if (event.tier === 'premium') return { ok: false, message: 'This premium event requires a member upgrade.' };
    if (event.memberSpotsRemaining < 1) return { ok: false, message: 'Member inventory is currently full.' };
    if (membership.creditsRemaining < 1) return { ok: false, message: 'You have used all credits for this period.' };
    if (reservations.some(item => item.eventId === event.id && item.status === 'confirmed')) {
      return { ok: false, message: 'This event is already in your reservations.' };
    }

    try {
      const cloud = await reserveCloudEvent(event.id);
      setReservations(current => [...current, { eventId: event.id, reservedAt: new Date().toISOString(), status: 'confirmed', confirmationCode: cloud.confirmationCode }]);
      setMembership(current => ({ ...current, creditsRemaining: cloud.creditsRemaining }));
      return { ok: true, message: `Your member admission is confirmed. ${cloud.spotsRemaining} spots remain.` };
    } catch (error) {
      return { ok: false, message: errorMessage(error, 'Reservation could not be completed.') };
    }
  };

  const cancelReservation = async (eventId: string) => {
    const active = reservations.some(item => item.eventId === eventId && item.status === 'confirmed');
    if (!active) return { ok: false, message: 'Active reservation not found.' };
    try {
      const cloud = await cancelCloudReservation(eventId);
      setReservations(current => current.map(item => (item.eventId === eventId ? { ...item, status: 'cancelled' as const } : item)));
      setMembership(current => ({ ...current, creditsRemaining: cloud.creditsRemaining }));
      return { ok: true, message: 'Your event credit and member spot were restored.' };
    } catch (error) {
      return { ok: false, message: errorMessage(error, 'Cancellation could not be completed.') };
    }
  };

  const purchaseTickets = (event: EventItem, ticketTypeId: string, quantity: number) => {
    const type = event.ticketTypes.find(item => item.id === ticketTypeId);
    if (!type || !type.salesOpen) return { ok: false, message: 'This ticket is not currently on sale.' };
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 8) return { ok: false, message: 'Choose between 1 and 8 tickets.' };
    if (type.quantityRemaining < quantity) return { ok: false, message: 'There are not enough tickets remaining.' };

    const orderId = makeId('ORD');
    const purchasedAt = new Date().toISOString();
    const order: TicketOrder = {
      id: orderId,
      eventId: event.id,
      ticketTypeId,
      quantity,
      subtotal: type.price * quantity,
      fees: type.serviceFee * quantity,
      total: (type.price + type.serviceFee) * quantity,
      status: 'paid',
      purchasedAt,
      paymentMode: 'demo',
    };
    const issued = Array.from({ length: quantity }, () => {
      const id = makeId('TKT');
      return {
        id,
        orderId,
        eventId: event.id,
        ticketTypeId,
        ticketTypeName: type.name,
        holderName: profile?.fullName ?? 'Vibe Districts Member',
        purchasedAt,
        status: 'valid' as const,
        qrPayload: ticketPayload(id, event.id),
        checkedInAt: null,
      };
    });
    setOrders(current => [...current, order]);
    setTickets(current => [...current, ...issued]);
    return { ok: true, message: `${quantity} ticket${quantity === 1 ? '' : 's'} issued.`, orderId };
  };

  const checkInTicket = (qrPayload: string): CheckInResult => {
    const index = tickets.findIndex(item => item.qrPayload === qrPayload);
    if (index < 0) return { ok: false, title: 'Invalid ticket', message: 'This QR code was not issued by this pilot.' };
    const ticket = tickets[index]!;
    if (ticket.status === 'used') return { ok: false, title: 'Already checked in', message: `Used at ${new Date(ticket.checkedInAt!).toLocaleTimeString()}.`, ticket };
    if (ticket.status !== 'valid') return { ok: false, title: 'Ticket unavailable', message: `Ticket status: ${ticket.status}.`, ticket };
    const updated = { ...ticket, status: 'used' as const, checkedInAt: new Date().toISOString() };
    setTickets(current => current.map(item => item.id === updated.id ? updated : item));
    return { ok: true, title: 'Admit guest', message: `${ticket.ticketTypeName} · ${ticket.holderName}`, ticket: updated };
  };

  const value = useMemo<AppStateValue>(
    () => ({
      membership,
      reservations,
      orders,
      tickets,
      profile,
      hasOnboarded,
      activate,
      reserve,
      cancelReservation,
      purchaseTickets,
      checkInTicket,
      reservationFor: eventId => reservations.find(item => item.eventId === eventId && item.status === 'confirmed'),
      finishOnboarding: memberProfile => {
        setProfile(memberProfile);
        setHasOnboarded(true);
      },
      resetDemo: () => {
        setOrders([]);
        setTickets([]);
        setProfile(null);
        setHasOnboarded(false);
        AsyncStorage.removeItem(storageKey).catch(() => undefined);
      },
    }),
    [membership, reservations, orders, tickets, profile, hasOnboarded, storageKey],
  );

  if (hydratedKey !== storageKey) return null;
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used within AppStateProvider');
  return value;
}

export function eventForReservation(reservation: Reservation) {
  return EVENTS.find(event => event.id === reservation.eventId);
}
