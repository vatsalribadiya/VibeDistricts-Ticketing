import React, { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { AdminEventsScreen } from './AdminEventsScreen';
import { AdminUsersScreen } from './AdminUsersScreen';

export function AdminDashboardScreen() {
  const [section, setSection] = useState<'events' | 'people'>('events');
  return <SafeAreaView style={styles.root}><View style={styles.switcher}>{(['events', 'people'] as const).map(item => <Pressable key={item} onPress={() => setSection(item)} style={[styles.button, section === item && styles.active]}><Text style={[styles.text, section === item && styles.activeText]}>{item.toUpperCase()}</Text></Pressable>)}</View><View style={styles.body}>{section === 'events' ? <AdminEventsScreen /> : <AdminUsersScreen />}</View></SafeAreaView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, switcher: { flexDirection: 'row', marginHorizontal: 20, marginTop: 8, padding: 4, backgroundColor: colors.surface, borderRadius: 13, borderWidth: 1, borderColor: colors.border }, button: { flex: 1, alignItems: 'center', padding: 9, borderRadius: 9 }, active: { backgroundColor: colors.champagne }, text: { color: colors.muted, fontSize: 9, fontWeight: '900' }, activeText: { color: colors.black }, body: { flex: 1 } });
