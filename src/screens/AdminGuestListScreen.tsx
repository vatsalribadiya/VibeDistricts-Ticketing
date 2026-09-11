import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getEventGuestList, GuestListEntry, GuestListEvent, listGuestListEvents } from '../services/guestList';
import { colors } from '../theme/colors';

type Filter = 'all' | GuestListEntry['status'];

export function AdminGuestListScreen() {
  const [events, setEvents] = useState<GuestListEvent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [guests, setGuests] = useState<GuestListEntry[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const nextEvents = await listGuestListEvents();
      setEvents(nextEvents);
      const eventId = selectedId && nextEvents.some(item => item.id === selectedId) ? selectedId : nextEvents[0]?.id ?? null;
      setSelectedId(eventId);
      setGuests(eventId ? await getEventGuestList(eventId) : []);
    } catch (error) {
      Alert.alert('Unable to load guest list', error instanceof Error ? error.message : 'Try again.');
    } finally { setLoading(false); }
  }, [selectedId]);

  useEffect(() => { void load(); }, []);
  const selectEvent = async (eventId: string) => {
    setSelectedId(eventId); setLoading(true);
    try { setGuests(await getEventGuestList(eventId)); }
    catch (error) { Alert.alert('Unable to load guest list', error instanceof Error ? error.message : 'Try again.'); }
    finally { setLoading(false); }
  };
  const selected = events.find(item => item.id === selectedId);
  const visible = useMemo(() => guests.filter(item => filter === 'all' || item.status === filter), [guests, filter]);

  return <SafeAreaView style={styles.root}><ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.champagne} />} contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>DOOR OPERATIONS</Text><Text style={styles.title}>Guest lists</Text>
    <Text style={styles.intro}>Live member reservations and attendance. Pull down to refresh during entry.</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventPicker}>
      {events.map(event => <Pressable key={event.id} onPress={() => void selectEvent(event.id)} style={[styles.eventChoice, selectedId === event.id && styles.eventChoiceActive]}><Text numberOfLines={1} style={[styles.eventChoiceTitle, selectedId === event.id && styles.eventChoiceTitleActive]}>{event.title}</Text><Text style={styles.eventChoiceDate}>{new Date(event.startsAt).toLocaleDateString()}</Text></Pressable>)}
    </ScrollView>
    {selected && <View style={styles.summary}><Stat label="CONFIRMED" value={selected.confirmedCount} /><Stat label="ATTENDED" value={selected.attendedCount} /><Stat label="CANCELLED" value={selected.cancelledCount} /></View>}
    <View style={styles.filters}>{(['all', 'confirmed', 'attended', 'cancelled'] as const).map(item => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}><Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item.toUpperCase()}</Text></Pressable>)}</View>
    {loading ? <ActivityIndicator color={colors.champagne} size="large" /> : <View style={styles.list}>{visible.map(guest => <View key={guest.id} style={styles.guest}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{(guest.fullName || guest.email)[0]?.toUpperCase()}</Text></View>
      <View style={styles.guestCopy}><Text style={styles.guestName}>{guest.fullName || 'Unnamed member'}</Text><Text style={styles.guestEmail}>{guest.email}</Text><Text style={styles.code}>{guest.confirmationCode}{guest.checkedInAt ? ` · ${new Date(guest.checkedInAt).toLocaleTimeString()}` : ''}</Text></View>
      <Text style={[styles.status, guest.status === 'attended' && styles.attended]}>{guest.status}</Text>
    </View>)}</View>}
    {!loading && visible.length === 0 && <Text style={styles.empty}>No guests match this filter.</Text>}
  </ScrollView></SafeAreaView>;
}

function Stat({ label, value }: { label: string; value: number }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 125 }, eyebrow: { color: colors.champagne, fontSize: 9, fontWeight: '900', letterSpacing: 2, marginTop: 22 }, title: { color: colors.cream, fontSize: 36, fontWeight: '900', marginTop: 8 }, intro: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 9 },
  eventPicker: { gap: 10, paddingVertical: 20 }, eventChoice: { width: 190, padding: 14, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, eventChoiceActive: { borderColor: colors.champagne, backgroundColor: '#211A12' }, eventChoiceTitle: { color: colors.muted, fontSize: 12, fontWeight: '800' }, eventChoiceTitleActive: { color: colors.cream }, eventChoiceDate: { color: colors.champagne, fontSize: 9, marginTop: 6 },
  summary: { flexDirection: 'row', gap: 8, marginBottom: 16 }, stat: { flex: 1, padding: 13, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, statValue: { color: colors.champagneBright, fontSize: 23, fontWeight: '900' }, statLabel: { color: colors.muted, fontSize: 7, fontWeight: '900', marginTop: 3 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 }, filter: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.surface }, filterActive: { backgroundColor: colors.champagne }, filterText: { color: colors.muted, fontSize: 8, fontWeight: '900' }, filterTextActive: { color: colors.black },
  list: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }, guest: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, backgroundColor: colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2B2117' }, avatarText: { color: colors.champagneBright, fontWeight: '900' }, guestCopy: { flex: 1 }, guestName: { color: colors.cream, fontSize: 13, fontWeight: '800' }, guestEmail: { color: colors.muted, fontSize: 9, marginTop: 3 }, code: { color: colors.champagne, fontSize: 8, marginTop: 4 }, status: { color: colors.champagne, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' }, attended: { color: colors.success }, empty: { color: colors.muted, textAlign: 'center', marginTop: 28 },
});
