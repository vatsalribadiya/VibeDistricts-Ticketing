import React, { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

export function PrimaryButton({
  children,
  onPress,
  disabled,
  style,
}: PropsWithChildren<{ onPress: () => void; disabled?: boolean; style?: ViewStyle }>) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.primary, disabled && styles.disabled, pressed && styles.pressed, style]}
    >
      <Text style={styles.primaryText}>{children}</Text>
    </Pressable>
  );
}

export function TextButton({ children, onPress }: PropsWithChildren<{ onPress: () => void }>) {
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <Text style={styles.textButton}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    minHeight: 54,
    borderRadius: 16,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.champagne,
  },
  primaryText: { color: colors.black, fontSize: 15, fontWeight: '800', letterSpacing: 0.4 },
  disabled: { opacity: 0.38 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  textButton: { color: colors.champagneBright, fontSize: 14, fontWeight: '700' },
});
