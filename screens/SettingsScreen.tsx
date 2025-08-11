import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Modal, Pressable, StyleSheet, Switch, Text,
  TouchableOpacity, View, Image, DeviceEventEmitter,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendPasswordResetEmail, signOut } from 'firebase/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../firebase/firebaseConfig';
import MiniPlayer from '../components/MiniPlayer';

const BG = '#141D2A';
const CARD = '#0F172A';
const BORDER = '#1F2937';
const TEXT = '#FFFFFF';
const MUTED = '#9CA3AF';
const ACCENT = '#7A00FF';

export type Sens = 'low' | 'med' | 'high';
export type Prefs = { shake: boolean; haptics: boolean; autoplay: boolean; sensitivity: Sens };
export const K_SHAKE = 'settings:shake';
export const K_HAPTICS = 'settings:haptics';
export const K_AUTOPLAY = 'settings:autoplay';
export const K_SENS = 'settings:sensitivity';
export const SETTINGS_EVENT = 'hushly:settingsChanged';

export default function SettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const user = auth.currentUser;

  const [shake, setShake] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [autoplay, setAutoplay] = useState(false);
  const [sens, setSens] = useState<Sens>('med');

  const emit = (next?: Partial<Prefs>) => {
    const prefs: Prefs = {
      shake,
      haptics,
      autoplay,
      sensitivity: sens,
      ...next,
    };
    DeviceEventEmitter.emit(SETTINGS_EVENT, prefs);
  };

  useEffect(() => {
    (async () => {
      try {
        const [s1, s2, s3, s4] = await Promise.all([
          AsyncStorage.getItem(K_SHAKE),
          AsyncStorage.getItem(K_HAPTICS),
          AsyncStorage.getItem(K_AUTOPLAY),
          AsyncStorage.getItem(K_SENS),
        ]);
        const init = {
          shake: s1 != null ? s1 === '1' : true,
          haptics: s2 != null ? s2 === '1' : true,
          autoplay: s3 != null ? s3 === '1' : false,
          sensitivity: (s4 === 'low' || s4 === 'high' ? s4 : 'med') as Sens,
        };
        setShake(init.shake);
        setHaptics(init.haptics);
        setAutoplay(init.autoplay);
        setSens(init.sensitivity);
        DeviceEventEmitter.emit(SETTINGS_EVENT, init);
      } catch {}
    })();
  }, []);

  useEffect(() => { AsyncStorage.setItem(K_SHAKE, shake ? '1' : '0'); emit({ shake }); }, [shake]);
  useEffect(() => { AsyncStorage.setItem(K_HAPTICS, haptics ? '1' : '0'); emit({ haptics }); }, [haptics]);
  useEffect(() => { AsyncStorage.setItem(K_AUTOPLAY, autoplay ? '1' : '0'); emit({ autoplay }); }, [autoplay]);
  useEffect(() => { AsyncStorage.setItem(K_SENS, sens); emit({ sensitivity: sens }); }, [sens]);

  const headerIn = useSharedValue(0);
  useEffect(() => { headerIn.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }); }, []);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerIn.value,
    transform: [{ translateY: (1 - headerIn.value) * -12 }],
  }));

  const doReset = async () => {
    if (!user?.email) return Alert.alert('No email', 'This account has no email address.');
    try {
      await sendPasswordResetEmail(auth, user.email);
      Alert.alert('Check your email', 'Password reset email sent.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not send reset email.');
    }
  };

  const [confirmVisible, setConfirmVisible] = useState(false);
  const askSignOut = () => setConfirmVisible(true);
  const cancelSignOut = () => setConfirmVisible(false);
  const doSignOut = async () => {
    setConfirmVisible(false);
    try { await signOut(auth); } catch {}
    navigation.replace('Auth');
  };

  const sensLabel = useMemo(() => (sens === 'low' ? 'Low' : sens === 'med' ? 'Medium' : 'High'), [sens]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <Animated.View style={[styles.headerRow, headerStyle]}>
        <View style={styles.backWrap}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color="#0F1220" />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 52 }} />
      </Animated.View>

      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.profileRow}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={24} color={MUTED} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{user?.displayName ?? 'Friend'}</Text>
              <Text style={styles.profileEmail}>{user?.email ?? '—'}</Text>
            </View>
            <Pressable style={styles.editBtn} onPress={() => navigation.navigate('Profile')}>
              <Ionicons name="create-outline" size={18} color="#E5E7EB" />
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          </View>

          <View style={styles.uidRow}>
            <Text style={styles.muted}>UID</Text>
            <Text style={styles.uid} selectable>{user?.uid ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>App</Text>
          <RowSwitch icon="motion-sensor" title="Shake detection" value={shake} onChange={setShake} />
          <RowSwitch icon="phone-portrait-outline" title="Haptic feedback" value={haptics} onChange={setHaptics} />
          <RowSwitch icon="play-circle-outline" title="Auto-play ambient on session start" value={autoplay} onChange={setAutoplay} />
          <View style={styles.rowBetween}>
            <View style={styles.rowLeft}>
              <Ionicons name="speedometer-outline" size={20} color="#E5E7EB" />
              <Text style={styles.rowTitle}>Shake sensitivity</Text>
            </View>
            <View style={styles.sensWrap}>
              <Chip label="Low"  active={sens === 'low'}  onPress={() => setSens('low')} />
              <Chip label="Med"  active={sens === 'med'}  onPress={() => setSens('med')} />
              <Chip label="High" active={sens === 'high'} onPress={() => setSens('high')} />
            </View>
          </View>
          <Text style={styles.helper}>Current: {sensLabel}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Pressable style={styles.primaryBtn} onPress={doReset}><Text style={styles.primaryText}>Change password</Text></Pressable>
          <Pressable style={[styles.primaryBtn, { backgroundColor: '#EF444433', borderColor: '#EF4444' }]} onPress={askSignOut}>
            <Text style={[styles.primaryText, { color: '#FCA5A5' }]}>Sign out</Text>
          </Pressable>
        </View>
        <View style={{ height: 110 }} />
      </View>
      <MiniPlayer />
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={cancelSignOut}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sign out?</Text>
            <Text style={styles.modalMsg}>We’ll take you back to the sign-in screen.</Text>
            <View style={styles.modalRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={cancelSignOut}>
                <Text style={[styles.modalBtnText, { color: '#94A3B8' }]}>Stay</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalConfirm]} onPress={doSignOut}>
                <Text style={[styles.modalBtnText, { color: 'white' }]}>Sign out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function RowSwitch({
  title, icon, value, onChange,
}: { title: string; icon: any; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.rowBetween}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon as any} size={20} color="#E5E7EB" />
        <Text style={styles.rowTitle}>{title}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} thumbColor="#FFFFFF" trackColor={{ false: '#374151', true: ACCENT }} />
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? styles.chipActive : null]} android_ripple={{ color: '#ffffff14' }}>
      <Text style={[styles.chipText, active && { color: TEXT }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  body: { flex: 1, paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 10 },
  backWrap: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 8,
  },
  backBtn: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { color: TEXT, fontSize: 22, fontWeight: '900' },

  card: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 16, padding: 14, marginTop: 12 },
  sectionTitle: { color: TEXT, fontWeight: '900', fontSize: 14, marginBottom: 8 },

  profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1F2937', marginRight: 12 },
  avatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24, marginRight: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1F2937',
  },
  profileName: { color: TEXT, fontWeight: '800', fontSize: 16 },
  profileEmail: { color: MUTED, fontSize: 12, marginTop: 2 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
  },
  editText: { color: '#E5E7EB', fontWeight: '700', marginLeft: 6, fontSize: 12 },

  uidRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  muted: { color: MUTED, fontSize: 12 },
  uid: { color: TEXT, fontSize: 12 },

  rowBetween: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#111827', borderWidth: 1, borderColor: BORDER, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10, marginTop: 8,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { color: '#E5E7EB', fontWeight: '700', marginLeft: 10 },

  sensWrap: { flexDirection: 'row', gap: 6 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1, borderColor: '#334155', backgroundColor: 'rgba(255,255,255,0.06)',
  },
  chipActive: { borderColor: ACCENT, backgroundColor: ACCENT },
  chipText: { color: '#E5E7EB', fontWeight: '800', fontSize: 12 },

  helper: { color: '#B6C2D2', fontSize: 12, marginTop: 6 },

  primaryBtn: {
    borderWidth: 1, borderColor: '#334155', backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, marginTop: 8, alignItems: 'center',
  },
  primaryText: { color: '#E5E7EB', fontWeight: '800' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(10,12,20,0.66)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '84%', backgroundColor: CARD, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: BORDER },
  modalTitle: { color: TEXT, fontSize: 18, fontWeight: '900', marginBottom: 8 },
  modalMsg: { color: '#B6C2D2', fontSize: 14, marginBottom: 14 },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  modalCancel: { backgroundColor: 'rgba(255,255,255,0.06)' },
  modalConfirm: { backgroundColor: ACCENT },
  modalBtnText: { fontWeight: '800' },
});
