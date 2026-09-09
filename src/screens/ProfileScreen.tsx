import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton, TextButton } from '../components/Buttons';
import { useAppState } from '../state/AppContext';
import { colors } from '../theme/colors';
import { UserRole } from '../types';

export function ProfileScreen({ canOpenScanner, onOpenScanner, onSignOut, role }: { canOpenScanner: boolean; onOpenScanner: () => void; onSignOut: () => Promise<void>; role: UserRole }) {
  const { membership, profile, reservations, tickets, resetDemo } = useAppState();
  const initials = profile?.fullName.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'VD';
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>YOUR ACCOUNT</Text><Text style={styles.title}>Profile</Text>
        <View style={styles.person}><View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View><View style={styles.personCopy}><Text numberOfLines={1} style={styles.name}>{profile?.fullName ?? 'Vibe Districts Member'}</Text><Text numberOfLines={1} style={styles.email}>{profile?.email ?? 'member@vibedistricts.com'}</Text></View></View>
        <View style={styles.card}>
          <Row icon="location-outline" label="Home city" value={membership.homeCity} />
          <Row icon="diamond-outline" label="Membership" value={membership.active ? `${membership.plan} · Active` : 'Not active'} />
          <Row icon="calendar-outline" label="Reservations" value={String(reservations.filter(item => item.status === 'confirmed').length)} />
          <Row icon="ticket-outline" label="Paid tickets" value={String(tickets.length)} />
          <Row icon="shield-outline" label="Account role" value={role} />
        </View>
        {canOpenScanner && <View style={styles.operator}>
          <Text style={styles.operatorLabel}>PILOT OPERATIONS</Text>
          <Text style={styles.operatorTitle}>Door check-in</Text>
          <Text style={styles.operatorBody}>Scan paid-ticket QR codes and block duplicate entry. Protect this tool with staff authentication before launch.</Text>
          <PrimaryButton onPress={onOpenScanner}>OPEN SCANNER</PrimaryButton>
        </View>}
        <View style={styles.card}>
          <Row icon="notifications-outline" label="Notifications" value="Enabled" />
          <Row icon="shield-checkmark-outline" label="Membership terms" value="View" />
          <Row icon="help-circle-outline" label="Help & support" value="Contact" />
        </View>
        <View style={styles.reset}><TextButton onPress={() => Alert.alert('Sign out?', 'You can sign back in with your email and password.', [{ text: 'Stay signed in', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: () => void onSignOut() }])}>Sign out</TextButton></View>
        <View style={styles.reset}><TextButton onPress={() => Alert.alert('Reset demo data?', 'This clears local membership, reservations, and tickets but does not delete your account.', [{ text: 'Keep', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: resetDemo }])}>Reset local demo data</TextButton></View>
        <Text style={styles.version}>Vibe Districts · MVP 1.2.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return <View style={styles.row}><Ionicons name={icon} size={20} color={colors.champagne} /><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text><Ionicons name="chevron-forward" size={15} color={colors.muted} /></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 120 },
  eyebrow: { color: colors.champagne, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: 22 },
  title: { color: colors.cream, fontSize: 38, fontWeight: '800', marginTop: 8 },
  person: { flexDirection: 'row', gap: 15, alignItems: 'center', marginVertical: 28 },
  personCopy: { flex: 1 },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.champagne, alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.black, fontSize: 18, fontWeight: '900' },
  name: { color: colors.cream, fontSize: 18, fontWeight: '800' },
  email: { color: colors.muted, fontSize: 12, marginTop: 4 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 16, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 59, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: 11 },
  rowLabel: { color: colors.cream, fontSize: 13, flex: 1 },
  rowValue: { color: colors.muted, fontSize: 11, textTransform: 'capitalize' },
  reset: { alignItems: 'center', marginTop: 18 },
  version: { color: '#635E58', fontSize: 10, textAlign: 'center', marginTop: 25 },
  operator: { backgroundColor: '#1E1811', borderWidth: 1, borderColor: colors.champagne, borderRadius: 20, padding: 18, gap: 10, marginBottom: 16 },
  operatorLabel: { color: colors.champagne, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  operatorTitle: { color: colors.cream, fontSize: 20, fontWeight: '900' },
  operatorBody: { color: colors.muted, fontSize: 11, lineHeight: 16, marginBottom: 5 },
});
