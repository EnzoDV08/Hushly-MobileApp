import React, { useEffect, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View, Pressable
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useHeaderHeight } from '@react-navigation/elements';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { registerUser } from '../services/authService';

export default function SignUpForm({ onSwitchToLogin, onSignedUp, navigation }: any) {
  const headerHeight = useHeaderHeight();

  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [agree, setAgree]       = useState(false);
  const [busy, setBusy]         = useState(false);

  const strength = (() => {
    let s = 0;
    if (password.length >= 6) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    if (s <= 1) return 0.25;
    if (s === 2) return 0.5;
    return 1;
  })();

  const bar = useSharedValue(0);
  useEffect(() => { bar.value = withTiming(strength, { duration: 250 }); }, [strength]);
  const barStyle = useAnimatedStyle(() => {
    const pct = bar.value;
    const widthPct = pct === 0 ? 0 : pct === 0.25 ? 0.25 : pct === 0.5 ? 0.5 : 1;
    const backgroundColor = pct === 1 ? '#16A34A' : pct === 0.5 ? '#F59E0B' : '#EF4444';
    return { width: `${widthPct * 100}%`, backgroundColor };
  });

  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const passwordsMatch = password.length > 0 && password === confirm;
  const canSubmit = username.trim().length >= 2 && emailValid && passwordsMatch && agree && !busy;

  const onSignup = async () => {
    if (!canSubmit) {
      const msg =
        !username.trim() ? 'Please enter a username' :
        !emailValid ? 'Please enter a valid email' :
        !passwordsMatch ? 'Passwords do not match' :
        !agree ? 'You must agree to the Terms & Conditions' :
        'Please complete the form';
      return Alert.alert('Check your details', msg);
    }
    try {
      setBusy(true);
      await registerUser(email.trim(), password, username.trim());
      onSignedUp();
    } catch (e: any) {
      Alert.alert('Sign up failed', e?.message ?? 'Please try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#141D2A' }}>
      <StatusBar style="light" translucent />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={headerHeight}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" bounces={false}>
          <Text style={styles.title}>Create your account</Text>

          <TextInput style={styles.input} placeholder="Username" placeholderTextColor="#9CA3AF"
            value={username} onChangeText={setUsername} autoCapitalize="words" returnKeyType="next" />
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#9CA3AF"
            value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" returnKeyType="next" />

          <View style={{ marginBottom: 12 }}>
            <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#9CA3AF"
              value={password} onChangeText={setPassword} secureTextEntry returnKeyType="next" />
            <View style={styles.strengthTrack}><Animated.View style={[styles.strengthFill, barStyle]} /></View>
            <View style={styles.strengthLabels}>
              <Text style={styles.strengthText}>Weak</Text>
              <Text style={styles.strengthText}>Average</Text>
              <Text style={styles.strengthText}>Strong</Text>
            </View>
          </View>

          <TextInput style={styles.input} placeholder="Confirm password" placeholderTextColor="#9CA3AF"
            value={confirm} onChangeText={setConfirm} secureTextEntry returnKeyType="done" />

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.linkAccent}>Forgot password?</Text>
          </TouchableOpacity>

          <Pressable style={styles.tcRow} onPress={() => setAgree(v => !v)}>
            <View style={[styles.checkbox, agree && styles.checkboxChecked]}>
              {agree ? <Text style={styles.checkboxTick}>✓</Text> : null}
            </View>
            <Text style={styles.tcText}>I agree to the <Text style={styles.linkAccent}>Terms & Conditions</Text></Text>
          </Pressable>

          <TouchableOpacity style={[styles.primaryBtn, !canSubmit && { opacity: 0.6 }]} onPress={onSignup} disabled={!canSubmit}>
            <Text style={styles.primaryText}>{busy ? 'Creating…' : 'Sign up'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onSwitchToLogin}>
            <Text style={styles.link}>I already have an account — Sign in</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 24,
    flexGrow: 1,
    justifyContent: 'center' 
    },
  title: { color: 'white', 
    fontSize: 24, fontWeight: '800', 
    marginBottom: 18, 
    textAlign: 'center' 
  },
  input: {
    backgroundColor: '#1F2937', 
    color: 'white', 
    borderRadius: 14, 
    paddingHorizontal: 14,
    paddingVertical: 14, 
    marginBottom: 12, 
    borderWidth: 1, 
    borderColor: '#374151',
  },
  strengthTrack: { 
    height: 10, 
    backgroundColor: '#E5E7EB', 
    borderRadius: 999, 
    overflow: 'hidden', 
    marginTop: -2 
  },
  strengthFill: { 
    height: '100%',   
    borderRadius: 999 
  },
  strengthLabels: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 6, 
    paddingHorizontal: 4 
  },
  strengthText: { 
    fontSize: 11, 
    color: '#9CA3AF' 
  },
  linkAccent: { 
    color: '#7A00FF',
    fontWeight: '700',
    textAlign: 'right', 
    marginBottom: 12 
  },
  tcRow: { 
    flexDirection: 'row',
    alignItems: 'center', 
    marginBottom: 12 
  },
  checkbox: { 
    width: 20, 
    height: 20, 
    borderRadius: 5, 
    borderWidth: 2, 
    borderColor: '#D1D5DB', 
    marginRight: 10, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: 'white' 
  },
  checkboxChecked: { 
    backgroundColor: '#7A00FF', 
    borderColor: '#7A00FF' 
  },
  checkboxTick: { 
    color: 'white', 
    fontWeight: '900', 
    lineHeight: 18 
  },
  tcText: { 
    color: '#E5E7EB' 
  },
  primaryBtn: { 
    backgroundColor: '#7A00FF', 
    borderRadius: 16, 
    paddingVertical: 16, 
    alignItems: 'center', 
    marginTop: 8 
  },
  primaryText: { 
    color: 'white', 
    fontWeight: '800', 
    fontSize: 16 
  },
  link: { color: '#C084FC',
     textAlign: 'center', 
     marginTop: 14, 
     fontWeight: '700' 
  },
});
