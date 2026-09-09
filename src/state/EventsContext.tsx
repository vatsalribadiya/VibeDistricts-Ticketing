import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { EVENTS } from '../data/events';
import { listPublishedEvents } from '../services/events';
import { EventItem } from '../types';

interface EventsValue { events: EventItem[]; loading: boolean; refresh: () => Promise<void>; }
const EventsContext = createContext<EventsValue | null>(null);

export function EventsProvider({ children }: PropsWithChildren) {
  const [cloudEvents, setCloudEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try { setCloudEvents(await listPublishedEvents()); }
    catch { setCloudEvents([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const value = useMemo(() => ({ events: cloudEvents.length ? cloudEvents : EVENTS, loading, refresh }), [cloudEvents, loading, refresh]);
  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents() {
  const value = useContext(EventsContext);
  if (!value) throw new Error('useEvents must be used within EventsProvider');
  return value;
}
