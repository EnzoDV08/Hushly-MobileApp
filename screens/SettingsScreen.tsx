import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Alert, Pressable, StyleSheet, Switch, Text,
  TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { sendPasswordResetEmail, signOut } from 'firebase/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../firebase/firebaseConfig';
import FABBack from '../components/FABBack';


import { Settings, Sens, Hand } from '../services/settings';

const BG = '#141D2A';
const CARD = '#0F172A';
const BORDER = '#1F2937';
const TEXT = '#FFFFFF';
const ACCENT = '#7A00FF';

export default function SettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const user = auth.currentUser;

  const [haptics, setHaptics] = useState(true);
  const [autoplay, setAutoplay] = useState(false);
  const [sens, setSens] = useState<Sens>('med');

  const [oneHand, setOneHand] = useState(false);
  const [hand, setHand] = useState<Hand>('auto');

  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const confirmProg = useSharedValue(0);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const confirmBarStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: confirmProg.value }],
    opacity: confirmingLogout ? 0.9 : 0,
  }));

  const clearLogoutTimer = () => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  };

  const startLogoutConfirm = () => {
    setConfirmingLogout(true);
    confirmProg.value = 1; 
    confirmProg.value = withTiming(0, { duration: 3000, easing: Easing.linear });
    clearLogoutTimer();
    logoutTimerRef.current = setTimeout(() => {
      setConfirmingLogout(false);
    }, 3100);
  };

  const cancelLogoutConfirm = () => {
    clearLogoutTimer();
    setConfirmingLogout(false);
    confirmProg.value = 0;
  };

  const doSignOut = async () => {
    clearLogoutTimer();
    setConfirmingLogout(false);
    confirmProg.value = 0;
    try { await signOut(auth); } catch {}
    navigation.replace('Auth');
  };

  useEffect(() => {
    const unsub = Settings.subscribe((p) => {
      setHaptics(p.haptics);
      setAutoplay(p.autoplay);
      setSens(p.sensitivity);
      setOneHand(p.oneHand);
      setHand(p.hand);
    });
    Settings.load().then((p) => {
      setHaptics(p.haptics);
      setAutoplay(p.autoplay);
      setSens(p.sensitivity);
      setOneHand(p.oneHand);
      setHand(p.hand);
    });
    return unsub;
  }, []);

  useEffect(() => { Settings.update({ haptics }); }, [haptics]);
  useEffect(() => { Settings.update({ autoplay }); }, [autoplay]);
  useEffect(() => { Settings.update({ sensitivity: sens }); }, [sens]);
  useEffect(() => { Settings.update({ oneHand }); }, [oneHand]);
  useEffect(() => { Settings.update({ hand }); }, [hand]);

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

  const sensLabel = useMemo(() => (sens === 'low' ? 'Low' : sens === 'med' ? 'Medium' : 'High'), [sens]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <Animated.View style={[styles.headerRow, headerStyle]}>
      <View style={{ width: 52 }} />
      <Text style={styles.title}>Settings</Text>
      <View style={{ width: 52 }} />
      </Animated.View>
      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>App</Text>
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
          <View style={[styles.rowBetween, { marginTop: 10 }]}>
            <View style={styles.rowLeft}>
              <Ionicons name="hand-left-outline" size={20} color="#E5E7EB" />
              <Text style={styles.rowTitle}>One-handed mode</Text>
            </View>
            <Switch value={oneHand} onValueChange={setOneHand} thumbColor="#FFFFFF" trackColor={{ false: '#374151', true: ACCENT }} />
          </View>

          <View style={[styles.rowBetween, { opacity: oneHand ? 1 : 0.5 }]}>
            <View style={styles.rowLeft}>
              <Ionicons name="swap-horizontal-outline" size={20} color="#E5E7EB" />
              <Text style={styles.rowTitle}>Preferred side</Text>
            </View>
            <View style={styles.sensWrap}>
              <Chip label="Left"  active={hand === 'left'}  onPress={() => oneHand && setHand('left')} />
              <Chip label="Right" active={hand === 'right'} onPress={() => oneHand && setHand('right')} />
              <Chip label="Auto"  active={hand === 'auto'}  onPress={() => oneHand && setHand('auto')} />
            </View>
          </View>
          <Text style={styles.helper}>Moves key buttons to your thumb’s side.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Pressable style={styles.primaryBtn} onPress={doReset}><Text style={styles.primaryText}>Change password</Text></Pressable>
          <View style={{ gap: 8 }}>
            {!confirmingLogout ? (
              <Pressable
                style={[styles.primaryBtn, { backgroundColor: '#EF444433', borderColor: '#EF4444' }]}
                onPress={startLogoutConfirm}
                android_ripple={{ color: '#ffffff14' }}
              >
                <Text style={[styles.primaryText, { color: '#FCA5A5' }]}>Sign out</Text>
              </Pressable>
            ) : (
              <View>
                <Pressable
                  style={[styles.primaryBtn, { backgroundColor: '#EF444433', borderColor: '#EF4444' }]}
                  onPress={doSignOut}
                  android_ripple={{ color: '#ffffff14' }}
                >
                  <Text style={[styles.primaryText, { color: '#FCA5A5' }]}>Tap again to sign out</Text>
                </Pressable>
              <Animated.View style={[styles.confirmBar, confirmBarStyle]} />
                <TouchableOpacity onPress={cancelLogoutConfirm} style={{ alignSelf: 'center', marginTop: 6 }}>
                  <Text style={{ color: '#94A3B8', fontWeight: '800', fontSize: 12 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        <View style={{ height: 110 }} />
      </View>
      <FABBack onPress={() => navigation.goBack()} bottomOffset={10} />
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
  title: { color: TEXT, fontSize: 22, fontWeight: '900' },

  card: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 16, padding: 14, marginTop: 12 },
  sectionTitle: { color: TEXT, fontWeight: '900', fontSize: 14, marginBottom: 8 },

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
  confirmBar: {
  marginTop: 6,
  alignSelf: 'center',
  width: '92%',
  height: 3,
  borderRadius: 999,
  backgroundColor: '#EF4444',
  transform: [{ scaleX: 0 }],
  transformOrigin: 'left', 
},
});
