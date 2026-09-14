import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { EVENTS } from '../data/events';
import { cancelCloudReservation, listCustomerReservations, reserveCloudEvent } from '../services/events';
import { createMembershipCheckout, getMembership } from '../services/memberships';
import { createTicketCheckout, listPaidTickets } from '../services/tickets';
import { EventItem, MemberProfile, Membership, MembershipPlan, Reservation, Ticket, TicketOrder } from '../types';
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
  purchaseTickets: (event: EventItem, ticketTypeId: string, quantity: number) => Promise<{ ok: boolean; message: string }>;
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
      session ? listPaidTickets(session.user.id, session.user.user_metadata?.full_name ?? session.user.email ?? 'Vibe Districts Guest') : Promise.resolve([]),
    ])
      .then(([value, cloudMembership, cloudReservations, cloudTickets]) => {
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
          setProfile(parsed.profile ?? null);
          setHasOnboarded(parsed.hasOnboarded);
        }
        setMembership(cloudMembership ?? defaultMembership);
        setReservations(cloudReservations);
        setTickets(cloudTickets);
      })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setHydratedKey(storageKey); });
    return () => { cancelled = true; };
  }, [storageKey]);

  useEffect(() => {
    if (!session) return;
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      Promise.all([
        getMembership(),
        listCustomerReservations(session.user.id),
        listPaidTickets(session.user.id, session.user.user_metadata?.full_name ?? session.user.email ?? 'Vibe Districts Guest'),
      ])
        .then(([nextMembership, nextReservations, nextTickets]) => {
          setMembership(nextMembership ?? defaultMembership);
          setReservations(nextReservations);
          setTickets(nextTickets);
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
      const cloudReservations = session ? await listCustomerReservations(session.user.id) : [];
      setReservations(cloudReservations);
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

  const purchaseTickets = async (event: EventItem, ticketTypeId: string, quantity: number) => {
    const type = event.ticketTypes.find(item => item.id === ticketTypeId);
    if (!type || !type.salesOpen) return { ok: false, message: 'This ticket is not currently on sale.' };
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 8) return { ok: false, message: 'Choose between 1 and 8 tickets.' };
    if (type.quantityRemaining < quantity) return { ok: false, message: 'There are not enough tickets remaining.' };

    try {
      const checkoutUrl = await createTicketCheckout(ticketTypeId, quantity);
      await Linking.openURL(checkoutUrl);
      return { ok: true, message: 'Complete payment in Stripe Checkout, then return to the app. Your tickets will appear automatically.' };
    } catch (error) {
      return { ok: false, message: errorMessage(error, 'Ticket checkout could not be started.') };
    }
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
