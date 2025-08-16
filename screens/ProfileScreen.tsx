import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Pressable, TextInput, Alert,
  Keyboard, Platform, DeviceEventEmitter, Image, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { checkUsernameAvailable, uploadAvatarFromUri } from '../services/profileService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../firebase/firebaseConfig';
import {
  updateProfile, updateEmail, sendPasswordResetEmail, signOut, fetchSignInMethodsForEmail
} from 'firebase/auth';
import {
  doc, setDoc, serverTimestamp, deleteDoc
} from 'firebase/firestore';
import { K_HAPTICS, SETTINGS_EVENT, Prefs } from '../services/settings';
import FABBack from '../components/FABBack';

const BG = '#141D2A';
const BRAND = '#7A00FF';

export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const user = auth.currentUser;

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);

  const [email, setEmail] = useState(user?.email ?? '');
  const [editingEmail, setEditingEmail] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle'|'checking'|'ok'|'taken'|'error'>('idle');

  const [sendingReset, setSendingReset] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [hapticsOn, setHapticsOn] = useState(true);

  const [photoURL, setPhotoURL] = useState(user?.photoURL ?? '');
  const [uploading, setUploading] = useState(false);

  const uid = user?.uid ?? '—';

  useEffect(() => {
    (async () => {
      try {
        const s = await AsyncStorage.getItem(K_HAPTICS);
        if (s != null) setHapticsOn(s === '1');
      } catch {}
    })();
    const sub = DeviceEventEmitter.addListener(SETTINGS_EVENT, (p: Prefs) => setHapticsOn(p.haptics));
    return () => sub.remove();
  }, []);

  const vibrateImpact = (style: Haptics.ImpactFeedbackStyle) => { if (hapticsOn) Haptics.impactAsync(style); };
  const vibrateNotify = (type: Haptics.NotificationFeedbackType) => { if (hapticsOn) Haptics.notificationAsync(type); };

  const headerIn = useSharedValue(0);
  useEffect(() => { headerIn.value = withDelay(40, withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) })); }, []);
  const headerStyle = useAnimatedStyle(() => ({ opacity: headerIn.value, transform: [{ translateY: (1 - headerIn.value) * -8 }] }));

  const backPeek = useSharedValue(-6);
  useEffect(() => { backPeek.value = withTiming(0, { duration: 420 }); }, []);
  const backWrapStyle = useAnimatedStyle(() => ({ transform: [{ translateX: backPeek.value }] }));

  const createdAt = useMemo(() => {
    const t = user?.metadata?.creationTime;
    return t ? new Date(t).toLocaleString() : '—';
  }, [user]);
  const lastLogin = useMemo(() => {
    const t = user?.metadata?.lastSignInTime;
    return t ? new Date(t).toLocaleString() : '—';
  }, [user]);

  const copiedSV = useSharedValue(0);
  const copiedStyle = useAnimatedStyle(() => ({ opacity: copiedSV.value, transform: [{ translateY: (1 - copiedSV.value) * -6 }] }));
  const copyUid = async () => {
    await Clipboard.setStringAsync(uid);
    vibrateImpact(Haptics.ImpactFeedbackStyle.Light);
    copiedSV.value = withTiming(1, { duration: 160 });
    setTimeout(() => (copiedSV.value = withTiming(0, { duration: 180 })), 900);
  };

  const onSaveName = async () => {
    if (!user) return;
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      Alert.alert('Name too short', 'Please enter at least 2 characters.');
      return;
    }
    try {
      setSavingName(true);
      Keyboard.dismiss();

      const oldLower = (user.displayName || '').trim().toLowerCase();
      const newLower = trimmed.toLowerCase();

      if (oldLower !== newLower) {
        const ok = await checkUsernameAvailable(trimmed);
        if (!ok) {
          Alert.alert('Username taken', 'Please choose a different display name.');
          setSavingName(false);
          return;
        }
      }

      await updateProfile(user, { displayName: trimmed });

      await refreshUser();

      await setDoc(doc(db, 'users', user.uid), {
        displayName: trimmed,
        displayNameLower: trimmed.toLowerCase(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      if (oldLower !== newLower) {
        if (oldLower) {
          try { await deleteDoc(doc(db, 'usernames', oldLower)); } catch {}
        }
        await setDoc(doc(db, 'usernames', newLower), {
          uid: user.uid,
          displayName: trimmed,
          lower: newLower,
          createdAt: serverTimestamp(),
        }, { merge: false });
      }

      vibrateNotify(Haptics.NotificationFeedbackType.Success);
      setEditingName(false);
    } catch (e: any) {
      Alert.alert('Update failed', e?.message ?? 'Could not update your name.');
    } finally {
      setSavingName(false);
    }
  };

  useEffect(() => {
    const e = email.trim().toLowerCase();
    if (!editingEmail) { setEmailStatus('idle'); return; }
    if (!/^\S+@\S+\.\S+$/.test(e)) { setEmailStatus('idle'); return; }
    let cancelled = false;
    setEmailStatus('checking');
    const t = setTimeout(async () => {
      try {
        const methods = await fetchSignInMethodsForEmail(auth, e);
        if (!cancelled) setEmailStatus(methods.length === 0 || e === (user?.email || '').toLowerCase() ? 'ok' : 'taken');
      } catch {
        if (!cancelled) setEmailStatus('error');
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [editingEmail, email, user?.email]);

  const onSaveEmail = async () => {
    if (!user) return;
    const e = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) {
      Alert.alert('Invalid email', 'Please enter a valid email.');
      return;
    }
    if (e === (user.email || '').toLowerCase()) { setEditingEmail(false); return; }

    try {
      setSavingEmail(true);
      Keyboard.dismiss();

      const methods = await fetchSignInMethodsForEmail(auth, e);
      if (methods.length > 0) {
        Alert.alert('Email already in use', 'That email is already registered. Please use another.');
        setSavingEmail(false);
        return;
      }

      await updateEmail(user, e);

      await refreshUser();

      await setDoc(doc(db, 'users', user.uid), {
        email: e,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      vibrateNotify(Haptics.NotificationFeedbackType.Success);
      setEditingEmail(false);
    } catch (err: any) {
      if (err?.code === 'auth/requires-recent-login') {
        Alert.alert('Security check', 'Please sign in again to change your email.');
      } else {
        Alert.alert('Update failed', err?.message ?? 'Could not update email right now.');
      }
    } finally {
      setSavingEmail(false);
    }
  };

  const pickAndUpload = async () => {
  console.log('[Avatar] start pickAndUpload');
  try {
    setUploading(true);
    
const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
if (!perm.granted) {
  Alert.alert(
    'Permission needed',
    'Please allow photo library access in your device settings.',
    [{ text: 'OK' }]
  );
  return;
}


    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: true,
      aspect: [1, 1],
    });
    console.log('[Avatar] picker result:', res);

    if (res.canceled) {
      console.log('[Avatar] user canceled picker');
      return;
    }

    const uri = res.assets?.[0]?.uri;
    console.log('[Avatar] selected uri:', uri);
    if (!uri) {
      console.error('[Avatar] no URI returned from picker');
      Alert.alert('Upload failed', 'No image URI found.');
      return;
    }

    const manipResult = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 512 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    console.log('[Avatar] manipulated result:', manipResult);

    const freshUrl = await uploadAvatarFromUri(manipResult.uri);
    console.log('[Avatar] upload success, fresh URL:', freshUrl);

    setPhotoURL(freshUrl);
    await refreshUser();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

  } catch (err: any) {
    console.error('[Avatar] ERROR in pickAndUpload:', err?.code, err?.message, err);
    Alert.alert('Upload failed', err?.message ?? 'Unknown error while uploading.');
  } finally {
    setUploading(false);
    console.log('[Avatar] end pickAndUpload');
  }
};



  const onResetPassword = async () => {
    if (!email) return;
    try {
      setSendingReset(true);
      await sendPasswordResetEmail(auth, email);
      vibrateNotify(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Password reset sent', `Check your inbox at ${email}.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not send the reset email.');
    } finally {
      setSendingReset(false);
    }
  };

  const onSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut(auth);
      navigation.replace('Auth');
    } catch (e: any) {
      Alert.alert('Sign out failed', e?.message ?? 'Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  const refreshUser = async () => {
  if (!auth.currentUser) return;
    await auth.currentUser.reload();
  const u = auth.currentUser;
    setDisplayName(u?.displayName ?? '');
    setEmail(u?.email ?? '');
    setPhotoURL(u?.photoURL ?? '');
  };

    useEffect(() => {
      const unsub = auth.onAuthStateChanged(() => refreshUser());
      return unsub; 
    }, []);


  return (
    <View style={st.screen}>
      <LinearGradient colors={['#181F30', '#0F1623']} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <Animated.View style={[st.headerWrap, { paddingTop: insets.top + 6 }, headerStyle]}>
        <View style={st.headerRow}>
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
            <Pressable style={st.avatar} onPress={pickAndUpload}>
              {photoURL ? (
                <Image source={{ uri: photoURL }} style={st.avatarImg as any} />
              ) : (
                <LinearGradient colors={['#232C44', '#182034']} style={st.avatarGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="person" size={28} color="#9CA3AF" />
                </LinearGradient>
              )}
              {uploading ? (
                <View style={st.avatarOverlay}>
                  <ActivityIndicator />
                </View>
              ) : (
                <View style={st.camBadge}><Ionicons name="camera" size={14} color="#0B1220" /></View>
              )}
            </Pressable>

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
                    editable={!savingName}
                  />
                  <View style={st.row}>
                    <Pressable style={[st.btnGhost, savingName && { opacity: 0.6 }]} onPress={() => setEditingName(false)} disabled={savingName}>
                      <Text style={st.btnGhostText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={[st.btn, savingName && { opacity: 0.6 }]} onPress={onSaveName} disabled={savingName}>
                      <Ionicons name="checkmark" size={16} color="#0B1220" />
                      <Text style={st.btnText}>{savingName ? 'Saving…' : 'Save'}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={st.name}>
                    {displayName || user?.displayName || (user?.email ? user.email.split('@')[0] : '') || 'You'}
                  </Text>
                  <Pressable onPress={() => setEditingName(true)} style={st.inlineEdit}>
                    <Ionicons name="create-outline" size={14} color="#E5E7EB" />
                    <Text style={st.inlineEditText}>Edit name</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>

          <View style={st.divider} />

          {editingEmail ? (
            <View style={{ marginBottom: 6 }}>
              <Text style={st.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#94A3B8"
                style={st.input}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="done"
                onSubmitEditing={onSaveEmail}
                editable={!savingEmail}
              />
              {emailStatus === 'checking' && <Text style={st.hint}>Checking…</Text>}
              {emailStatus === 'taken' && <Text style={[st.hint, { color: '#FCA5A5' }]}>Email already registered</Text>}
              <View style={st.row}>
                <Pressable style={[st.btnGhost, savingEmail && { opacity: 0.6 }]} onPress={() => { setEditingEmail(false); setEmail(user?.email ?? ''); setEmailStatus('idle');}} disabled={savingEmail}>
                  <Text style={st.btnGhostText}>Cancel</Text>
                </Pressable>
                <Pressable style={[st.btn, savingEmail && { opacity: 0.6 }]} onPress={onSaveEmail} disabled={savingEmail || emailStatus === 'taken'}>
                  <Ionicons name="checkmark" size={16} color="#0B1220" />
                  <Text style={st.btnText}>{savingEmail ? 'Saving…' : 'Save'}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={st.kvRow}>
              <View style={{ flex: 1 }}>
                <Text style={st.kLabel}>Email</Text>
                <Text style={st.kValue}>{user?.email ?? '—'}</Text>
              </View>
              <Pressable onPress={() => setEditingEmail(true)} style={st.inlineEdit}>
                <Ionicons name="mail" size={14} color="#E5E7EB" />
                <Text style={st.inlineEditText}>Change</Text>
              </Pressable>
            </View>
          )}

          <View style={st.kv}>
            <Text style={st.kLabel}>UID</Text>
            <Pressable onPress={copyUid} style={st.uidPill}>
              <Text style={st.uidText} numberOfLines={1}>{uid}</Text>
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
          >
            <Ionicons name="key-outline" size={16} color="#E5E7EB" />
            <Text style={st.actionGhostText}>{sendingReset ? 'Sending…' : 'Reset password'}</Text>
          </Pressable>

          <Pressable
            style={[st.actionBtn, { backgroundColor: BRAND }]}
            onPress={onSignOut}
            disabled={signingOut}
          >
            <Ionicons name="log-out-outline" size={16} color="#0B1220" />
            <Text style={st.actionText}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
          </Pressable>
        </View>
      </View>
      <FABBack onPress={() => navigation.goBack?.()} bottomOffset={12} />
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  headerWrap: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 10 },
  headerRow: { height: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 },
  backWrap: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 8,
  },
  backBtn: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  titleCol: { flex: 1 },
  headerTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 22, letterSpacing: 0.2, textAlign: 'left' },
  underline: { marginTop: 6, width: 112, height: 3, borderRadius: 999, backgroundColor: BRAND },

  body: { flex: 1, paddingHorizontal: 16 },

  card: { backgroundColor: '#0F172A', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#1F2937' },
  rowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },

  avatar: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden' },
  avatarGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarImg: { flex: 1, width: '100%', height: '100%' },
  avatarOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  camBadge: { position: 'absolute', right: 4, bottom: 4, backgroundColor: '#A78BFA', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 4 },

  name: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  inlineEdit: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: '#1F2937',
  },
  inlineEditText: { color: '#E5E7EB', fontWeight: '800', fontSize: 12 },

  label: { color: '#9CA3AF', fontSize: 12, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: '#1F2937', backgroundColor: '#0B1220', color: '#fff',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: Platform.select({ ios: 10, android: 8 }),
  },
  hint: { color: '#9CA3AF', fontSize: 12, marginTop: 6 },

  row: { flexDirection: 'row', gap: 10, marginTop: 10 },

  btn: { backgroundColor: BRAND, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  btnText: { color: '#0B1220', fontWeight: '900' },
  btnGhost: { backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#1F2937' },
  btnGhostText: { color: '#E5E7EB', fontWeight: '800' },

  divider: { height: 1, backgroundColor: '#1F2937', marginVertical: 10 },

  kv: { marginTop: 6 },
  kvRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 10 },
  kLabel: { color: '#9CA3AF', fontSize: 12, marginBottom: 2 },
  kValue: { color: '#E5E7EB', fontSize: 14 },

  uidPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#86EFAC' },
  uidText: { color: '#0B1220', fontWeight: '900', maxWidth: 220 },

  copiedToast: {
    marginTop: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: '#1F2937', borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  copiedText: { color: '#E5E7EB', fontWeight: '800', fontSize: 12 },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: 'transparent' },
  actionText: { color: '#0B1220', fontWeight: '900' },
  actionGhostText: { color: '#E5E7EB', fontWeight: '800' },
  uploadButton: {
  marginTop: 20,
  padding: 12,
  backgroundColor: '#6C63FF',
  borderRadius: 8,
  alignItems: 'center',
},
uploadText: {
  color: '#fff',
  fontWeight: '600',
},
});
