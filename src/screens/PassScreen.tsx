import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { PrimaryButton } from '../components/Buttons';
import { useAppState } from '../state/AppContext';
import { useEvents } from '../state/EventsContext';
import { colors } from '../theme/colors';

export function PassScreen({ onJoin }: { onJoin: () => void }) {
  const { membership, profile, reservations } = useAppState();
  const { events } = useEvents();
  const activePass = reservations
    .filter(item => item.status === 'confirmed')
    .map(reservation => ({ reservation, event: events.find(item => item.id === reservation.eventId) }))
    .find(item => item.event);
  const nextReservation = activePass?.reservation;
  const event = activePass?.event;
  const history = reservations
    .map(reservation => ({ reservation, event: events.find(item => item.id === reservation.eventId) }))
    .filter(item => item.event);
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>DIGITAL ACCESS</Text>
        <Text style={styles.title}>Member pass</Text>
        {!membership.active ? (
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={38} color={colors.champagne} />
            <Text style={styles.emptyTitle}>Membership required</Text>
            <Text style={styles.emptyBody}>Activate a DC membership to unlock your digital membership card and event admission passes.</Text>
            <PrimaryButton onPress={onJoin}>VIEW MEMBERSHIP</PrimaryButton>
          </View>
        ) : event && nextReservation ? (
          <View style={styles.pass}>
            <View style={styles.passHeader}><Text style={styles.passBrand}>VIBE DISTRICTS</Text><Text style={styles.passCity}>DC · ACTIVE</Text></View>
            <Text style={styles.passLabel}>UPCOMING ADMISSION</Text>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventMeta}>{event.displayDate} · {event.venue}</Text>
            <View style={styles.qrWrap}><QRCode value={`VDM1|${nextReservation.eventId}|${nextReservation.admissionToken}`} size={210} backgroundColor="#FFFFFF" color="#080706" /></View>
            <Text style={styles.code}>{nextReservation.confirmationCode}</Text>
            <Text style={styles.security}>Secure member admission · Do not share this pass</Text>
            <View style={styles.nameRow}><View style={styles.memberName}><Text style={styles.nameLabel}>MEMBER</Text><Text numberOfLines={1} style={styles.name}>{profile?.fullName ?? 'Vibe Districts Member'}</Text></View><View><Text style={styles.nameLabel}>PLAN</Text><Text style={styles.name}>{membership.plan}</Text></View></View>
          </View>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="qr-code-outline" size={38} color={colors.champagne} />
            <Text style={styles.emptyTitle}>No active event pass</Text>
            <Text style={styles.emptyBody}>Reserve an included event and your secure admission pass will appear here.</Text>
          </View>
        )}
        {membership.active && history.length > 0 && (
          <View style={styles.history}>
            <Text style={styles.historyTitle}>Reservation history</Text>
            {history.map(({ reservation, event: historyEvent }) => (
              <View key={`${reservation.eventId}-${reservation.reservedAt}`} style={styles.historyRow}>
                <View style={styles.historyCopy}>
                  <Text numberOfLines={1} style={styles.historyEvent}>{historyEvent!.title}</Text>
                  <Text style={styles.historyMeta}>{historyEvent!.displayDate} · {reservation.confirmationCode}</Text>
                </View>
                <Text style={[styles.historyStatus, reservation.status === 'confirmed' && styles.confirmed]}>{reservation.status}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 120 },
  eyebrow: { color: colors.champagne, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: 22 },
  title: { color: colors.cream, fontSize: 38, fontWeight: '800', marginTop: 8, marginBottom: 28 },
  empty: { padding: 26, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 16 },
  emptyTitle: { color: colors.cream, fontSize: 22, fontWeight: '800' },
  emptyBody: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 8 },
  pass: { backgroundColor: '#E7D3AA', borderRadius: 26, padding: 22, overflow: 'hidden' },
  passHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  passBrand: { color: colors.black, fontSize: 13, fontWeight: '900', letterSpacing: 1.8 },
  passCity: { color: '#4F4639', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  passLabel: { color: '#635644', fontSize: 9, fontWeight: '900', letterSpacing: 1.4, marginTop: 34 },
  eventTitle: { color: colors.black, fontSize: 30, fontWeight: '900', marginTop: 6 },
  eventMeta: { color: '#635644', fontSize: 12, fontWeight: '600', marginTop: 7 },
  qrWrap: { alignItems: 'center', marginTop: 30 },
  code: { color: colors.black, fontSize: 13, letterSpacing: 3, fontWeight: '800', textAlign: 'center', marginTop: 17 },
  security: { color: '#766852', fontSize: 9, textAlign: 'center', marginTop: 8 },
  nameRow: { borderTopWidth: 1, borderTopColor: '#B9A47E', marginTop: 25, paddingTop: 17, flexDirection: 'row', justifyContent: 'space-between' },
  memberName: { flex: 1, paddingRight: 16 },
  nameLabel: { color: '#766852', fontSize: 8, letterSpacing: 1.2, fontWeight: '900' },
  name: { color: colors.black, fontSize: 12, fontWeight: '800', marginTop: 4, textTransform: 'capitalize' },
  history: { marginTop: 24, padding: 18, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  historyTitle: { color: colors.cream, fontSize: 17, fontWeight: '800', marginBottom: 8 },
  historyRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: 12 },
  historyCopy: { flex: 1 },
  historyEvent: { color: colors.cream, fontSize: 13, fontWeight: '700' },
  historyMeta: { color: colors.muted, fontSize: 9, marginTop: 5 },
  historyStatus: { color: colors.muted, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  confirmed: { color: colors.success },
});
