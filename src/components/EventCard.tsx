import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { EventItem } from '../types';

export function EventCard({ event, reserved, onPress }: { event: EventItem; reserved: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.84 }]}>
      <LinearGradient colors={[event.accent, '#15110E']} style={styles.art}>
        <View style={styles.topRow}>
          <Text style={styles.date}>{event.displayDate}</Text>
          <View style={[styles.badge, event.tier === 'premium' && styles.premiumBadge]}>
            <Text style={styles.badgeText}>{event.tier === 'included' ? 'MEMBER INCLUDED' : 'PREMIUM'}</Text>
          </View>
        </View>
        <View>
          <Text style={styles.kicker}>{event.subtitle.toUpperCase()}</Text>
          <Text style={styles.title}>{event.title}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.cream} />
            <Text style={styles.venue}>{event.venue}</Text>
          </View>
        </View>
      </LinearGradient>
      <View style={styles.footer}>
        <Text style={styles.spots}>
          {reserved ? 'Reservation confirmed' : event.tier === 'included' ? `${event.memberSpotsRemaining} member spots left` : 'Member upgrade available'}
        </Text>
        <Ionicons name={reserved ? 'checkmark-circle' : 'arrow-forward-circle'} size={22} color={reserved ? colors.success : colors.champagne} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, overflow: 'hidden', backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  art: { minHeight: 235, padding: 20, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { color: colors.cream, fontSize: 12, fontWeight: '800', letterSpacing: 1.4 },
  badge: { backgroundColor: colors.champagne, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 99 },
  premiumBadge: { backgroundColor: 'rgba(8,7,6,0.72)', borderWidth: 1, borderColor: colors.champagne },
  badgeText: { color: colors.black, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  kicker: { color: colors.champagneBright, fontSize: 10, fontWeight: '800', letterSpacing: 1.8, marginBottom: 7 },
  title: { color: colors.white, fontSize: 34, lineHeight: 38, fontWeight: '800', maxWidth: '92%' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 13 },
  venue: { color: colors.cream, fontSize: 13, fontWeight: '600' },
  footer: { paddingHorizontal: 18, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  spots: { color: colors.muted, fontSize: 12, fontWeight: '600' },
});
