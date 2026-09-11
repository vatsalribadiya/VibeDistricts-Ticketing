import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useState } from 'react';
import { Modal, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton, TextButton } from '../components/Buttons';
import { checkInMemberPass } from '../services/events';
import { colors } from '../theme/colors';
import { CheckInResult } from '../types';

export function ScannerScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const scan = async (payload: string) => {
    if (locked) return;
    setLocked(true);
    try {
      setResult(await checkInMemberPass(payload));
    } catch (error) {
      setResult({ ok: false, title: 'Check-in unavailable', message: error instanceof Error ? error.message : 'The pass could not be verified.' });
    }
  };
  const next = () => { setResult(null); setLocked(false); };
  return <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}><SafeAreaView style={styles.root}>
    <View style={styles.header}><View><Text style={styles.eyebrow}>DOOR OPERATIONS</Text><Text style={styles.title}>Check-in scanner</Text></View><TextButton onPress={onClose}>Close</TextButton></View>
    {!permission?.granted ? <View style={styles.permission}><Text style={styles.permissionTitle}>Camera access required</Text><Text style={styles.body}>Allow camera access to scan Vibe Districts QR tickets.</Text><PrimaryButton onPress={requestPermission}>ALLOW CAMERA</PrimaryButton></View> :
      <View style={styles.cameraWrap}><CameraView style={styles.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={locked ? undefined : event => void scan(event.data)} /><View pointerEvents="none" style={styles.frame} /></View>}
    <Text style={styles.hint}>Align the guest’s QR code inside the frame.</Text>
    {result && <View style={[styles.result, result.ok ? styles.accept : styles.reject]}><Text style={styles.resultTitle}>{result.title}</Text><Text style={styles.resultBody}>{result.message}</Text><PrimaryButton onPress={next}>SCAN NEXT</PrimaryButton></View>}
  </SafeAreaView></Modal>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: 20 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }, eyebrow: { color: colors.champagne, fontSize: 9, fontWeight: '900', letterSpacing: 2 }, title: { color: colors.cream, fontSize: 28, fontWeight: '900', marginTop: 6 },
  permission: { marginTop: 50, padding: 24, borderRadius: 20, backgroundColor: colors.surface, gap: 16 }, permissionTitle: { color: colors.cream, fontSize: 20, fontWeight: '900' }, body: { color: colors.muted, lineHeight: 20 },
  cameraWrap: { height: 410, borderRadius: 24, overflow: 'hidden', marginTop: 28 }, camera: { flex: 1 }, frame: { position: 'absolute', width: 230, height: 230, borderWidth: 3, borderColor: colors.champagneBright, borderRadius: 20, alignSelf: 'center', top: 90 }, hint: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 14 },
  result: { position: 'absolute', left: 20, right: 20, bottom: 30, padding: 22, borderRadius: 22, borderWidth: 2 }, accept: { backgroundColor: '#123323', borderColor: colors.success }, reject: { backgroundColor: '#3A1715', borderColor: '#E27B72' }, resultTitle: { color: colors.cream, fontSize: 25, fontWeight: '900' }, resultBody: { color: colors.cream, marginVertical: 13 },
});
