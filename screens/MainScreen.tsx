import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Platform, ScrollView, Image, Modal, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { theme } from '../styles/theme';
import { CommonActions } from '@react-navigation/native';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/firebaseConfig';
import { audioManager } from '../services/audioManager';

const BRAND = '#7A00FF';
const BRAND2 = '#9B5CFF';
const BG = theme.colors?.background ?? '#141D2A';

type CardProps = {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onPress: () => void;
  delay?: number;
};

const APressable = Animated.createAnimatedComponent(Pressable);

function StyledModal({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) });
      opacity.value = withTiming(1, { duration: 180 });
    } else {
      opacity.value = withTiming(0, { duration: 140 });
      scale.value = withTiming(0.9, { duration: 140 });
    }
  }, [visible]);

  const wrapStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <Animated.View style={[styles.modalBackdrop, wrapStyle]}>
        <Animated.View style={[styles.modalCard, cardStyle]}>
          <Text style={styles.modalTitle}>{title}</Text>
          {!!message && <Text style={styles.modalMsg}>{message}</Text>}
          <View style={styles.modalRow}>
            <TouchableOpacity style={[styles.modalBtn, styles.modalCancel]} onPress={onCancel}>
              <Text style={[styles.modalBtnText, { color: '#94A3B8' }]}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, styles.modalConfirm]} onPress={onConfirm}>
              <Text style={[styles.modalBtnText, { color: 'white' }]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function ActionCard({ title, subtitle, icon, onPress, delay = 0 }: CardProps) {
  const enter = useSharedValue(0);
  useEffect(() => {
    enter.value = withDelay(delay, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 14 }, { scale: 0.98 + enter.value * 0.02 }],
  }));
  const pressed = useSharedValue(0);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.value * 0.03 }] }));
  return (
    <APressable
      onPressIn={() => (pressed.value = withTiming(1, { duration: 80 }))}
      onPressOut={() => (pressed.value = withTiming(0, { duration: 120 }))}
      onPress={onPress}
      style={[styles.card, style, pressStyle]}
    >
      <View style={styles.cardIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={22} color="#CBD5E1" />
    </APressable>
  );
}

function ProgressRing({ size = 72, stroke = 8, progress = 0.65, color = BRAND }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * Math.min(Math.max(progress, 0), 1);
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke="#1F2A44" strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={`${dash}, ${c - dash}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

export default function MainScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const [displayName, setDisplayName] = useState<string>('…');
  const [email, setEmail] = useState<string>('…');
  const [photoURL, setPhotoURL] = useState<string>('');

  const [playing, setPlaying] = useState<boolean>(false);
  const trackUri = 'https://cdn.pixabay.com/audio/2021/10/26/audio_46c1a0b2c3.mp3'; 

  useEffect(() => {
    const off = audioManager.addListener(setPlaying);
    return off;
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      setEmail(user.email ?? 'unknown@email');
      setDisplayName(user.displayName ?? 'Friend');
      setPhotoURL(user.photoURL ?? '');
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data() as any;
          if (data.displayName) setDisplayName(data.displayName);
          if (data.photoURL) setPhotoURL(data.photoURL);
          if (data.email) setEmail(data.email);
        }
      } catch {}
    });
    return unsub;
  }, []);

  const [shakeOn, setShakeOn] = useState(true);

  const todayCalmMinutes = 14, todayGoal = 20;
  const progress = Math.min(todayCalmMinutes / todayGoal, 1);
  const hasResume = false;

  const orb = useSharedValue(0);
  useEffect(() => {
    orb.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);
  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.94 + orb.value * 0.12 }],
    opacity: 0.85 + orb.value * 0.15,
  }));

  const headerIn = useSharedValue(0);
  useEffect(() => { headerIn.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }); }, []);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerIn.value, transform: [{ translateY: (1 - headerIn.value) * -12 }],
  }));

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }, []);

  const [confirmVisible, setConfirmVisible] = useState(false);
  const askSignOut = () => setConfirmVisible(true);
  const cancelSignOut = () => setConfirmVisible(false);

  const doSignOut = async () => {
  setConfirmVisible(false);
  try {
    await audioManager.stop();
    await signOut(auth);
  } catch {}
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'Onboarding' }],
    })
  );
};

  const onPlayPause = async () => {
    if (playing) {
      await audioManager.pause();
    } else {
      await audioManager.play(trackUri);
    }
  };
  const onStop = async () => { await audioManager.stop(); };

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#181F30', '#0F1623']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollBody,
          { paddingTop: headerHeight + Math.max(insets.top, 10) + 8, paddingBottom: insets.bottom + 90},
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.header, headerStyle]}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{displayName}</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('Notifications')} style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={22} color="#E5E7EB" />
          </Pressable>
        </Animated.View>

        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {photoURL ? (
              <Image source={{ uri: photoURL }} style={styles.avatarImg} />
            ) : (
              <LinearGradient colors={['#232C44', '#182034']} style={styles.avatarPlaceholder} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name="person" size={28} color="#9CA3AF" />
              </LinearGradient>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileEmail}>{email}</Text>
          </View>

          <Pressable style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
            <Ionicons name="create-outline" size={18} color="#E5E7EB" />
            <Text style={styles.profileBtnText}>Edit</Text>
          </Pressable>

          <Pressable style={[styles.profileBtn, { marginLeft: 8 }]} onPress={askSignOut}>
            <Ionicons name="log-out-outline" size={18} color="#FCA5A5" />
            <Text style={[styles.profileBtnText, { color: '#FCA5A5' }]}>Sign out</Text>
          </Pressable>
        </View>

        <View style={styles.topRow}>
          <Animated.View style={[styles.orbWrap, orbStyle]}>
            <LinearGradient colors={[BRAND, BRAND2]} style={styles.orb} start={{ x: 0.2, y: 0 }} end={{ x: 1, y: 1 }} />
          </Animated.View>

          <View style={styles.todayCard}>
            <ProgressRing size={72} stroke={8} progress={progress} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.todayLabel}>Today</Text>
              <Text style={styles.todayValue}>{todayCalmMinutes} / {todayGoal}m</Text>
              <Text style={styles.todayHint}>Keep it up</Text>
            </View>
          </View>
        </View>

        <View style={styles.rowCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="motion-sensor" size={22} color="#E5E7EB" />
            <Text style={styles.rowTitle}>Shake detection</Text>
          </View>
          <Switch
            value={shakeOn}
            onValueChange={setShakeOn}
            thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
            trackColor={{ false: '#374151', true: BRAND }}
          />
        </View>

        <View style={styles.grid}>
          <ActionCard title="Start Session" subtitle="Guided breathing"
            icon={<Ionicons name="leaf-outline" size={20} color="#E5E7EB" />} delay={60}
            onPress={() => navigation.navigate('Session')} />
          <ActionCard title="Quick Breathe • 1 min" subtitle="4–2–6 pattern"
            icon={<Ionicons name="time-outline" size={20} color="#E5E7EB" />} delay={100}
            onPress={() => navigation.navigate('Session', { quick: 60 })} />
          <ActionCard title="Ambient Sounds" subtitle="Rain • Forest • Brown noise"
            icon={<Ionicons name="musical-notes-outline" size={20} color="#E5E7EB" />} delay={140}
            onPress={() => navigation.navigate('Sounds')} />
          <ActionCard title="Track Mood" subtitle="2-tap journal"
            icon={<Ionicons name="happy-outline" size={20} color="#E5E7EB" />} delay={180}
            onPress={() => navigation.navigate('Mood')} />
          <ActionCard title="Profile" subtitle="Stats & achievements"
            icon={<Ionicons name="person-circle-outline" size={20} color="#E5E7EB" />} delay={220}
            onPress={() => navigation.navigate('Profile')} />
          <ActionCard title="Settings" subtitle="Sensitivity • Haptics"
            icon={<Ionicons name="settings-outline" size={20} color="#E5E7EB" />} delay={260}
            onPress={() => navigation.navigate('Settings')} />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={[styles.miniPlayer, { paddingBottom: insets.bottom + 8 }]}>
        <Ionicons name="musical-notes" size={18} color="#E5E7EB" />
        <Text style={styles.miniTitle} numberOfLines={1}>Ambient — Focus Tones</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={onPlayPause} style={styles.ctrlBtn}>
            <Ionicons name={playing ? 'pause' : 'play'} size={18} color="#0F172A" />
          </Pressable>
          <Pressable onPress={onStop} style={[styles.ctrlBtn, { backgroundColor: '#FCA5A5' }]}>
            <Ionicons name="stop" size={16} color="#0F172A" />
          </Pressable>
        </View>
      </View>
  
      <StyledModal
        visible={confirmVisible}
        title="Sign out?"
        message="We’ll stop any playing audio and take you to the sign-in screen."
        confirmText="Sign out"
        cancelText="Stay"
        onConfirm={doSignOut}
        onCancel={cancelSignOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { 
    flex: 1, 
    backgroundColor: BG 
  },
  scrollBody: { 
    paddingHorizontal: 18 
  },
  header: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 14,
  },
  greeting: { 
    color: '#BFC8D8', 
    fontSize: 14 
  },
  name: { color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
    marginTop: 2 
  },
  iconBtn: {
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  profileCard: {
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: '#0F172A', 
    borderRadius: 16,
    paddingHorizontal: 14, 
    paddingVertical: 12,
    borderWidth: 1, 
    borderColor: '#1F2937', 
    marginBottom: 12,
  },
  avatarWrap: { 
    marginRight: 12 
  },
  avatarImg: { 
    width: 48,
    height: 48,
    borderRadius: 24, backgroundColor: '#1F2937' },
  avatarPlaceholder: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  profileName: { 
    color: 'white', 
    fontWeight: '800', 
    fontSize: 16 
  },
  profileEmail: { 
    color: '#9CA3AF', 
    fontSize: 12, 
    marginTop: 2 
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderRadius: 12, 
    marginLeft: 8,
  },
  profileBtnText: { 
    color: '#E5E7EB', 
    fontWeight: '700', 
    marginLeft: 6, 
    fontSize: 12 
  },
  topRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 14 
  },
  orbWrap: {
    width: 110, 
    height: 110, 
    borderRadius: 55,
    marginRight: 12,
    backgroundColor: 'rgba(122,0,255,0.20)',
    alignItems: 'center', 
    justifyContent: 'center',
  },
  orb: { 
    width: 92, 
    height: 92, 
    borderRadius: 46 
  },
  todayCard: {
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center',
    backgroundColor: '#111827', 
    borderRadius: 16, 
    padding: 12,
    borderWidth: 1, 
    borderColor: '#1F2937',
  },
  todayLabel: { 
    color: '#9CA3AF', 
    fontSize: 12 
  },
  todayValue: { 
    color: '#FFFFFF', 
    fontSize: 18, 
    fontWeight: '800', 
    marginTop: 2 },
  todayHint: { 
    color: '#BFC8D8', 
    fontSize: 12, 
    marginTop: 2 
  },
  rowCard: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    backgroundColor: '#111827', 
    borderRadius: 16, 
    paddingHorizontal: 14, 
    paddingVertical: 12,
    borderWidth: 1, 
    borderColor: '#1F2937', 
    marginTop: 10,
  },
  rowTitle: { 
    color: '#E5E7EB', 
    fontWeight: '700', 
    marginLeft: 10 
  },
  grid: { 
    marginTop: 12, 
    gap: 10 
  },
  card: {
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingVertical: 14, 
    paddingHorizontal: 14,
    borderWidth: 1, 
    borderColor: '#1F2937',
    gap: 12,
  },
  cardIcon: {
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cardTitle: { 
    color: '#FFFFFF', 
    fontWeight: '800', 
    fontSize: 16, 
    marginBottom: 2 
  },
  cardSubtitle: { 
    color: '#9CA3AF',
    fontSize: 12 
  },
  miniPlayer: {
    position: 'absolute', 
    left: 12, 
    right: 12, 
    bottom: 0,
    backgroundColor: '#0B1220', 
    borderColor: '#1F2937', 
    borderWidth: 1,
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    borderRadius: 14,
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10,
    shadowColor: '#000', 
    shadowOpacity: 0.2, 
    shadowRadius: 8, 
    elevation: 8,
  },
  miniTitle: { 
    color: '#E5E7EB',
    fontWeight: '700',
    flex: 1 
    },
  ctrlBtn: {
    width: 36, 
    height: 36, 
    borderRadius: 18,
    backgroundColor: '#86EFAC',
    alignItems: 'center', 
    justifyContent: 'center',
  },
  modalBackdrop: { flex: 1,
    backgroundColor: 'rgba(10,12,20,0.66)',
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  modalCard: {
    width: '84%', 
    backgroundColor: '#0F172A', 
    borderRadius: 18, 
    padding: 18,
    borderWidth: 1, 
    borderColor: '#1F2937',
  },
  modalTitle: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: '900', 
    marginBottom: 8 
  },
  modalMsg: { 
    color: '#B6C2D2', 
    fontSize: 14, 
    marginBottom: 14 },
  modalRow: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    gap: 10 
  },
  modalBtn: { 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    borderRadius: 12 
  },
  modalCancel: { 
    backgroundColor: 'rgba(255,255,255,0.06)' 
  },
  modalConfirm: { 
    backgroundColor: BRAND 
  },
  modalBtnText: { 
    fontWeight: '800' 
  },
});
