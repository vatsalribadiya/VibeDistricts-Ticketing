import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { PrimaryButton } from '../components/Buttons';
import { emptyStaffPermissions, listManagedUsers, ManagedUser, saveStaffPermissions, setManagedUserActive, setManagedUserRole } from '../services/admin';
import { useAuth } from '../state/AuthContext';
import { colors } from '../theme/colors';
import { StaffPermissions } from '../types';

const permissionRows: { key: keyof StaffPermissions; label: string; description: string }[] = [
  { key: 'canViewEvents', label: 'View operations', description: 'View draft and assigned event operations' },
  { key: 'canCreateEvents', label: 'Create events', description: 'Create new draft events' },
  { key: 'canEditEvents', label: 'Edit events', description: 'Change assigned event details' },
  { key: 'canDeleteEvents', label: 'Delete events', description: 'Permanently delete assigned events' },
  { key: 'canPublishEvents', label: 'Publish events', description: 'Make assigned events visible to customers' },
  { key: 'canManageInventory', label: 'Manage inventory', description: 'Change ticket and member capacity' },
  { key: 'canViewGuestList', label: 'View guest lists', description: 'See reservations for assigned events' },
  { key: 'canScanTickets', label: 'Scan tickets', description: 'Use the venue check-in scanner' },
  { key: 'canIssueRefunds', label: 'Issue refunds', description: 'Approve customer refunds' },
  { key: 'scopeAllEvents', label: 'Access all events', description: 'Otherwise access requires event assignment' },
];

export function AdminUsersScreen() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<StaffPermissions>(emptyStaffPermissions);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await listManagedUsers();
      setUsers(next);
      const selected = next.find(user => user.id === selectedId);
      if (selected?.role === 'staff') setDraftPermissions(selected.permissions ?? emptyStaffPermissions);
    } catch (error) {
      Alert.alert('Unable to load accounts', error instanceof Error ? error.message : 'Try again.');
    } finally { setLoading(false); }
  }, [selectedId]);

  useEffect(() => { void load(); }, [load]);
  const selected = users.find(user => user.id === selectedId) ?? null;

  const select = (user: ManagedUser) => {
    setSelectedId(user.id);
    setDraftPermissions(user.permissions ?? emptyStaffPermissions);
  };

  const run = async (action: () => Promise<void>, success: string) => {
    setSaving(true);
    try { await action(); await load(); Alert.alert('Updated', success); }
    catch (error) { Alert.alert('Unable to update account', error instanceof Error ? error.message : 'Try again.'); }
    finally { setSaving(false); }
  };

  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.champagne} size="large" /></View>;
  return <SafeAreaView style={styles.root}><ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={colors.champagne} />} contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>ADMINISTRATION</Text><Text style={styles.title}>People and access</Text>
    <Text style={styles.intro}>New accounts begin as customers. Select an account to assign staff access and exact operational permissions.</Text>
    <View style={styles.summary}><Summary value={users.length} label="Accounts" /><Summary value={users.filter(user => user.role === 'staff').length} label="Staff" /><Summary value={users.filter(user => !user.isActive).length} label="Suspended" /></View>
    <Text style={styles.sectionLabel}>ACCOUNTS</Text>
    <View style={styles.list}>{users.map(user => <Pressable key={user.id} onPress={() => select(user)} style={[styles.userRow, selectedId === user.id && styles.userRowSelected]}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{(user.fullName || user.email).slice(0, 1).toUpperCase()}</Text></View>
      <View style={styles.userCopy}><Text numberOfLines={1} style={styles.userName}>{user.fullName || 'Unnamed account'}</Text><Text numberOfLines={1} style={styles.userEmail}>{user.email}</Text></View>
      <View style={[styles.badge, !user.isActive && styles.badgeInactive]}><Text style={styles.badgeText}>{user.isActive ? user.role : 'suspended'}</Text></View>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>)}</View>
    {selected && <View style={styles.editor}>
      <Text style={styles.editorTitle}>{selected.fullName || selected.email}</Text><Text style={styles.editorEmail}>{selected.email}</Text>
      {selected.id === profile?.id ? <Text style={styles.notice}>Your owner account cannot be changed from this screen.</Text> : <>
        <Text style={styles.fieldLabel}>ACCOUNT ROLE</Text>
        <View style={styles.roleRow}>{(['customer', 'staff'] as const).map(role => <Pressable key={role} disabled={saving} onPress={() => void run(() => setManagedUserRole(selected.id, role, profile!.id), `${selected.email} is now ${role}.`)} style={[styles.roleButton, selected.role === role && styles.roleButtonActive]}><Text style={[styles.roleText, selected.role === role && styles.roleTextActive]}>{role.toUpperCase()}</Text></Pressable>)}</View>
        <View style={styles.activeRow}><View style={styles.activeCopy}><Text style={styles.permissionLabel}>Account active</Text><Text style={styles.permissionDescription}>Suspended accounts lose operational access</Text></View><Switch disabled={saving} onValueChange={value => void run(() => setManagedUserActive(selected.id, value), value ? 'Account activated.' : 'Account suspended.')} trackColor={{ false: '#403A34', true: '#8B7047' }} thumbColor={selected.isActive ? colors.champagneBright : colors.muted} value={selected.isActive} /></View>
        {selected.role === 'staff' && <>
          <Text style={styles.fieldLabel}>STAFF PERMISSIONS</Text>
          <View style={styles.permissions}>{permissionRows.map(item => <View key={item.key} style={styles.permissionRow}><View style={styles.permissionCopy}><Text style={styles.permissionLabel}>{item.label}</Text><Text style={styles.permissionDescription}>{item.description}</Text></View><Switch disabled={saving} onValueChange={value => setDraftPermissions(current => ({ ...current, [item.key]: value }))} trackColor={{ false: '#403A34', true: '#8B7047' }} thumbColor={draftPermissions[item.key] ? colors.champagneBright : colors.muted} value={draftPermissions[item.key]} /></View>)}</View>
          <PrimaryButton disabled={saving} onPress={() => void run(() => saveStaffPermissions(selected.id, draftPermissions, profile!.id), 'Staff permissions saved.')}>{saving ? 'SAVING' : 'SAVE PERMISSIONS'}</PrimaryButton>
        </>}
      </>}
    </View>}
  </ScrollView></SafeAreaView>;
}

function Summary({ value, label }: { value: number; label: string }) { return <View style={styles.summaryItem}><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 125 },
  eyebrow: { color: colors.champagne, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 22 }, title: { color: colors.cream, fontSize: 36, fontWeight: '900', marginTop: 8 }, intro: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 10 },
  summary: { flexDirection: 'row', gap: 8, marginVertical: 22 }, summaryItem: { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 14 }, summaryValue: { color: colors.champagneBright, fontSize: 23, fontWeight: '900' }, summaryLabel: { color: colors.muted, fontSize: 9, marginTop: 3 },
  sectionLabel: { color: colors.champagne, fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 9 }, list: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, overflow: 'hidden' }, userRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 }, userRowSelected: { backgroundColor: colors.surfaceRaised }, avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#2A2118', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.champagneBright, fontWeight: '900' }, userCopy: { flex: 1 }, userName: { color: colors.cream, fontSize: 13, fontWeight: '800' }, userEmail: { color: colors.muted, fontSize: 10, marginTop: 3 }, badge: { backgroundColor: '#263A2E', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 }, badgeInactive: { backgroundColor: '#4A2926' }, badgeText: { color: colors.cream, fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  editor: { marginTop: 18, padding: 17, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 20 }, editorTitle: { color: colors.cream, fontSize: 20, fontWeight: '900' }, editorEmail: { color: colors.muted, fontSize: 11, marginTop: 4 }, notice: { color: colors.champagneBright, lineHeight: 18, marginTop: 16 }, fieldLabel: { color: colors.champagne, fontSize: 9, fontWeight: '900', letterSpacing: 1.3, marginTop: 20, marginBottom: 9 }, roleRow: { flexDirection: 'row', gap: 8 }, roleButton: { flex: 1, padding: 12, borderRadius: 12, borderColor: colors.border, borderWidth: 1, alignItems: 'center' }, roleButtonActive: { backgroundColor: colors.champagne, borderColor: colors.champagne }, roleText: { color: colors.muted, fontSize: 10, fontWeight: '900' }, roleTextActive: { color: colors.black },
  activeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, activeCopy: { flex: 1 }, permissions: { marginBottom: 15 }, permissionRow: { flexDirection: 'row', alignItems: 'center', minHeight: 61, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, permissionCopy: { flex: 1, paddingRight: 10 }, permissionLabel: { color: colors.cream, fontSize: 13, fontWeight: '700' }, permissionDescription: { color: colors.muted, fontSize: 10, lineHeight: 14, marginTop: 2 },
});
