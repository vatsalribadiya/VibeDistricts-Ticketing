import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FauxQR } from '../components/FauxQR';
import { EVENTS } from '../data/events';
import { useAppState } from '../state/AppContext';
import { colors } from '../theme/colors';

export function TicketsScreen() {
  const { tickets } = useAppState();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = tickets.find(item => item.id === selectedId) ?? tickets[0];
  const event = useMemo(() => EVENTS.find(item => item.id === selected?.eventId), [selected]);
  return <SafeAreaView style={styles.root}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>ADMISSION WALLET</Text><Text style={styles.title}>My tickets</Text>
    {!selected || !event ? <View style={styles.empty}><Ionicons name="ticket-outline" size={42} color={colors.champagne} /><Text style={styles.emptyTitle}>No paid tickets yet</Text><Text style={styles.emptyBody}>Open an event and choose Buy Tickets. Member reservations appear in the Member Pass tab.</Text></View> : <>
      <View style={styles.ticket}>
        <View style={styles.top}><Text style={styles.brand}>VIBE DISTRICTS</Text><Text style={[styles.status, selected.status === 'used' && styles.used]}>{selected.status.toUpperCase()}</Text></View>
        <Text style={styles.event}>{event.title}</Text><Text style={styles.meta}>{event.displayDate} · {event.venue}</Text>
        <View style={styles.qr}><FauxQR seed={selected.qrPayload} size={189} /></View>
        <Text style={styles.ticketType}>{selected.ticketTypeName}</Text><Text style={styles.code}>{selected.id}</Text>
        <View style={styles.holder}><Text style={styles.holderLabel}>TICKET HOLDER</Text><Text style={styles.holderName}>{selected.holderName}</Text></View>
      </View>
      {tickets.length > 1 && <View style={styles.selector}>{tickets.map((ticket, index) => <Pressable key={ticket.id} onPress={() => setSelectedId(ticket.id)} style={[styles.dot, ticket.id === selected.id && styles.dotActive]}><Text style={styles.dotText}>{index + 1}</Text></Pressable>)}</View>}
      <Text style={styles.security}>Each QR code admits one guest once. Screenshots should not be accepted after production rotating tokens are enabled.</Text>
    </>}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 120 }, eyebrow: { color: colors.champagne, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 22 }, title: { color: colors.cream, fontSize: 38, fontWeight: '900', marginTop: 8, marginBottom: 24 },
  empty: { padding: 28, backgroundColor: colors.surface, borderRadius: 22, gap: 15 }, emptyTitle: { color: colors.cream, fontSize: 21, fontWeight: '800' }, emptyBody: { color: colors.muted, lineHeight: 20 },
  ticket: { backgroundColor: '#E7D3AA', borderRadius: 26, padding: 22 }, top: { flexDirection: 'row', justifyContent: 'space-between' }, brand: { color: colors.black, fontWeight: '900', letterSpacing: 1.5 }, status: { color: '#17633B', fontSize: 9, fontWeight: '900' }, used: { color: '#8A2E25' }, event: { color: colors.black, fontSize: 29, fontWeight: '900', marginTop: 30 }, meta: { color: '#635644', fontSize: 11, marginTop: 7 },
  qr: { alignSelf: 'center', marginTop: 28 }, ticketType: { color: colors.black, textAlign: 'center', fontWeight: '900', marginTop: 17 }, code: { color: '#635644', textAlign: 'center', fontSize: 8, marginTop: 5 }, holder: { borderTopWidth: 1, borderTopColor: '#B9A47E', marginTop: 20, paddingTop: 15 }, holderLabel: { color: '#766852', fontSize: 8, letterSpacing: 1.2, fontWeight: '900' }, holderName: { color: colors.black, fontWeight: '800', marginTop: 4 },
  selector: { flexDirection: 'row', justifyContent: 'center', gap: 9, marginTop: 18 }, dot: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }, dotActive: { backgroundColor: colors.champagne }, dotText: { color: colors.black, fontWeight: '900' }, security: { color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 18 },
});
