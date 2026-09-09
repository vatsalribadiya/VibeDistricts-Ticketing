import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={[styles.mark, compact && styles.compactMark]}>
        <Text style={[styles.monogram, compact && styles.compactMonogram]}>VD</Text>
      </View>
      <View>
        <Text style={[styles.name, compact && styles.compactName]}>VIBE DISTRICTS</Text>
        {!compact && <Text style={styles.tagline}>YOUR CITY. YOUR ACCESS.</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mark: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: colors.champagne,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactMark: { width: 34, height: 34, borderRadius: 17 },
  monogram: { color: colors.champagneBright, fontSize: 15, fontWeight: '800', letterSpacing: -1 },
  compactMonogram: { fontSize: 11 },
  name: { color: colors.cream, fontSize: 17, fontWeight: '700', letterSpacing: 2.4 },
  compactName: { fontSize: 13, letterSpacing: 1.8 },
  tagline: { color: colors.champagne, fontSize: 8, letterSpacing: 2.8, marginTop: 4 },
});
