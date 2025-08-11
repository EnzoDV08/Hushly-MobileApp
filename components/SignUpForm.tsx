import React, { useEffect, useState, useRef } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Pressable, Keyboard } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import Animated, { useSharedValue, withTiming, useAnimatedStyle, withSequence, Easing, interpolateColor } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { registerUser } from '../services/authService';
import * as AuthService from '../services/authService';

const ERROR_RED = '#EF4444';

export default function SignUpForm({ onSwitchToLogin, onSignedUp, navigation }: any) {
  const headerHeight = useHeaderHeight();

  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [agree, setAgree]       = useState(false);
  const [busy, setBusy]         = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => { setKeyboardVisible(true); });
    const hide = Keyboard.addListener('keyboardDidHide', () => { setKeyboardVisible(false); });
    return () => { show.remove(); hide.remove(); };
  }, []);

  const emailRef    = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef  = useRef<TextInput>(null);

  const hasLen   = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNum   = /[0-9]/.test(password);
  const hasSym   = /[^A-Za-z0-9]/.test(password);

  const strength = (() => {
    let s = 0;
    if (hasLen) s++;
    if (hasUpper) s++;
    if (hasNum) s++;
    if (hasSym) s++;
    return s / 4;
  })();

  const bar = useSharedValue(0);
  useEffect(() => {
    bar.value = withTiming(strength, { duration: 420, easing: Easing.out(Easing.cubic) });
  }, [strength]);

  const barStyle = useAnimatedStyle(() => {
    const pct = bar.value;
    const bg = interpolateColor(pct, [0, 0.5, 1], ['#EF4444', '#F59E0B', '#16A34A']);
    return { width: `${Math.max(0, Math.min(1, pct)) * 100}%`, backgroundColor: bg };
  });

  const [errors, setErrors] = useState<{ username?: string; email?: string; password?: string; confirm?: string; agree?: string; }>({});

  const clearError = (key: keyof typeof errors) => setErrors((e) => ({ ...e, [key]: undefined }));

  const shakeUser    = useSharedValue(0);
  const shakeEmail   = useSharedValue(0);
  const shakePass    = useSharedValue(0);
  const shakeConfirm = useSharedValue(0);
  const fadeUser     = useSharedValue(0);
  const fadeEmail    = useSharedValue(0);
  const fadePass     = useSharedValue(0);
  const fadeConfirm  = useSharedValue(0);
  const fadeAgree    = useSharedValue(0);

  const makeShake = (sv: Animated.SharedValue<number>) =>
    (sv.value = withSequence(
      withTiming(8,  { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(5,  { duration: 60 }),
      withTiming(-5, { duration: 60 }),
      withTiming(0,  { duration: 80 })
    ));

  const userWrapStyle    = useAnimatedStyle(() => ({ transform: [{ translateX: shakeUser.value }] }));
  const emailWrapStyle   = useAnimatedStyle(() => ({ transform: [{ translateX: shakeEmail.value }] }));
  const passWrapStyle    = useAnimatedStyle(() => ({ transform: [{ translateX: shakePass.value }] }));
  const confirmWrapStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeConfirm.value }] }));
  const userErrStyle     = useAnimatedStyle(() => ({ opacity: fadeUser.value }));
  const emailErrStyle    = useAnimatedStyle(() => ({ opacity: fadeEmail.value }));
  const passErrStyle     = useAnimatedStyle(() => ({ opacity: fadePass.value }));
  const confirmErrStyle  = useAnimatedStyle(() => ({ opacity: fadeConfirm.value }));
  const agreeErrStyle    = useAnimatedStyle(() => ({ opacity: fadeAgree.value }));

  const showError = (key: keyof typeof errors, message: string) => {
    setErrors((e) => ({ ...e, [key]: message }));
    const fadeMap: Record<string, Animated.SharedValue<number>> = { username: fadeUser, email: fadeEmail, password: fadePass, confirm: fadeConfirm, agree: fadeAgree };
    const shakeMap: Record<string, Animated.SharedValue<number>> = { username: shakeUser, email: shakeEmail, password: shakePass, confirm: shakeConfirm };
    const f = fadeMap[key]; if (f) f.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) });
    const s = shakeMap[key]; if (s) makeShake(s);
  };

  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const passwordGood = hasLen && hasUpper && hasNum && hasSym;
  const passwordsMatch = password.length > 0 && password === confirm;

  const hasUserChecker = typeof (AuthService as any).checkUsernameAvailable === 'function';
  const hasEmailChecker = typeof (AuthService as any).checkEmailAvailable === 'function';

  const [usernameStatus, setUsernameStatus] = useState<'idle'|'checking'|'available'|'taken'|'error'>('idle');
  const [emailStatus, setEmailStatus] = useState<'idle'|'checking'|'available'|'taken'|'error'>('idle');

  useEffect(() => {
    const name = username.trim();
    if (!name || name.length < 2) { setUsernameStatus('idle'); return; }
    let cancelled = false;
    if (hasUserChecker) setUsernameStatus('checking'); else setUsernameStatus('idle');
    const t = setTimeout(async () => {
      if (!hasUserChecker) return;
      try {
        const ok = await (AuthService as any).checkUsernameAvailable(name);
        if (!cancelled) setUsernameStatus(ok ? 'available' : 'taken');
      } catch { if (!cancelled) setUsernameStatus('error'); }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [username, hasUserChecker]);

  useEffect(() => {
    const mail = email.trim();
    if (!mail || !emailValid) { setEmailStatus('idle'); return; }
    let cancelled = false;
    if (hasEmailChecker) setEmailStatus('checking'); else setEmailStatus('idle');
    const t = setTimeout(async () => {
      if (!hasEmailChecker) return;
      try {
        const ok = await (AuthService as any).checkEmailAvailable(mail);
        if (!cancelled) setEmailStatus(ok ? 'available' : 'taken');
      } catch { if (!cancelled) setEmailStatus('error'); }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [email, emailValid, hasEmailChecker]);

  const usernameOk = username.trim().length >= 2 && (hasUserChecker ? usernameStatus === 'available' : true);
  const emailOk = emailValid && (hasEmailChecker ? emailStatus === 'available' : true);

  const canSubmit = usernameOk && emailOk && passwordsMatch && passwordGood && agree && !busy;

  const resetErrorFades = () => { fadeUser.value = fadeEmail.value = fadePass.value = fadeConfirm.value = fadeAgree.value = 0; };

  const onSignup = async () => {
    resetErrorFades();
    setErrors({});
    if (!usernameOk) showError('username', username.trim().length < 2 ? 'Please enter a username (2+ characters).' : 'This username is already taken.');
    if (!emailOk) showError('email', !emailValid ? 'Please enter a valid email.' : 'This email is already registered — please sign in.');
    if (!passwordGood) showError('password', 'Use 8+ chars, 1 uppercase, 1 number, 1 symbol.');
    if (!passwordsMatch) showError('confirm', 'Passwords do not match.');
    if (!agree) showError('agree', 'You must agree to the Terms & Conditions.');
    const hasAnyError = !usernameOk || !emailOk || !passwordGood || !passwordsMatch || !agree;
    if (hasAnyError) return;
    try {
      setBusy(true);
      await registerUser(email.trim(), password, username.trim());
      onSignedUp();
    } catch (e: any) {
      const code = (e?.code || '').toString();
      const msg  = (e?.message || '').toString();
      if (code.includes('email-already-in-use') || /email.*already/i.test(msg)) showError('email', 'This email is already registered — please sign in.');
      else if (code.includes('weak-password') || /weak.*password/i.test(msg)) showError('password', 'Password is too weak. Try a stronger one.');
      else if (code.includes('username-taken') || /user(name)? .*taken|exists|already/i.test(msg)) showError('username', 'This username is already taken.');
      else Alert.alert('Sign up failed', e?.message ?? 'Please try again');
    } finally { setBusy(false); }
  };

  const AnimatedRule = ({ ok, label }: { ok: boolean; label: string }) => {
    const v = useSharedValue(0);
    useEffect(() => { v.value = withTiming(ok ? 1 : 0, { duration: 240, easing: Easing.out(Easing.cubic) }); }, [ok]);
    const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.9 + 0.2 * v.value }], opacity: 0.6 + 0.4 * v.value }));
    const textStyle = useAnimatedStyle(() => ({ opacity: 0.7 + 0.3 * v.value }));
    return (
      <View style={styles.reqRow}>
        <Animated.Text style={[styles.reqIcon, iconStyle, { color: ok ? '#16A34A' : '#9CA3AF' }]}>{ok ? '✓' : '•'}</Animated.Text>
        <Animated.Text style={[styles.reqText, textStyle, { color: ok ? '#C7F9CC' : '#9CA3AF' }]}>{label}</Animated.Text>
      </View>
    );
  };

  const UsernameStatus = () => {
    if (!hasUserChecker || username.trim().length < 2) return null;
    const color =
      usernameStatus === 'available' ? '#16A34A' :
      usernameStatus === 'taken'     ? ERROR_RED :
      usernameStatus === 'checking'  ? '#F59E0B' : '#9CA3AF';
    const text =
      usernameStatus === 'available' ? 'Username is available' :
      usernameStatus === 'taken'     ? 'Username is already taken' :
      usernameStatus === 'checking'  ? 'Checking username…' : 'Could not verify username';
    return <Text style={[styles.hint, { color, marginTop: 2, marginBottom: 4 }]}>{text}</Text>;
  };

  const EmailStatus = () => {
    if (!email.trim() || !emailValid || !hasEmailChecker) return null;
    if (emailStatus === 'taken') {
      return (
        <Text style={[styles.hint, { color: ERROR_RED, marginTop: 2, marginBottom: 4 }]}>
          Email is already registered — <Text style={styles.linkAccent} onPress={onSwitchToLogin}>please sign in</Text>
        </Text>
      );
    }
    if (emailStatus === 'checking') return <Text style={[styles.hint, { color: '#F59E0B', marginTop: 2, marginBottom: 4 }]}>Checking email…</Text>;
    if (emailStatus === 'error') return <Text style={[styles.hint, { color: '#9CA3AF', marginTop: 2, marginBottom: 4 }]}>Could not verify email</Text>;
    return null;
  };

  const usernameBorderColor =
    errors.username ? ERROR_RED :
    username.trim().length >= 2 && hasUserChecker && usernameStatus === 'taken' ? ERROR_RED :
    username.trim().length >= 2 && hasUserChecker && usernameStatus === 'available' ? '#16A34A' :
    undefined;

  const emailBorderColor =
    errors.email ? ERROR_RED :
    emailValid && hasEmailChecker && emailStatus === 'taken' ? ERROR_RED :
    emailValid && hasEmailChecker && emailStatus === 'available' ? '#16A34A' :
    undefined;

  const passBorderColor =
    errors.password ? ERROR_RED : undefined;

  const confirmBorderColor =
    errors.confirm ? ERROR_RED :
    confirm.length > 0 ? (passwordsMatch ? '#16A34A' : ERROR_RED) : undefined;

  const reasons = [];
  if (!usernameOk) reasons.push('username');
  if (!emailOk) reasons.push('email');
  if (!passwordGood) reasons.push('password rules');
  if (!passwordsMatch) reasons.push('passwords match');
  if (!agree) reasons.push('terms');
  const disabledMsg = reasons.join(' • ');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#141D2A' }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={headerHeight}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingTop: keyboardVisible ? 122 : 64 }]}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <Text style={styles.title}>Create your account</Text>

          <Animated.View style={[userWrapStyle]}>
            <TextInput
              style={[styles.input, errors.username && styles.inputError, usernameBorderColor ? { borderColor: usernameBorderColor } : null]}
              placeholder="Username"
              placeholderTextColor="#9CA3AF"
              value={username}
              onChangeText={(t) => { clearError('username'); fadeUser.value = 0; setUsername(t); }}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          </Animated.View>
          <UsernameStatus />
          {errors.username ? <Animated.Text style={[styles.errorText, userErrStyle]}>{errors.username}</Animated.Text> : null}

          <Animated.View style={[emailWrapStyle]}>
            <TextInput
              ref={emailRef}
              style={[styles.input, errors.email && styles.inputError, emailBorderColor ? { borderColor: emailBorderColor } : null]}
              placeholder="Email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={(t) => { clearError('email'); fadeEmail.value = 0; setEmail(t); }}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </Animated.View>
          <EmailStatus />
          {errors.email ? <Animated.Text style={[styles.errorText, emailErrStyle]}>{errors.email}</Animated.Text> : null}

          <Animated.View style={[passWrapStyle]}>
            <View style={[styles.inputWrap, passBorderColor ? { borderColor: passBorderColor } : null]}>
              <TextInput
                ref={passwordRef}
                style={styles.inputInner}
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={(t) => { clearError('password'); fadePass.value = 0; setPassword(t); }}
                secureTextEntry={!showPass}
                textContentType="password"
                autoComplete="password"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
              />
              <TouchableOpacity onPress={() => setShowPass(v => !v)} style={{ paddingHorizontal: 8 }}>
                <Ionicons name={showPass ? 'eye-off' : 'eye'} size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          <View style={styles.strengthTrack}>
            <Animated.View style={[styles.strengthFill, barStyle]} />
          </View>

          <View style={{ marginTop: 8, marginBottom: 6 }}>
            <AnimatedRule ok={hasLen}   label="8+ characters" />
            <AnimatedRule ok={hasUpper} label="at least 1 uppercase letter" />
            <AnimatedRule ok={hasNum}   label="at least 1 number" />
            <AnimatedRule ok={hasSym}   label="at least 1 symbol" />
          </View>

          <Animated.View style={[confirmWrapStyle]}>
            <View style={[styles.inputWrap, confirmBorderColor ? { borderColor: confirmBorderColor } : null]}>
              <TextInput
                ref={confirmRef}
                style={styles.inputInner}
                placeholder="Confirm password"
                placeholderTextColor="#9CA3AF"
                value={confirm}
                onChangeText={(t) => { clearError('confirm'); fadeConfirm.value = 0; setConfirm(t); }}
                secureTextEntry={!showConfirm}
                returnKeyType="done"
                onSubmitEditing={onSignup}
              />
              <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={{ paddingHorizontal: 8 }}>
                <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </Animated.View>
          {confirm.length > 0 ? (
            <Text style={[styles.matchText, { color: passwordsMatch ? '#16A34A' : ERROR_RED }]}>
              {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
            </Text>
          ) : null}
          {errors.confirm ? <Animated.Text style={[styles.errorText, confirmErrStyle]}>{errors.confirm}</Animated.Text> : null}

          <Pressable
            style={styles.tcRow}
            onPress={() => { clearError('agree'); fadeAgree.value = 0; setAgree((v) => !v); }}
          >
            <View style={[styles.checkbox, agree && styles.checkboxChecked]}>
              {agree ? <Text style={styles.checkboxTick}>✓</Text> : null}
            </View>
            <Text style={styles.tcText}>I agree to the <Text style={styles.linkAccent}>Terms & Conditions</Text></Text>
          </Pressable>
          {errors.agree ? <Animated.Text style={[styles.errorText, agreeErrStyle]}>{errors.agree}</Animated.Text> : null}

          {!canSubmit && <Text style={styles.disabledHint}>To enable Sign up: {disabledMsg}</Text>}

          <TouchableOpacity
            style={[styles.primaryBtn, !canSubmit && { opacity: 0.6 }]}
            onPress={onSignup}
            disabled={!canSubmit}
          >
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
  inputWrap: {
    backgroundColor: '#1F2937',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputInner: {
    flex: 1,
    color: 'white',
    paddingHorizontal: 14,
    paddingVertical: 14,
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
  inputError: {
    borderColor: ERROR_RED,
  },
  errorText: {
    marginTop: 6,
    marginBottom: 8,
    fontSize: 12,
    color: ERROR_RED,
    fontWeight: '700',
  },
  hint: {
    marginTop: 6,
    marginBottom: 6,
    fontSize: 12,
    color: '#9CA3AF',
  },
  matchText: {
    marginTop: -4,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'left',
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  reqIcon: {
    width: 18,
    textAlign: 'center',
    marginRight: 6,
    fontWeight: '900',
  },
  reqText: {
    fontSize: 12,
    fontWeight: '700',
  },
  disabledHint: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
});
