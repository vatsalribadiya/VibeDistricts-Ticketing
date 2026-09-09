import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton, TextButton } from '../components/Buttons';
import { useAppState } from '../state/AppContext';
import { colors } from '../theme/colors';
import { EventItem } from '../types';

export function CheckoutScreen({ event, visible, onClose }: { event: EventItem; visible: boolean; onClose: () => void }) {
  const { purchaseTickets } = useAppState();
  const [typeId, setTypeId] = useState(event.ticketTypes[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [processing, setProcessing] = useState(false);
  useEffect(() => { setTypeId(event.ticketTypes[0]?.id ?? ''); setQuantity(1); }, [event.id]);
  const selected = event.ticketTypes.find(item => item.id === typeId);
  const subtotal = (selected?.price ?? 0) * quantity;
  const fees = (selected?.serviceFee ?? 0) * quantity;
  const total = subtotal + fees;

  const pay = () => {
    setProcessing(true);
    setTimeout(() => {
      const result = purchaseTickets(event, typeId, quantity);
      setProcessing(false);
      Alert.alert(result.ok ? 'Purchase complete' : 'Purchase unavailable', result.ok ? `${result.message}\n\nYour QR ticket is ready in My Tickets.` : result.message, result.ok ? [{ text: 'View later', onPress: onClose }] : undefined);
    }, 650);
  };

  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <SafeAreaView style={styles.root}><ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}><Text style={styles.eyebrow}>SECURE CHECKOUT</Text><TextButton onPress={onClose}>Close</TextButton></View>
      <Text style={styles.title}>{event.title}</Text><Text style={styles.meta}>{event.displayDate} · {event.venue}</Text>
      <Text style={styles.section}>CHOOSE TICKET</Text>
      {event.ticketTypes.map(type => <Pressable key={type.id} onPress={() => setTypeId(type.id)} style={[styles.ticketType, type.id === typeId && styles.ticketSelected]}>
        <View style={styles.radio}>{type.id === typeId && <View style={styles.radioDot} />}</View>
        <View style={styles.ticketCopy}><Text style={styles.ticketName}>{type.name}</Text><Text style={styles.ticketDescription}>{type.description} · {type.quantityRemaining} left</Text></View>
        <Text style={styles.price}>${type.price.toFixed(2)}</Text>
      </Pressable>)}
      <View style={styles.quantity}><Text style={styles.quantityLabel}>Quantity</Text><View style={styles.stepper}>
        <Pressable accessibilityLabel="Decrease quantity" onPress={() => setQuantity(Math.max(1, quantity - 1))}><Ionicons name="remove-circle-outline" size={30} color={colors.champagne} /></Pressable>
        <Text style={styles.quantityValue}>{quantity}</Text>
        <Pressable accessibilityLabel="Increase quantity" onPress={() => setQuantity(Math.min(8, quantity + 1))}><Ionicons name="add-circle-outline" size={30} color={colors.champagne} /></Pressable>
      </View></View>
      <View style={styles.summary}><Line label="Tickets" value={`$${subtotal.toFixed(2)}`} /><Line label="Service fee" value={`$${fees.toFixed(2)}`} /><View style={styles.divider} /><Line label="Total" value={`$${total.toFixed(2)}`} strong /></View>
      <View style={styles.demo}><Ionicons name="flask-outline" size={18} color={colors.champagne} /><Text style={styles.demoText}>Pilot demo: this issues a real in-app QR ticket without charging a card. Connect Stripe before public sales.</Text></View>
      <PrimaryButton onPress={pay} disabled={!selected || processing}>{processing ? 'PROCESSING…' : `DEMO PAY $${total.toFixed(2)}`}</PrimaryButton>
    </ScrollView></SafeAreaView>
  </Modal>;
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <View style={styles.line}><Text style={[styles.lineText, strong && styles.strong]}>{label}</Text><Text style={[styles.lineText, strong && styles.strong]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background }, content: { padding: 22, paddingBottom: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: colors.champagne, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: colors.cream, fontSize: 32, fontWeight: '900', marginTop: 28 }, meta: { color: colors.muted, marginTop: 8 },
  section: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginTop: 34, marginBottom: 12 },
  ticketType: { minHeight: 82, borderWidth: 1, borderColor: colors.border, borderRadius: 18, marginBottom: 11, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  ticketSelected: { borderColor: colors.champagne, backgroundColor: colors.surface }, radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: colors.champagne, alignItems: 'center', justifyContent: 'center' }, radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.champagne },
  ticketCopy: { flex: 1 }, ticketName: { color: colors.cream, fontSize: 15, fontWeight: '800' }, ticketDescription: { color: colors.muted, fontSize: 10, marginTop: 5 }, price: { color: colors.champagneBright, fontWeight: '900' },
  quantity: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 24 }, quantityLabel: { color: colors.cream, fontWeight: '800' }, stepper: { flexDirection: 'row', alignItems: 'center', gap: 15 }, quantityValue: { color: colors.cream, fontSize: 18, fontWeight: '900', minWidth: 22, textAlign: 'center' },
  summary: { backgroundColor: colors.surface, borderRadius: 18, padding: 18, gap: 12 }, line: { flexDirection: 'row', justifyContent: 'space-between' }, lineText: { color: colors.muted, fontSize: 13 }, strong: { color: colors.cream, fontWeight: '900', fontSize: 16 }, divider: { height: 1, backgroundColor: colors.border },
  demo: { flexDirection: 'row', gap: 10, padding: 14, marginVertical: 18, borderRadius: 14, backgroundColor: '#201A12' }, demoText: { color: colors.muted, fontSize: 11, lineHeight: 16, flex: 1 },
});
