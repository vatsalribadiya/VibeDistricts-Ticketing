import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, Modal, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton, TextButton } from '../components/Buttons';
import { useAppState } from '../state/AppContext';
import { colors } from '../theme/colors';
import { EventItem } from '../types';
import { CheckoutScreen } from './CheckoutScreen';

export function EventDetailScreen({ event, onClose, onJoin }: { event: EventItem | null; onClose: () => void; onJoin: () => void }) {
  const { membership, reserve, reservationFor, cancelReservation } = useAppState();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  if (!event) return null;
  const reservation = reservationFor(event.id);
  const reserveNow = async () => {
    const result = await reserve(event);
    if (!result.ok && !membership.active) { onClose(); onJoin(); return; }
    Alert.alert(result.ok ? 'You’re on the list' : 'Reservation unavailable', result.message);
  };
  return (
    <Modal visible={Boolean(event)} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.root}>
        <LinearGradient colors={[event.accent, colors.background]} style={styles.hero}>
          <SafeAreaView>
            <View style={styles.nav}><TextButton onPress={onClose}>‹ Back</TextButton><Text style={styles.date}>{event.displayDate}</Text></View>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>{event.tier === 'included' ? 'MEMBER INCLUDED' : 'PREMIUM EXPERIENCE'}</Text>
              <Text style={styles.title}>{event.title}</Text>
              <Text style={styles.subtitle}>{event.subtitle}</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
        <ScrollView contentContainerStyle={styles.content}>
          <Info icon="location-outline" label="VENUE" value={`${event.venue}\n${event.city}`} />
          <Info icon="time-outline" label="TIME" value={event.time} />
          <Info icon="shirt-outline" label="DRESS CODE" value={event.dressCode} />
          <Info icon="id-card-outline" label="ADMISSION" value={`${event.age} · Government-issued ID required`} />
          <View style={styles.tags}>{event.tags.map(tag => <Text key={tag} style={styles.tag}>{tag}</Text>)}</View>
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={20} color={colors.champagne} />
            <Text style={styles.noticeText}>Membership does not guarantee entry. Reserve in advance and arrive within the member entry window.</Text>
          </View>
          {reservation ? (
            <>
              <View style={styles.confirmed}><Ionicons name="checkmark-circle" size={22} color={colors.success} /><Text style={styles.confirmedText}>MEMBER ADMISSION CONFIRMED</Text></View>
              <TextButton onPress={() => void cancelReservation(event.id).then(result => Alert.alert(result.ok ? 'Reservation cancelled' : 'Unable to cancel', result.message))}>Cancel reservation</TextButton>
            </>
          ) : (
            <PrimaryButton onPress={() => void reserveNow()}>{event.tier === 'premium' ? 'VIEW MEMBER UPGRADE' : 'RESERVE MEMBER ADMISSION'}</PrimaryButton>
          )}
          {event.ticketTypes.length > 0 && <>
            <View style={styles.salesDivider}><View style={styles.line} /><Text style={styles.or}>OR BUY A TICKET</Text><View style={styles.line} /></View>
            <View style={styles.salesCard}>
              <View><Text style={styles.salesTitle}>General tickets</Text><Text style={styles.salesFrom}>From ${Math.min(...event.ticketTypes.map(item => item.price)).toFixed(2)} + fees</Text></View>
              <Ionicons name="ticket-outline" size={25} color={colors.champagne} />
            </View>
            <PrimaryButton onPress={() => setCheckoutOpen(true)}>BUY TICKETS</PrimaryButton>
          </>}
        </ScrollView>
        <CheckoutScreen event={event} visible={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
      </View>
    </Modal>
  );
}

function Info({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return <View style={styles.info}><Ionicons name={icon} size={22} color={colors.champagne} /><View><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  hero: { minHeight: 380 },
  nav: { padding: 20, flexDirection: 'row', justifyContent: 'space-between' },
  date: { color: colors.cream, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  heroCopy: { paddingHorizontal: 22, paddingTop: 100 },
  eyebrow: { color: colors.champagneBright, fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: colors.white, fontSize: 46, lineHeight: 50, fontWeight: '900', marginTop: 11 },
  subtitle: { color: colors.cream, fontSize: 15, marginTop: 11 },
  content: { padding: 22, paddingBottom: 50, gap: 22 },
  info: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  infoLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  infoValue: { color: colors.cream, fontSize: 14, lineHeight: 21, fontWeight: '600', marginTop: 4 },
  tags: { flexDirection: 'row', gap: 8 },
  tag: { color: colors.champagneBright, borderWidth: 1, borderColor: colors.border, borderRadius: 99, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 8, fontSize: 10, fontWeight: '700' },
  notice: { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: colors.surface, borderRadius: 16 },
  noticeText: { color: colors.muted, fontSize: 12, lineHeight: 18, flex: 1 },
  confirmed: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: colors.success },
  confirmedText: { color: colors.success, fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  salesDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  line: { height: 1, flex: 1, backgroundColor: colors.border },
  or: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  salesCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, padding: 16 },
  salesTitle: { color: colors.cream, fontSize: 15, fontWeight: '800' },
  salesFrom: { color: colors.muted, fontSize: 11, marginTop: 4 },
});
