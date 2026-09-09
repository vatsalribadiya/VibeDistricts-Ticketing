import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EventCard } from '../components/EventCard';
import { useAppState } from '../state/AppContext';
import { useEvents } from '../state/EventsContext';
import { colors } from '../theme/colors';
import { EventItem } from '../types';

export function EventsScreen({ onEvent }: { onEvent: (event: EventItem) => void }) {
  const [filter, setFilter] = useState<'all' | 'included' | 'premium'>('all');
  const { reservationFor } = useAppState();
  const { events } = useEvents();
  const visible = events.filter(event => filter === 'all' || event.tier === filter);
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>WASHINGTON, DC</Text>
        <Text style={styles.title}>Explore events</Text>
        <View style={styles.filters}>
          {(['all', 'included', 'premium'] as const).map(item => (
            <Text key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.selectedFilter]}>
              {item.toUpperCase()}
            </Text>
          ))}
        </View>
        <View style={styles.cards}>
          {visible.map(event => <EventCard key={event.id} event={event} reserved={Boolean(reservationFor(event.id))} onPress={() => onEvent(event)} />)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 120 },
  eyebrow: { color: colors.champagne, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: 22 },
  title: { color: colors.cream, fontSize: 38, fontWeight: '800', marginTop: 8 },
  filters: { flexDirection: 'row', gap: 9, marginVertical: 24 },
  filter: { color: colors.muted, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 99, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 9, fontSize: 10, fontWeight: '800' },
  selectedFilter: { color: colors.black, backgroundColor: colors.champagne, borderColor: colors.champagne },
  cards: { gap: 18 },
});
