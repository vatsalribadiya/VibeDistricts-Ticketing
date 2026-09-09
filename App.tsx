import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { EventDetailScreen } from './src/screens/EventDetailScreen';
import { EventsScreen } from './src/screens/EventsScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { MembershipScreen } from './src/screens/MembershipScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { PassScreen } from './src/screens/PassScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { TicketsScreen } from './src/screens/TicketsScreen';
import { AppStateProvider, useAppState } from './src/state/AppContext';
import { colors } from './src/theme/colors';
import { EventItem, TabKey } from './src/types';

export default function App() {
  return (
    <AppStateProvider>
      <StatusBar style="light" />
      <AppShell />
    </AppStateProvider>
  );
}

function AppShell() {
  const { hasOnboarded, profile } = useAppState();
  const [tab, setTab] = useState<TabKey>('home');
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  if (!hasOnboarded || !profile) return <OnboardingScreen />;

  return (
    <View style={styles.root}>
      {tab === 'home' && <HomeScreen onJoin={() => setMembershipOpen(true)} onEvent={setSelectedEvent} />}
      {tab === 'events' && <EventsScreen onEvent={setSelectedEvent} />}
      {tab === 'pass' && <PassScreen onJoin={() => setMembershipOpen(true)} />}
      {tab === 'tickets' && <TicketsScreen />}
      {tab === 'profile' && <ProfileScreen onOpenScanner={() => setScannerOpen(true)} />}
      <TabBar selected={tab} onSelect={setTab} />
      <MembershipScreen visible={membershipOpen} onClose={() => setMembershipOpen(false)} />
      <EventDetailScreen event={selectedEvent} onClose={() => setSelectedEvent(null)} onJoin={() => setMembershipOpen(true)} />
      <ScannerScreen visible={scannerOpen} onClose={() => setScannerOpen(false)} />
    </View>
  );
}

const tabs: { key: TabKey; label: string; active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'home', label: 'Home', active: 'home', inactive: 'home-outline' },
  { key: 'events', label: 'Events', active: 'calendar', inactive: 'calendar-outline' },
  { key: 'pass', label: 'Member Pass', active: 'qr-code', inactive: 'qr-code-outline' },
  { key: 'tickets', label: 'My Tickets', active: 'ticket', inactive: 'ticket-outline' },
  { key: 'profile', label: 'Profile', active: 'person', inactive: 'person-outline' },
];

function TabBar({ selected, onSelect }: { selected: TabKey; onSelect: (tab: TabKey) => void }) {
  return (
    <View style={styles.tabBar}>
      {tabs.map(tab => {
        const active = selected === tab.key;
        return (
          <Pressable key={tab.key} onPress={() => onSelect(tab.key)} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: active }}>
            <Ionicons name={active ? tab.active : tab.inactive} size={22} color={active ? colors.champagneBright : colors.muted} />
            <Text style={[styles.tabLabel, active && styles.activeTabLabel]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  tabBar: {
    position: 'absolute', left: 14, right: 14, bottom: Platform.OS === 'ios' ? 20 : 12,
    height: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: 'rgba(25,22,18,0.97)', borderWidth: 1, borderColor: colors.border, borderRadius: 23,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
  tabLabel: { color: colors.muted, fontSize: 9, fontWeight: '700' },
  activeTabLabel: { color: colors.champagneBright },
});
