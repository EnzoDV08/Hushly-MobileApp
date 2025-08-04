import React, { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useHeaderHeight } from '@react-navigation/elements';
import { loginUser } from '../services/authService';

export default function SignInForm({ onSwitchToSignup, onSignedIn, navigation }: any) {
  const headerHeight = useHeaderHeight();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const canSubmit = emailValid && password.length > 0 && !busy;

  const onLogin = async () => {
    if (!canSubmit) {
      return Alert.alert('Check your details', !emailValid ? 'Enter a valid email' : 'Enter your password');
    }
    try {
      setBusy(true);
      await loginUser(email.trim(), password);
      onSignedIn();
    } catch (e: any) {
      Alert.alert('Sign in failed', e?.message ?? 'Please try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#141D2A' }}>
      <StatusBar style="light" translucent />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={headerHeight}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" bounces={false}>
          <Text style={styles.title}>Welcome back</Text>

          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#9CA3AF"
            value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" returnKeyType="next" />
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#9CA3AF"
            value={password} onChangeText={setPassword} secureTextEntry returnKeyType="done" />

          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.linkAccent}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.primaryBtn, !canSubmit && { opacity: 0.6 }]} onPress={onLogin} disabled={!canSubmit}>
            <Text style={styles.primaryText}>{busy ? 'Signing in…' : 'Sign in'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onSwitchToSignup}>
            <Text style={styles.link}>Don’t have an account — Sign up</Text>
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
  title: { 
    color: 'white', 
    fontSize: 24, 
    fontWeight: '800', 
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
  linkAccent: { 
    color: '#7A00FF', 
    fontWeight: '700', 
    textAlign: 'right', 
    marginBottom: 12 
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
  link: { 
    color: '#C084FC', 
    textAlign: 'center',
     marginTop: 14, 
     fontWeight: '700' 
    },
});
