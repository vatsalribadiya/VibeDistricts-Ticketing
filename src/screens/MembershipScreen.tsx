import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton, TextButton } from '../components/Buttons';
import { useAppState } from '../state/AppContext';
import { colors } from '../theme/colors';
import { MembershipPlan } from '../types';

export function MembershipScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { activate } = useAppState();
  const [selected, setSelected] = useState<MembershipPlan>('annual');
  const [submitting, setSubmitting] = useState(false);
  const complete = async () => {
    setSubmitting(true);
    const result = await activate(selected);
    setSubmitting(false);
    if (!result.ok) {
      Alert.alert('Membership unavailable', result.message);
      return;
    }
    onClose();
    Alert.alert('Welcome to Vibe Districts', result.message);
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>FOUNDING MEMBER</Text>
            <TextButton onPress={onClose}>Close</TextButton>
          </View>
          <Text style={styles.title}>Choose how you join.</Text>
          <Text style={styles.subtitle}>Both plans unlock capacity-controlled member admission to selected DC events.</Text>
          <PlanCard
            selected={selected === 'annual'}
            title="Annual"
            price="$120"
            cadence="per year"
            saving="SAVE 33%"
            detail="24 event credits per membership year"
            onPress={() => setSelected('annual')}
          />
          <PlanCard
            selected={selected === 'monthly'}
            title="Monthly"
            price="$14.99"
            cadence="per month"
            detail="2 event credits per billing month"
            onPress={() => setSelected('monthly')}
          />
          <View style={styles.rules}>
            {['One admission per eligible event', 'Government ID must match member profile', 'Premium events may require an upgrade', 'Cancel before the event cutoff to restore a credit'].map(rule => (
              <View key={rule} style={styles.rule}>
                <Ionicons name="checkmark" size={16} color={colors.success} />
                <Text style={styles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>
          <PrimaryButton onPress={complete}>{submitting ? 'ACTIVATING…' : `START ${selected.toUpperCase()} MEMBERSHIP`}</PrimaryButton>
          <Text style={styles.demo}>Temporary test activation. Stripe checkout comes next.</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function PlanCard(props: { selected: boolean; title: string; price: string; cadence: string; saving?: string; detail: string; onPress: () => void }) {
  return (
    <View onTouchEnd={props.onPress} style={[styles.plan, props.selected && styles.selectedPlan]}>
      <View style={styles.planTop}>
        <View>
          <View style={styles.nameRow}>
            <Text style={styles.planTitle}>{props.title}</Text>
            {props.saving && <Text style={styles.saving}>{props.saving}</Text>}
          </View>
          <Text style={styles.detail}>{props.detail}</Text>
        </View>
        <View style={[styles.radio, props.selected && styles.radioSelected]}>{props.selected && <View style={styles.dot} />}</View>
      </View>
      <Text style={styles.price}>{props.price}<Text style={styles.cadence}> {props.cadence}</Text></Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: colors.champagne, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  title: { color: colors.cream, fontSize: 39, lineHeight: 43, fontWeight: '800', marginTop: 35 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 12, marginBottom: 28 },
  plan: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 20, marginBottom: 14 },
  selectedPlan: { borderColor: colors.champagne, backgroundColor: '#1B160F' },
  planTop: { flexDirection: 'row', justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planTitle: { color: colors.cream, fontSize: 20, fontWeight: '800' },
  saving: { color: colors.black, backgroundColor: colors.champagne, borderRadius: 99, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4, fontSize: 9, fontWeight: '900' },
  detail: { color: colors.muted, fontSize: 12, marginTop: 7 },
  price: { color: colors.champagneBright, fontSize: 32, fontWeight: '300', marginTop: 28 },
  cadence: { color: colors.muted, fontSize: 12, fontWeight: '500' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.champagne },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.champagne },
  rules: { gap: 14, marginVertical: 28 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ruleText: { color: colors.cream, fontSize: 13, flex: 1 },
  demo: { color: '#756E67', fontSize: 10, textAlign: 'center', marginTop: 14 },
});
