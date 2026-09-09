import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Brand } from '../components/Brand';
import { PrimaryButton } from '../components/Buttons';
import { EventCard } from '../components/EventCard';
import { EVENTS } from '../data/events';
import { useAppState } from '../state/AppContext';
import { colors } from '../theme/colors';
import { EventItem } from '../types';

export function HomeScreen({ onJoin, onEvent }: { onJoin: () => void; onEvent: (event: EventItem) => void }) {
  const { membership, reservationFor } = useAppState();
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Brand compact />
          <View style={styles.cityPill}>
            <Ionicons name="location" size={12} color={colors.champagne} />
            <Text style={styles.city}>DC</Text>
          </View>
        </View>
        <View style={styles.welcome}>
          <Text style={styles.eyebrow}>GOOD EVENING</Text>
          <Text style={styles.title}>Your night starts here.</Text>
        </View>
        {membership.active ? (
          <View style={styles.memberCard}>
            <View>
              <Text style={styles.memberLabel}>{membership.plan?.toUpperCase()} MEMBER · DC</Text>
              <Text style={styles.creditNumber}>{membership.creditsRemaining}</Text>
              <Text style={styles.creditLabel}>event credits remaining</Text>
            </View>
            <View style={styles.activePill}><View style={styles.greenDot} /><Text style={styles.activeText}>ACTIVE</Text></View>
          </View>
        ) : (
          <View style={styles.joinCard}>
            <Text style={styles.joinEyebrow}>DC FOUNDING MEMBERSHIP</Text>
            <Text style={styles.joinTitle}>Up to 24 curated events, included.</Text>
            <Text style={styles.joinBody}>$14.99 monthly or $120 annually. Reserve early—member inventory is limited.</Text>
            <PrimaryButton onPress={onJoin}>VIEW MEMBERSHIP</PrimaryButton>
          </View>
        )}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Next in the District</Text>
          <Text style={styles.sectionLink}>SEE ALL</Text>
        </View>
        <View style={styles.cards}>
          {EVENTS.slice(0, 3).map(event => (
            <EventCard key={event.id} event={event} reserved={Boolean(reservationFor(event.id))} onPress={() => onEvent(event)} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cityPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 99 },
  city: { color: colors.cream, fontSize: 11, fontWeight: '800' },
  welcome: { marginTop: 44, marginBottom: 25 },
  eyebrow: { color: colors.champagne, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.cream, fontSize: 38, fontWeight: '800', lineHeight: 42, marginTop: 8, letterSpacing: -1 },
  memberCard: { minHeight: 150, padding: 22, backgroundColor: '#1E1811', borderRadius: 22, borderWidth: 1, borderColor: colors.champagne, flexDirection: 'row', justifyContent: 'space-between' },
  memberLabel: { color: colors.champagne, fontSize: 10, letterSpacing: 1.3, fontWeight: '800' },
  creditNumber: { color: colors.cream, fontSize: 52, fontWeight: '200', marginTop: 12 },
  creditLabel: { color: colors.muted, fontSize: 12 },
  activePill: { flexDirection: 'row', gap: 6, alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#183426', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7 },
  greenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  activeText: { color: colors.success, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  joinCard: { padding: 22, backgroundColor: colors.surfaceRaised, borderRadius: 22, borderWidth: 1, borderColor: colors.border },
  joinEyebrow: { color: colors.champagne, fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  joinTitle: { color: colors.cream, fontSize: 24, lineHeight: 29, fontWeight: '800', marginTop: 12 },
  joinBody: { color: colors.muted, fontSize: 13, lineHeight: 20, marginVertical: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 37, marginBottom: 17 },
  sectionTitle: { color: colors.cream, fontSize: 20, fontWeight: '800' },
  sectionLink: { color: colors.champagne, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  cards: { gap: 18 },
});
