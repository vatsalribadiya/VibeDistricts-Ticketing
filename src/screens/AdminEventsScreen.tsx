import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PrimaryButton, TextButton } from '../components/Buttons';
import { createEvent, deleteEvent, EventDraft, listOperationalEvents, ManagedEvent, setEventStatus, updateEvent } from '../services/events';
import { useAuth } from '../state/AuthContext';
import { useEvents } from '../state/EventsContext';
import { colors } from '../theme/colors';

const blank: EventDraft = { title: '', subtitle: '', description: '', venue: '', city: 'Washington, DC', startsAt: '', tier: 'included', ageRequirement: '21+', dressCode: '', memberCapacity: 25 };

export function AdminEventsScreen() {
  const { profile } = useAuth();
  const { refresh: refreshCatalog } = useEvents();
  const [events, setEvents] = useState<ManagedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ManagedEvent | null | undefined>(undefined);
  const load = useCallback(async () => { try { setEvents(await listOperationalEvents()); } catch (e) { Alert.alert('Unable to load events', message(e)); } finally { setLoading(false); } }, []);
  useEffect(() => { void load(); }, [load]);
  const action = async (work: () => Promise<void>) => { try { await work(); await Promise.all([load(), refreshCatalog()]); } catch (e) { Alert.alert('Unable to update event', message(e)); } };
  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.champagne} size="large" /></View>;
  return <SafeAreaView style={styles.root}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>EVENT OPERATIONS</Text><Text style={styles.title}>Manage events</Text>
    <Text style={styles.intro}>Create drafts, review details, control member capacity, and publish only when the event is ready.</Text>
    <PrimaryButton onPress={() => setEditing(null)}>CREATE EVENT</PrimaryButton>
    <View style={styles.list}>{events.map(event => <View key={event.id} style={styles.card}>
      <View style={styles.cardTop}><View style={{ flex: 1 }}><Text style={styles.eventTitle}>{event.title}</Text><Text style={styles.meta}>{new Date(event.startsAt).toLocaleString()} · {event.venue}</Text></View><Text style={[styles.status, event.status === 'published' && styles.published]}>{event.status.toUpperCase()}</Text></View>
      <Text style={styles.detail}>{event.tier.toUpperCase()} · {event.memberCapacity} member spots · {event.ageRequirement}</Text>
      <View style={styles.actions}><TextButton onPress={() => setEditing(event)}>Edit</TextButton>{event.status !== 'published' && <TextButton onPress={() => void action(() => setEventStatus(event.id, 'published'))}>Publish</TextButton>}{event.status === 'published' && <TextButton onPress={() => void action(() => setEventStatus(event.id, 'cancelled'))}>Cancel</TextButton>}<TextButton onPress={() => Alert.alert('Delete event?', 'This permanently deletes the event and cannot be undone.', [{ text: 'Keep', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void action(() => deleteEvent(event.id)) }])}>Delete</TextButton></View>
    </View>)}</View>
    {events.length === 0 && <Text style={styles.empty}>No cloud events yet. Create the first draft.</Text>}
  </ScrollView><EventEditor visible={editing !== undefined} event={editing ?? null} onClose={() => setEditing(undefined)} onSave={async draft => { await action(() => editing ? updateEvent(editing.id, draft) : createEvent(draft, profile!.id)); setEditing(undefined); }} /></SafeAreaView>;
}

function EventEditor({ visible, event, onClose, onSave }: { visible: boolean; event: ManagedEvent | null; onClose: () => void; onSave: (draft: EventDraft) => Promise<void> }) {
  const [draft, setDraft] = useState<EventDraft>(blank); const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(event ? { title: event.title, subtitle: event.subtitle, description: event.description, venue: event.venue, city: event.city, startsAt: event.startsAt.slice(0, 16), tier: event.tier, ageRequirement: event.ageRequirement, dressCode: event.dressCode, memberCapacity: event.memberCapacity } : blank); }, [event, visible]);
  const field = (key: keyof EventDraft, value: string | number) => setDraft(current => ({ ...current, [key]: value }));
  const save = async () => {
    if (!draft.title.trim() || !draft.venue.trim() || Number.isNaN(Date.parse(draft.startsAt)) || draft.memberCapacity < 0) { Alert.alert('Check event details', 'Title, venue, a valid date and time, and non-negative capacity are required.'); return; }
    setSaving(true); try { await onSave(draft); } finally { setSaving(false); }
  };
  return <Modal animationType="slide" visible={visible} onRequestClose={onClose}><SafeAreaView style={styles.modal}><ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
    <View style={styles.modalHeader}><Text style={styles.modalTitle}>{event ? 'Edit event' : 'New event'}</Text><TextButton onPress={onClose}>Close</TextButton></View>
    <Input label="TITLE" value={draft.title} onChange={v => field('title', v)} placeholder="Bollywood Nights DC" /><Input label="SUBTITLE" value={draft.subtitle} onChange={v => field('subtitle', v)} placeholder="Saturday night experience" /><Input label="DESCRIPTION" value={draft.description} onChange={v => field('description', v)} placeholder="Event details" multiline /><Input label="VENUE" value={draft.venue} onChange={v => field('venue', v)} placeholder="Venue name" /><Input label="CITY" value={draft.city} onChange={v => field('city', v)} placeholder="Washington, DC" /><Input label="DATE AND TIME" value={draft.startsAt} onChange={v => field('startsAt', v)} placeholder="2026-10-24T21:00" /><Input label="MEMBER CAPACITY" value={String(draft.memberCapacity)} onChange={v => field('memberCapacity', Number(v.replace(/[^0-9]/g, '')) || 0)} placeholder="25" keyboard="number-pad" /><Input label="AGE REQUIREMENT" value={draft.ageRequirement} onChange={v => field('ageRequirement', v)} placeholder="21+" /><Input label="DRESS CODE" value={draft.dressCode} onChange={v => field('dressCode', v)} placeholder="Upscale nightlife" />
    <Text style={styles.inputLabel}>EVENT TYPE</Text><View style={styles.typeRow}>{(['included', 'premium'] as const).map(tier => <Pressable key={tier} onPress={() => field('tier', tier)} style={[styles.typeButton, draft.tier === tier && styles.typeActive]}><Text style={[styles.typeText, draft.tier === tier && styles.typeTextActive]}>{tier.toUpperCase()}</Text></Pressable>)}</View>
    <PrimaryButton disabled={saving} onPress={() => void save()}>{saving ? 'SAVING' : event ? 'SAVE CHANGES' : 'CREATE DRAFT'}</PrimaryButton>
  </ScrollView></SafeAreaView></Modal>;
}

function Input({ label, value, onChange, placeholder, multiline, keyboard }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; multiline?: boolean; keyboard?: 'number-pad' }) { return <View style={styles.inputGroup}><Text style={styles.inputLabel}>{label}</Text><TextInput keyboardType={keyboard} multiline={multiline} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} style={[styles.input, multiline && styles.multiline]} value={value} /></View>; }
function message(error: unknown) { return error instanceof Error ? error.message : 'Try again.'; }

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 125 }, eyebrow: { color: colors.champagne, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 22 }, title: { color: colors.cream, fontSize: 36, fontWeight: '900', marginTop: 8 }, intro: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 10, marginBottom: 20 }, list: { gap: 12, marginTop: 18 }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 16 }, cardTop: { flexDirection: 'row', gap: 10 }, eventTitle: { color: colors.cream, fontSize: 18, fontWeight: '900' }, meta: { color: colors.muted, fontSize: 10, marginTop: 5 }, status: { color: colors.champagneBright, fontSize: 8, fontWeight: '900', backgroundColor: '#3A3025', borderRadius: 8, padding: 7, alignSelf: 'flex-start' }, published: { backgroundColor: '#244332', color: colors.success }, detail: { color: colors.muted, fontSize: 10, marginTop: 13 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 17 }, empty: { color: colors.muted, textAlign: 'center', marginTop: 35 }, modal: { flex: 1, backgroundColor: colors.background }, modalContent: { padding: 20, paddingBottom: 55 }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }, modalTitle: { color: colors.cream, fontSize: 30, fontWeight: '900' }, inputGroup: { marginBottom: 13 }, inputLabel: { color: colors.champagne, fontSize: 9, fontWeight: '900', letterSpacing: 1.3, marginBottom: 7 }, input: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.cream, paddingHorizontal: 14, fontSize: 14 }, multiline: { minHeight: 95, paddingTop: 14, textAlignVertical: 'top' }, typeRow: { flexDirection: 'row', gap: 9, marginBottom: 20 }, typeButton: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, alignItems: 'center', padding: 12 }, typeActive: { backgroundColor: colors.champagne, borderColor: colors.champagne }, typeText: { color: colors.muted, fontWeight: '900', fontSize: 10 }, typeTextActive: { color: colors.black } });
