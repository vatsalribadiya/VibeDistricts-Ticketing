import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Brand } from '../components/Brand';
import { PrimaryButton } from '../components/Buttons';
import { useAppState } from '../state/AppContext';
import { colors } from '../theme/colors';

export function OnboardingScreen() {
  const { finishOnboarding } = useAppState();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const continueToApp = () => {
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanName || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      Alert.alert('Complete your profile', 'Enter your full name and a valid email address.');
      return;
    }
    finishOnboarding({ fullName: cleanName, email: cleanEmail });
  };
  return (
    <LinearGradient colors={['#24170D', colors.background, colors.background]} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <Brand />
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>WASHINGTON, DC · FOUNDING MARKET</Text>
            <Text style={styles.title}>The city opens up when you belong.</Text>
            <Text style={styles.body}>
              One membership. Curated Bollywood experiences. Reserve included admission directly from your phone.
            </Text>
          </View>
          <View style={styles.benefits}>
            <Benefit number="24" title="events each year" caption="Included with the annual membership" />
            <Benefit number="01" title="secure member pass" caption="Your reservation and entry in one place" />
            <Benefit number="DC" title="pilot access" caption="Designed for the District and DMV" />
          </View>
          <View style={styles.form}>
            <Text style={styles.formLabel}>CREATE YOUR MEMBER PROFILE</Text>
            <TextInput
              accessibilityLabel="Full name"
              autoCapitalize="words"
              autoComplete="name"
              onChangeText={setFullName}
              placeholder="Full name"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={fullName}
            />
            <TextInput
              accessibilityLabel="Email address"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={colors.muted}
              style={styles.input}
              value={email}
            />
          </View>
          <PrimaryButton onPress={continueToApp}>EXPLORE MEMBERSHIP</PrimaryButton>
          <Text style={styles.legal}>Reservations are capacity-controlled. Venue age, entry and dress-code policies apply.</Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function Benefit({ number, title, caption }: { number: string; title: string; caption: string }) {
  return (
    <View style={styles.benefit}>
      <Text style={styles.number}>{number}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.caption}>{caption}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 28 },
  hero: { marginTop: 70, marginBottom: 44 },
  eyebrow: { color: colors.champagne, fontSize: 10, fontWeight: '800', letterSpacing: 2.1, marginBottom: 14 },
  title: { color: colors.cream, fontSize: 47, lineHeight: 51, fontWeight: '800', letterSpacing: -1.6 },
  body: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 20, maxWidth: 340 },
  benefits: { gap: 22, marginBottom: 32 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  number: { width: 48, color: colors.champagneBright, fontSize: 24, fontWeight: '300' },
  benefitTitle: { color: colors.cream, fontSize: 15, fontWeight: '700' },
  caption: { color: colors.muted, fontSize: 12, marginTop: 3 },
  form: { gap: 10, marginBottom: 16 },
  formLabel: { color: colors.champagne, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  input: { minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.cream, paddingHorizontal: 16, fontSize: 15 },
  legal: { color: '#756E67', textAlign: 'center', fontSize: 10, lineHeight: 15, marginTop: 16, paddingHorizontal: 14 },
});
