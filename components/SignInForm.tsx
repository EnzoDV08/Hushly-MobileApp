import React, { useRef, useState, useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
  View,
  Pressable,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { Ionicons } from '@expo/vector-icons';
import { loginUser } from '../services/authService';
import { AuthErrorCodes, fetchSignInMethodsForEmail } from 'firebase/auth';
import { auth } from '../firebase/firebaseConfig';

export default function SignInForm({ onSwitchToSignup, onSignedIn }: any) {
  const headerHeight = useHeaderHeight();

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [emailKnown, setEmailKnown] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [providerHint, setProviderHint] = useState<string | null>(null);


  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [genericError, setGenericError] = useState<string | null>(null);

  const emailClean = email.trim().toLowerCase();
  const emailValid = /^\S+@\S+\.\S+$/.test(emailClean);

  const canSubmit = emailValid && password.length > 0 && !busy;

  useEffect(() => {
    setPasswordError(null);
    setGenericError(null);
    setProviderHint(null);
    setEmailKnown(null);

    if (!emailValid) {
      setCheckingEmail(false);
      return;
    }

    let cancelled = false;
    setCheckingEmail(true);

    const t = setTimeout(async () => {
      try {
        const methods = await fetchSignInMethodsForEmail(auth, emailClean);

        if (methods.length > 0) {
          setEmailKnown(true);
          const map: Record<string, string> = {
            password: 'Email & password',
            'google.com': 'Google',
            'apple.com': 'Apple',
            'facebook.com': 'Facebook',
            'twitter.com': 'Twitter / X',
            'github.com': 'GitHub',
            'microsoft.com': 'Microsoft',
            'yahoo.com': 'Yahoo',
          };
          const nice = methods.map(m => map[m] ?? m).join(', ');
          setProviderHint(nice);
        } else {

          setEmailKnown(null);
          setProviderHint(null);
        }
      } catch {
        setEmailKnown(null);
        setProviderHint(null);
      } finally {
        if (!cancelled) setCheckingEmail(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [emailClean, emailValid]);

  const onLogin = async () => {
    if (!canSubmit) {
      return Alert.alert(
        'Check your details',
        !emailValid ? 'Enter a valid email address' : 'Enter your password'
      );
    }

    try {
      setBusy(true);
      setPasswordError(null);
      setGenericError(null);
      await loginUser(emailClean, password);
      onSignedIn?.();
    } catch (e: any) {
      const code = e?.code as string | undefined;

      if (code === AuthErrorCodes.USER_DELETED || code === 'auth/user-not-found') {
        setEmailKnown(false);         
        setGenericError(null);
        emailRef.current?.focus();
        return;
      }


      if (code === AuthErrorCodes.INVALID_PASSWORD || code === 'auth/wrong-password') {
        setEmailKnown(true);          
        setGenericError(null);
        setPasswordError('Wrong password. Please try again.');
        passwordRef.current?.focus();
        return;
      }

      if (code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
        setEmailKnown(null);           
        setPasswordError(null);
        setGenericError('Email or password is incorrect.');
        passwordRef.current?.focus();
        return;
      }

      Alert.alert('Sign in failed', e?.message ?? 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const EmailStatusBadge = () => {
    if (!emailValid) return null;

    if (emailKnown === false) {
      return (
        <Badge tone="danger" icon="alert-circle" text="No account found for this email" />
      );
    }

    if (emailKnown === true) {
      if (providerHint && !providerHint.toLowerCase().includes('email')) {
        return <Badge tone="info" icon="log-in-outline" text={`Use ${providerHint} to sign in`} />;
      }
      return <Badge tone="success" icon="checkmark-circle" text="Email found — you can sign in" />;
    }

    return null;
  };

  const Callout = () => {
    if (emailKnown === false) {
      return (
        <CalloutCard
          tone="danger"
          title="We couldn’t find an account"
          body="Create a new account with this email."
          cta="Create account"
          onPress={onSwitchToSignup}
        />
      );
    }
    if (passwordError) {
      return (
        <CalloutCard
          tone="warning"
          title="Wrong password"
          body="Please double-check your password and try again."
        />
      );
    }
    if (genericError) {
      return (
        <CalloutCard
          tone="warning"
          title="Email or password is incorrect"
          body="If you don’t remember signing up, tap Create account."
          cta="Create account"
          onPress={onSwitchToSignup}
        />
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#141D2A' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingTop: keyboardVisible ? 122 : 64 }]}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <Text style={styles.title}>Welcome back</Text>
          <TextInput
            ref={emailRef}
            style={[
              styles.input,
              emailValid && emailKnown === false && { borderColor: '#EF4444' },
              emailValid && emailKnown === true  && { borderColor: '#22C55E' },
            ]}
            placeholder="Email"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={(t) => { setEmail(t); setGenericError(null); }}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          <EmailStatusBadge />
          <View
            style={[
              styles.passwordWrapper,
              (!!passwordError || emailKnown === false || !!genericError) && { borderColor: '#EF4444' },
            ]}
          >
            <TextInput
              ref={passwordRef}
              style={[styles.input, { flex: 1, marginBottom: 0, borderWidth: 0 }]}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={(t) => { setPasswordError(null); setGenericError(null); setPassword(t); }}
              secureTextEntry={!showPassword}
              textContentType="password"
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={onLogin}
            />
            <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={{ paddingHorizontal: 8 }}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>


          <Callout />

          {/* Forgot password (wire later) */}
          <Pressable onPress={() => Alert.alert('Coming soon', 'Password reset is not set up yet.')}>
            <Text style={styles.linkAccent}>Forgot password?</Text>
          </Pressable>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.primaryBtn, !canSubmit && { opacity: 0.6 }]}
            onPress={onLogin}
            disabled={!canSubmit}
          >
            <Text style={styles.primaryText}>{busy ? 'Signing in…' : 'Sign in'}</Text>
          </TouchableOpacity>

          {/* Switch to sign up */}
          <TouchableOpacity onPress={onSwitchToSignup}>
            <Text style={styles.link}>Don’t have an account — Sign up</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------- Small badge ---------- */
function Badge({
  tone,
  icon,
  text,
}: {
  tone: 'success' | 'danger' | 'info' | 'neutral';
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  const palette = {
    success: { bg: 'rgba(34,197,94,0.12)', border: '#22C55E', icon: '#86EFAC', text: '#86EFAC' },
    danger:  { bg: 'rgba(239,68,68,0.12)', border: '#EF4444', icon: '#F87171', text: '#F87171' },
    info:    { bg: 'rgba(59,130,246,0.12)', border: '#3B82F6', icon: '#93C5FD', text: '#93C5FD' },
    neutral: { bg: 'rgba(148,163,184,0.12)', border: '#64748B', icon: '#94A3B8', text: '#94A3B8' },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Ionicons name={icon} size={14} color={palette.icon} />
      <Text style={[styles.badgeText, { color: palette.text }]}>{text}</Text>
    </View>
  );
}

/* ---------- Big callout card ---------- */
function CalloutCard({
  tone,
  title,
  body,
  cta,
  onPress,
}: {
  tone: 'danger' | 'warning';
  title: string;
  body?: string;
  cta?: string;
  onPress?: () => void;
}) {
  const palette =
    tone === 'danger'
      ? { bg: 'rgba(239,68,68,0.10)', border: '#EF4444', title: '#FCA5A5', body: '#FCA5A5' }
      : { bg: 'rgba(251,191,36,0.10)', border: '#F59E0B', title: '#FCD34D', body: '#FCD34D' };

  return (
    <View style={[styles.callout, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Text style={[styles.calloutTitle, { color: palette.title }]}>{title}</Text>
      {body ? <Text style={[styles.calloutBody, { color: palette.body }]}>{body}</Text> : null}
      {cta && onPress ? (
        <Pressable onPress={onPress} style={styles.calloutBtn}>
          <Ionicons name="person-add-outline" size={16} color="#0B1020" />
          <Text style={styles.calloutBtnText}>{cta}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  title: { color: 'white', fontSize: 24, fontWeight: '800', marginBottom: 18, textAlign: 'center' },

  input: {
    backgroundColor: '#1F2937',
    color: 'white',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 12,
  },
  linkAccent: { color: '#7A00FF', fontWeight: '700', textAlign: 'right', marginBottom: 12 },
  primaryBtn: { backgroundColor: '#7A00FF', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  primaryText: { color: 'white', fontWeight: '800', fontSize: 16 },
  link: { color: '#C084FC', textAlign: 'center', marginTop: 14, fontWeight: '700' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  badgeText: { fontSize: 12, fontWeight: '800' },
  callout: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  calloutTitle: { fontWeight: '900', fontSize: 14, marginBottom: 4 },
  calloutBody: { fontWeight: '700', fontSize: 12, opacity: 0.9 },
  calloutBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#FCD34D',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calloutBtnText: { color: '#0B1020', fontWeight: '900' },
});
