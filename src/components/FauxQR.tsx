import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

function seededBits(seed: string, count: number) {
  let value = seed.split('').reduce((total, char) => total + char.charCodeAt(0), 97);
  return Array.from({ length: count }, () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280 > 0.48;
  });
}

export function FauxQR({ seed, size = 210 }: { seed: string; size?: number }) {
  const grid = 21;
  const bits = useMemo(() => seededBits(seed, grid * grid), [seed]);
  const cell = Math.floor(size / grid);
  return (
    <View accessibilityLabel="Demo admission QR code" style={[styles.frame, { width: cell * grid + 24, height: cell * grid + 24 }]}>
      <View style={{ width: cell * grid, height: cell * grid, flexDirection: 'row', flexWrap: 'wrap' }}>
        {bits.map((active, index) => (
          <View key={index} style={{ width: cell, height: cell, backgroundColor: active ? colors.black : colors.white }} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { backgroundColor: colors.white, borderRadius: 16, padding: 12, alignItems: 'center', justifyContent: 'center' },
});
