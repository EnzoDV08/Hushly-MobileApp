import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  TextInput,
  Alert,
  Keyboard,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { auth } from '../firebase/firebaseConfig';
import { updateProfile, sendPasswordResetEmail, signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { K_HAPTICS, SETTINGS_EVENT, Prefs } from './SettingsScreen';

const BG = '#141D2A';
const BRAND = '#7A00FF';
const BRAND2 = '#9B5CFF';

export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const user = auth.currentUser;

  console.log('[ProfileScreen] Mounted - Current User:', user);

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [editingName, setEditingName] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [hapticsOn, setHapticsOn] = useState(true);

  const email = user?.email ?? 'unknown@email';
  const uid = user?.uid ?? '—';
  const photoURL = user?.photoURL ?? '';

  
  useEffect(() => {
    console.log('[ProfileScreen] Loading haptics setting from AsyncStorage...');
    (async () => {
      try {
        const s = await AsyncStorage.getItem(K_HAPTICS);
        console.log('[ProfileScreen] Loaded K_HAPTICS:', s);
        if (s != null) setHapticsOn(s === '1');
      } catch (err) {
        console.error('[ProfileScreen] Error loading haptics setting:', err);
      }
    })();
    const sub = DeviceEventEmitter.addListener(SETTINGS_EVENT, (p: Prefs) => {
      console.log('[ProfileScreen] SETTINGS_EVENT received:', p);
      setHapticsOn(p.haptics);
    });
    return () => sub.remove();
  }, []);

  const vibrateImpact = (style: Haptics.ImpactFeedbackStyle) => {
    console.log('[ProfileScreen] Triggering vibrateImpact with style:', style);
    if (hapticsOn) Haptics.impactAsync(style);
  };
  const vibrateNotify = (type: Haptics.NotificationFeedbackType) => {
    console.log('[ProfileScreen] Triggering vibrateNotify with type:', type);
    if (hapticsOn) Haptics.notificationAsync(type);
  };

 
  const headerIn = useSharedValue(0);
  useEffect(() => {
    console.log('[ProfileScreen] Animating header in');
    headerIn.value = withDelay(40, withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }));
  }, []);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerIn.value,
    transform: [{ translateY: (1 - headerIn.value) * -8 }],
  }));

  
  const backPeek = useSharedValue(-6);
  useEffect(() => {
    backPeek.value = withTiming(0, { duration: 420 });
  }, []);
  const backWrapStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: backPeek.value }],
  }));

  const createdAt = useMemo(() => {
    const t = user?.metadata?.creationTime;
    return t ? new Date(t).toLocaleString() : '—';
  }, [user]);
  const lastLogin = useMemo(() => {
    const t = user?.metadata?.lastSignInTime;
    return t ? new Date(t).toLocaleString() : '—';
  }, [user]);

 
  const copiedSV = useSharedValue(0);
  const showCopied = () => {
    console.log('[ProfileScreen] UID copied to clipboard');
    copiedSV.value = withTiming(1, { duration: 160 });
    setTimeout(() => (copiedSV.value = withTiming(0, { duration: 180 })), 900);
  };
  const copiedStyle = useAnimatedStyle(() => ({
    opacity: copiedSV.value,
    transform: [{ translateY: (1 - copiedSV.value) * -6 }],
  }));

  const copyUid = async () => {
    console.log('[ProfileScreen] copyUid called');
    await Clipboard.setStringAsync(uid);
    vibrateImpact(Haptics.ImpactFeedbackStyle.Light);
    showCopied();
  };

  const onSaveName = async () => {
    console.log('[ProfileScreen] onSaveName called with:', displayName);
    if (!user) return;
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      console.warn('[ProfileScreen] Name too short');
      Alert.alert('Name too short', 'Please enter at least 2 characters.');
      return;
    }
    try {
      setSaving(true);
      Keyboard.dismiss();
      await updateProfile(user, { displayName: trimmed });
      console.log('[ProfileScreen] Name updated successfully');
      vibrateNotify(Haptics.NotificationFeedbackType.Success);
      setEditingName(false);
    } catch (e: any) {
      console.error('[ProfileScreen] Failed to update name:', e);
      Alert.alert('Update failed', e?.message ?? 'Could not update your name. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onResetPassword = async () => {
    console.log('[ProfileScreen] onResetPassword called for:', email);
    if (!email) return;
    try {
      setSendingReset(true);
      await sendPasswordResetEmail(auth, email);
      console.log('[ProfileScreen] Password reset email sent');
      vibrateNotify(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Password reset sent', `Check your inbox at ${email}.`);
    } catch (e: any) {
      console.error('[ProfileScreen] Failed to send password reset:', e);
      Alert.alert('Error', e?.message ?? 'Could not send the reset email. Try again later.');
    } finally {
      setSendingReset(false);
    }
  };

  const onSignOut = async () => {
    console.log('[ProfileScreen] onSignOut called');
    try {
      setSigningOut(true);
      await signOut(auth);
      console.log('[ProfileScreen] Signed out successfully');
      navigation.replace('Auth');
    } catch (e: any) {
      console.error('[ProfileScreen] Sign out failed:', e);
      Alert.alert('Sign out failed', e?.message ?? 'Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <View style={st.screen}>
      <LinearGradient
        colors={['#181F30', '#0F1623']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View style={[st.headerWrap, { paddingTop: insets.top + 6 }, headerStyle]}>
        <View style={st.headerRow}>
          <Animated.View style={[st.backWrap, backWrapStyle]}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={st.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={22} color="#0F172A" />
            </TouchableOpacity>
          </Animated.View>

          <View style={st.titleCol}>
            <Text style={st.headerTitle}>Your Profile</Text>
            <View style={st.underline} />
          </View>

          <View style={{ width: 52 }} />
        </View>
      </Animated.View>

      <View style={[st.body, { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 12 }]}>
        <View style={st.card}>
          <View style={st.rowTop}>
            <View style={st.avatar}>
              {photoURL ? (
                <View style={st.avatarImg as any} />
              ) : (
                <LinearGradient
                  colors={['#232C44', '#182034']}
                  style={st.avatarGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="person" size={28} color="#9CA3AF" />
                </LinearGradient>
              )}
            </View>

            <View style={{ flex: 1 }}>
              {editingName ? (
                <View>
                  <Text style={st.label}>Display name</Text>
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Your name"
                    placeholderTextColor="#94A3B8"
                    style={st.input}
                    autoFocus
                    autoCapitalize="words"
                    returnKeyType="done"
                    onSubmitEditing={onSaveName}
                    editable={!saving}
                  />
                  <View style={st.row}>
                    <Pressable
                      style={[st.btnGhost, saving && { opacity: 0.6 }]}
                      onPress={() => setEditingName(false)}
                      disabled={saving}
                      accessibilityLabel="Cancel editing name"
                    >
                      <Text style={st.btnGhostText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[st.btn, saving && { opacity: 0.6 }]}
                      onPress={onSaveName}
                      disabled={saving}
                      accessibilityLabel="Save name"
                    >
                      <Ionicons name="checkmark" size={16} color="#0B1220" />
                      <Text style={st.btnText}>{saving ? 'Saving…' : 'Save'}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={st.name}>{displayName || 'Friend'}</Text>
                  <Pressable
                    onPress={() => setEditingName(true)}
                    style={st.inlineEdit}
                    accessibilityRole="button"
                    accessibilityLabel="Edit display name"
                  >
                    <Ionicons name="create-outline" size={14} color="#E5E7EB" />
                    <Text style={st.inlineEditText}>Edit name</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>

          <View style={st.divider} />

          <View style={st.kv}>
            <Text style={st.kLabel}>Email</Text>
            <Text style={st.kValue}>{email}</Text>
          </View>

          <View style={st.kv}>
            <Text style={st.kLabel}>UID</Text>
            <Pressable onPress={copyUid} style={st.uidPill} accessibilityLabel="Copy UID to clipboard">
              <Text style={st.uidText} numberOfLines={1}>
                {uid}
              </Text>
              <Ionicons name="copy-outline" size={14} color="#0B1220" />
            </Pressable>
            <Animated.View pointerEvents="none" style={[st.copiedToast, copiedStyle]}>
              <Text style={st.copiedText}>Copied!</Text>
            </Animated.View>
          </View>

          <View style={st.kv}>
            <Text style={st.kLabel}>Created</Text>
            <Text style={st.kValue}>{createdAt}</Text>
          </View>
          <View style={st.kv}>
            <Text style={st.kLabel}>Last sign-in</Text>
            <Text style={st.kValue}>{lastLogin}</Text>
          </View>
        </View>

        <View style={st.actionsRow}>
          <Pressable
            style={[st.actionBtn, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: '#1F2937' }]}
            onPress={onResetPassword}
            disabled={sendingReset}
            accessibilityLabel="Send password reset email"
          >
            <Ionicons name="key-outline" size={16} color="#E5E7EB" />
            <Text style={st.actionGhostText}>{sendingReset ? 'Sending…' : 'Reset password'}</Text>
          </Pressable>

          <Pressable
            style={[st.actionBtn, { backgroundColor: BRAND }]}
            onPress={onSignOut}
            disabled={signingOut}
            accessibilityLabel="Sign out"
          >
            <Ionicons name="log-out-outline" size={16} color="#0B1220" />
            <Text style={st.actionText}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  headerWrap: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 10 },
  headerRow: { height: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 },
  backWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 8,
  },
  backBtn: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  titleCol: { flex: 1 },
  headerTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 22, letterSpacing: 0.2, textAlign: 'left' },
  underline: { marginTop: 6, width: 112, height: 3, borderRadius: 999, backgroundColor: BRAND },

  body: { flex: 1, paddingHorizontal: 16 },

  card: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },

  avatar: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden' },
  avatarGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { flex: 1, borderRadius: 28, backgroundColor: '#1F2937' },

  name: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  inlineEdit: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', marginTop: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: '#1F2937',
  },
  inlineEditText: { color: '#E5E7EB', fontWeight: '800', fontSize: 12 },

  label: { color: '#9CA3AF', fontSize: 12, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#1F2937',
    backgroundColor: '#0B1220', color: '#fff',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: Platform.select({ ios: 10, android: 8 }),
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },

  btn: {
    backgroundColor: BRAND,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  btnText: { color: '#0B1220', fontWeight: '900' },
  btnGhost: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: '#1F2937',
  },
  btnGhostText: { color: '#E5E7EB', fontWeight: '800' },

  divider: { height: 1, backgroundColor: '#1F2937', marginVertical: 10 },

  kv: { marginTop: 6 },
  kLabel: { color: '#9CA3AF', fontSize: 12, marginBottom: 2 },
  kValue: { color: '#E5E7EB', fontSize: 14 },

  uidPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    backgroundColor: '#86EFAC',
  },
  uidText: { color: '#0B1220', fontWeight: '900', maxWidth: 220 },

  copiedToast: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  copiedText: { color: '#E5E7EB', fontWeight: '800', fontSize: 12 },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: 'transparent',
  },
  actionText: { color: '#0B1220', fontWeight: '900' },
  actionGhostText: { color: '#E5E7EB', fontWeight: '800' },
});
