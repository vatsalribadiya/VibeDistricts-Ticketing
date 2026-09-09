import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Brand } from '../components/Brand';
import { PrimaryButton, TextButton } from '../components/Buttons';
import { useAuth } from '../state/AuthContext';
import { colors } from '../theme/colors';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || password.length < 8 || (mode === 'signUp' && fullName.trim().length < 2)) {
      Alert.alert('Check your details', 'Enter a valid email, a password of at least 8 characters, and your full name when creating an account.');
      return;
    }
    setSubmitting(true);
    try {
      const result = mode === 'signIn' ? await signIn(email, password) : await signUp(fullName, email, password);
      if (!result.ok || result.requiresEmailConfirmation) Alert.alert(result.ok ? 'Confirm your email' : 'Unable to continue', result.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={['#24170D', colors.background, colors.background]} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safe}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Brand />
            <View style={styles.hero}>
              <Text style={styles.eyebrow}>WASHINGTON DC AND THE DMV</Text>
              <Text style={styles.title}>{mode === 'signIn' ? 'Welcome back.' : 'Join the district.'}</Text>
              <Text style={styles.body}>{mode === 'signIn' ? 'Sign in to access your membership, reservations, and tickets.' : 'Create your secure Vibe Districts customer account.'}</Text>
            </View>
            <View style={styles.form}>
              {mode === 'signUp' && <TextInput autoCapitalize="words" autoComplete="name" onChangeText={setFullName} placeholder="Full name" placeholderTextColor={colors.muted} style={styles.input} value={fullName} />}
              <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="Email address" placeholderTextColor={colors.muted} style={styles.input} value={email} />
              <TextInput autoCapitalize="none" autoComplete="password" onChangeText={setPassword} placeholder="Password" placeholderTextColor={colors.muted} secureTextEntry style={styles.input} value={password} />
              <PrimaryButton disabled={submitting} onPress={submit}>{submitting ? <ActivityIndicator color={colors.black} /> : mode === 'signIn' ? 'SIGN IN' : 'CREATE ACCOUNT'}</PrimaryButton>
            </View>
            <View style={styles.switchRow}><Text style={styles.switchText}>{mode === 'signIn' ? 'New to Vibe Districts?' : 'Already have an account?'}</Text><TextButton onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}>{mode === 'signIn' ? 'Create account' : 'Sign in'}</TextButton></View>
            <Text style={styles.legal}>By continuing, you agree to the membership, event-entry, privacy, and refund policies.</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

export function SupabaseConfigurationScreen() {
  return <SafeAreaView style={styles.configuration}><Brand /><Text style={styles.configurationTitle}>Configuration required</Text><Text style={styles.body}>Add the Supabase URL and publishable key to .env.local, then restart Expo with the clear-cache option.</Text></SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 }, safe: { flex: 1 }, content: { flexGrow: 1, padding: 24, paddingTop: 30, justifyContent: 'center' },
  hero: { marginTop: 58, marginBottom: 28 }, eyebrow: { color: colors.champagne, fontSize: 10, fontWeight: '900', letterSpacing: 2 }, title: { color: colors.cream, fontSize: 46, fontWeight: '900', marginTop: 12 }, body: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 12 },
  form: { gap: 12 }, input: { minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, color: colors.cream, paddingHorizontal: 16, fontSize: 15 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 22 }, switchText: { color: colors.muted, fontSize: 14 }, legal: { color: '#756E67', textAlign: 'center', fontSize: 10, lineHeight: 15, marginTop: 26 },
  configuration: { flex: 1, backgroundColor: colors.background, padding: 24, justifyContent: 'center' }, configurationTitle: { color: colors.cream, fontSize: 30, fontWeight: '900', marginTop: 40 },
});
