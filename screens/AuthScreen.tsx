// screens/AuthScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';
import { theme } from '../styles/theme';

export default function AuthScreen({ navigation }: any) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async () => {
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigation.replace('Main');
    } catch (err: any) {
      Alert.alert('Auth Error', err.message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => navigation.navigate('Onboarding')}>
          <Text style={styles.back}>← Back to Onboarding</Text>
        </TouchableOpacity>

        <Text style={styles.header}>
          {isLogin ? 'Login to Hushly' : 'Sign Up for Hushly'}
        </Text>

        <TextInput
          placeholder="Email"
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          placeholder="Password"
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Button title={isLogin ? 'Login' : 'Sign Up'} onPress={handleAuth} />

        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={styles.toggle}>
            {isLogin
              ? "Don't have an account? Sign up"
              : 'Already have an account? Login'}
          </Text>
        </TouchableOpacity>

        {/* ✅ Skip Login Button */}
        <TouchableOpacity onPress={() => navigation.replace('Main')}>
          <Text style={styles.skip}>Skip and Continue Without Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.large,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    flexGrow: 1,
  },
  back: {
    color: theme.colors.primary,
    marginBottom: theme.spacing.medium,
    textAlign: 'left',
    fontSize: 16,
  },
  header: {
    fontSize: theme.fontSize.large,
    textAlign: 'center',
    marginBottom: theme.spacing.large,
    color: theme.colors.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.grey,
    padding: theme.spacing.medium,
    marginBottom: theme.spacing.medium,
    borderRadius: 8,
    fontSize: theme.fontSize.medium,
  },
  toggle: {
    marginTop: theme.spacing.medium,
    textAlign: 'center',
    color: theme.colors.accent,
  },
  skip: {
    marginTop: theme.spacing.large,
    textAlign: 'center',
    color: theme.colors.grey,
    fontStyle: 'italic',
  },
});

