import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { audioManager } from '../services/audioManager';
import { createSession } from '../services/sessionService';
import { useShakeIntensity } from '../hooks/useShakeIntensity';
import MiniPlayer from '../components/MiniPlayer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings, Sens, Prefs } from '../services/settings';
import FABBack, { FAB_BACK_SIZE } from '../components/FABBack';

const BG = '#141D2A';
const BRAND = '#7A00FF';
const BRAND2 = '#9B5CFF';
const STILLNESS_MS = 2800;
const CALM_FLOOR = 0.06; 
const FAB_SHIFT_DOWN = 16;

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const DEFAULT_TRACK_ID = 'rain';

const BUILT_IN_URIS: Record<string, string> = {
  rain:       'https://firebasestorage.googleapis.com/v0/b/hushly-mobile.firebasestorage.app/o/rain.mp3?alt=media',
  ocean:      'https://firebasestorage.googleapis.com/v0/b/hushly-mobile.firebasestorage.app/o/ocean.mp3?alt=media',
  forest:     'https://firebasestorage.googleapis.com/v0/b/hushly-mobile.firebasestorage.app/o/forest.mp3?alt=media',
  windchimes: 'https://firebasestorage.googleapis.com/v0/b/hushly-mobile.firebasestorage.app/o/wind-chimes.mp3?alt=media',
};


async function getPreferredAudio(): Promise<{ uri: string; id: string }> {
  try {
    let prefId = await AsyncStorage.getItem('preferredTrackId');
    const prefUri = await AsyncStorage.getItem('preferredTrackUri');

    if (prefId && !BUILT_IN_URIS[prefId]) {
      prefId = null;
      await AsyncStorage.removeItem('preferredTrackId');
    }

    if (prefId && BUILT_IN_URIS[prefId]) {
      return { id: prefId, uri: BUILT_IN_URIS[prefId] };
    }

    if (prefUri) {
      return { id: 'custom', uri: prefUri };
    }

    await AsyncStorage.setItem('preferredTrackId', DEFAULT_TRACK_ID);
    const defUri = BUILT_IN_URIS[DEFAULT_TRACK_ID];
    await AsyncStorage.setItem('preferredTrackUri', defUri);
    return { id: DEFAULT_TRACK_ID, uri: defUri };
  } catch {
    const defUri = BUILT_IN_URIS[DEFAULT_TRACK_ID];
    return { id: DEFAULT_TRACK_ID, uri: defUri };
  }
}

type Phase = 'Inhale' | 'Hold' | 'Exhale';

export default function SessionScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

const [prefs, setPrefs] = useState<Prefs>({
  shake: true,
  haptics: true,
  autoplay: false,
  sensitivity: 'med',
  oneHand: false,   
  hand: 'auto',     
});

const [miniH, setMiniH] = useState(0);
const miniVisible = miniH > 8;
const fabBottomOffset = miniVisible ? Math.max(0, (miniH - FAB_BACK_SIZE) / 2) : 0;

  const thresholdMap: Record<Sens, { start: number; stop: number }> = {
  low:  { start: 0.45, stop: 0.20 },
  med:  { start: 0.30, stop: 0.12 },
  high: { start: 0.20, stop: 0.08 },
};

useEffect(() => {
  Settings.load().then((p) => setPrefs(p));
  const unsub = Settings.subscribe(setPrefs);
  return unsub;
}, []);

  const map = {
    low:  { start: 0.45, stop: 0.20 },
    med:  { start: 0.30, stop: 0.12 },
    high: { start: 0.20, stop: 0.08 },
  }[prefs.sensitivity];

  const { intensity, isShaking } = useShakeIntensity(prefs.shake, {
    intervalMs: 45,
    alpha: 0.18,
    startThreshold: map.start,
    stopThreshold: map.stop,
    graceMs: 1000,
  });

  const sessionStartRef = useRef<number | null>(null);
  const activeStartRef = useRef<number | null>(null);
  const stressedAccumRef = useRef(0);
  const tickIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [stressedMs, setStressedMs] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const firstCalmRef = useRef<number | null>(null);
  const hasShakenRef = useRef(false);
  const calmSinceRef = useRef<number | null>(null);


  const [peak, setPeak] = useState(0);
  useEffect(() => {
  const currentPct = clamp01(intensity / 1.2);
  setPeak((p) => Math.max(p, currentPct));     
  }, [intensity]);


    useEffect(() => {
      (async () => {
        if (!prefs.autoplay) return;

        const s = audioManager.getState();
        const { id, uri } = await getPreferredAudio();

        if (!s.playing || s.source?.id !== id) {
          try {
            await audioManager.playLoop(uri, typeof s.volume === 'number' ? s.volume : 0.55, id);
          } catch (e) {
            console.log('[audio] playLoop failed', e);
          }
        }
      })();
    }, [prefs.autoplay]);



  useEffect(() => {
  const now = Date.now();
  const trulyStill = intensity < CALM_FLOOR;

  if (isShaking) {
    calmSinceRef.current = null;

    if (sessionStartRef.current == null) sessionStartRef.current = now;
    if (activeStartRef.current == null)  activeStartRef.current  = now;
    hasShakenRef.current = true;

    if (!tickIdRef.current) {
      tickIdRef.current = setInterval(() => {
        const base = stressedAccumRef.current;
        const live = activeStartRef.current ? Date.now() - activeStartRef.current : 0;
        setStressedMs(base + live);
      }, 100);
    }
  } else {
    if (activeStartRef.current != null) {
      stressedAccumRef.current += now - activeStartRef.current;
      activeStartRef.current = null;
    }
    if (tickIdRef.current) {
      clearInterval(tickIdRef.current);
      tickIdRef.current = null;
    }
    setStressedMs(stressedAccumRef.current);

    if (hasShakenRef.current) {
      if (trulyStill) {
        if (calmSinceRef.current == null) calmSinceRef.current = now;

        if (now - calmSinceRef.current >= STILLNESS_MS) {
          if (firstCalmRef.current == null) {
            firstCalmRef.current = stressedAccumRef.current;
            if (prefs.haptics) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
          }
          setShowResult(true); 
        }
      } else {
        calmSinceRef.current = null;
      }
    }
  }

  return () => {};
}, [isShaking, intensity, prefs.haptics]);

  useEffect(() => {
    return () => { if (tickIdRef.current) clearInterval(tickIdRef.current); };
  }, []);

  const breath = useSharedValue(1);
  const BREATH_IN = 4200;
  const BREATH_HOLD = 2200;
  const BREATH_OUT = 4200;
  useEffect(() => {
    breath.value = withRepeat(
      withSequence(
        withTiming(1.32, { duration: BREATH_IN, easing: Easing.inOut(Easing.cubic) }),
        withTiming(1.32, { duration: BREATH_HOLD }),
        withTiming(1.0, { duration: BREATH_OUT, easing: Easing.inOut(Easing.cubic) }),
      ),
      -1,
      true,
    );
  }, []);
  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }] }));

  const pulse = useSharedValue(0);
  useEffect(() => { pulse.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, true); }, []);
  const haloStyle = useAnimatedStyle(() => {
    const i = Math.max(0, Math.min(1, intensity / 1.2));
    const scale = 1 + i * 0.9 + pulse.value * 0.15;
    const opacity = 0.16 + i * 0.68;
    return { transform: [{ scale }], opacity };
  });

  const [phase, setPhase] = useState<Phase>('Inhale');
  const lastPhaseRef = useRef<Phase>('Inhale');
  useEffect(() => {
    const total = BREATH_IN + BREATH_HOLD + BREATH_OUT;
    const id = setInterval(() => {
      const t = Date.now() % total;
      const next: Phase = t < BREATH_IN ? 'Inhale' : t < BREATH_IN + BREATH_HOLD ? 'Hold' : 'Exhale';
      if (next !== lastPhaseRef.current) {
        lastPhaseRef.current = next;
        if (prefs.haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setPhase(next);
    }, 150);
    return () => clearInterval(id);
  }, [prefs.haptics]);

  const [meterW, setMeterW] = useState(1);
  const onMeterLayout = (e: LayoutChangeEvent) => setMeterW(e.nativeEvent.layout.width);

  const indX = useSharedValue(0);
  useEffect(() => {
    const pct = Math.max(0, Math.min(1, intensity / 1.2));
    indX.value = withTiming(pct, { duration: 180, easing: Easing.out(Easing.cubic) });
  }, [intensity]);
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: indX.value * (meterW - 20) }] }));

  const peakPct = clamp01(peak);
  const statusLabel = !hasShakenRef.current ? 'Ready' : isShaking ? 'Shaking' : 'Calm';
  const statusBg = !hasShakenRef.current ? 'rgba(255,255,255,0.08)' : isShaking ? '#F59E0B33' : '#10B98133';
  const statusDot = !hasShakenRef.current ? '#9CA3AF' : isShaking ? '#F59E0B' : '#10B981';

  const mmss = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  };

  const restartTimer = async () => {
    if (prefs.haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (tickIdRef.current) { clearInterval(tickIdRef.current); tickIdRef.current = null; }
    sessionStartRef.current = null;
    activeStartRef.current = null;
    stressedAccumRef.current = 0;
    firstCalmRef.current = null;
    calmSinceRef.current = null;
    hasShakenRef.current = false;
    setStressedMs(0);
    setShowResult(false);
    setPeak(0);
  };

    const finishAndSave = async () => {
      if (activeStartRef.current != null) {
        stressedAccumRef.current += Date.now() - activeStartRef.current;
        activeStartRef.current = null;
      }

      const totalStressed = stressedAccumRef.current;
      const started = sessionStartRef.current ?? Date.now();

      const payload = {
        startedAt: started,
        relaxedAt: Date.now(),
        durationMs: totalStressed,
        timeToRelaxMs: firstCalmRef.current ?? totalStressed,
        peakPct: clamp01(peak),  
      };

      console.log('[SessionScreen] ===== START SAVE =====');
      console.log('[SessionScreen] Payload:', payload);

      try {
        const docId = await createSession(payload);  
        console.log('[SessionScreen] SAVE SUCCESS — ID:', typeof docId === 'string' ? docId : '(no id returned)');
      } catch (e) {
        console.log('[SessionScreen] SAVE FAILED — Error:', e);
      }

      console.log('[SessionScreen] ===== END SAVE =====');

      navigation.goBack();
    };


  const onContinue = () => setShowResult(false);
  const bottomOffset = insets.bottom + 100;

  const backPeek = useSharedValue(-6);
  useEffect(() => { backPeek.value = withTiming(0, { duration: 420 }); }, []);
  const backWrapStyle = useAnimatedStyle(() => ({ transform: [{ translateX: backPeek.value }] }));

  const phaseColor = phase === 'Inhale' ? '#7dd3fc' : phase === 'Hold' ? '#fde68a' : '#86efac';

  return (
    <View style={[s.screen, { paddingTop: insets.top + 8 }]}>
      <View style={s.headerRow}>
        <Animated.View style={[s.backWrap, backWrapStyle]}>
        </Animated.View>
        <Text style={s.title}>Shake to release tension</Text>
        <View style={[s.statusChip, { backgroundColor: statusBg }]}>
          <View style={[s.dot, { backgroundColor: statusDot }]} />
          <Text style={s.statusText}>{statusLabel}</Text>
        </View>
      </View>

      <View style={[s.body, { paddingBottom: bottomOffset }]}>
        <View style={s.centerWrap}>
          <Animated.View style={[s.halo, haloStyle]} />
          <Animated.View style={[s.orb, orbStyle]}>
            <Text style={[s.orbLabelTop, { color: phaseColor }]}>
              {phase === 'Inhale' && 'inhale • expand'}
              {phase === 'Hold' && 'hold • soft'}
              {phase === 'Exhale' && 'exhale • release'}
            </Text>
            <View style={s.orbInner} />
          </Animated.View>
        </View>

        <Text style={s.timer}>{mmss(stressedMs)}</Text>
        <Text style={s.hint}>{isShaking ? 'Timer counts while you shake.' : hasShakenRef.current ? 'You’re calm. Continue or finish.' : 'Timer starts when you shake.'}</Text>

        <View style={s.meterBlock}>
          <View onLayout={onMeterLayout} style={s.meterTrack}>
            <View style={[s.meterFill, { width: `${Math.max(2, Math.min(100, (intensity / 1.2) * 100))}%` }]} />
            <View style={[s.peakMarker, { left: Math.max(6, Math.min(meterW - 6, peakPct * meterW)) - 6 }]} />
            <Animated.View style={[s.arrowWrap, arrowStyle]}><Ionicons name="caret-down" size={16} color="#E5E7EB" /></Animated.View>
          </View>
          <View style={s.meterLabels}>
            <Text style={[s.meterLabel, { textAlign: 'left' }]}>calm</Text>
            <Text style={[s.meterLabel, { textAlign: 'right' }]}>active</Text>
          </View>
          <Text style={s.peakBadge}>Peak {Math.round(peakPct * 100)}% • Current {Math.round(Math.max(0, Math.min(1, intensity / 1.2)) * 100)}%</Text>
        </View>

        <View style={s.row}>
          <Pressable onPress={restartTimer} style={[s.btn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}><Text style={s.btnText}>Restart timer</Text></Pressable>
          <Pressable onPress={finishAndSave} style={[s.btn, { backgroundColor: BRAND }]}><Text style={s.btnText}>Save & Finish</Text></Pressable>
        </View>
      </View>
      
      <MiniPlayer
        onHeight={setMiniH}
        dockSide={prefs.hand === 'left' ? 'right' : 'left'} 
        narrowWidth={280}
        edgeMargin={12}
      />

    <FABBack
      onPress={() => navigation.goBack()}
      bottomOffset={
        miniVisible
          ? fabBottomOffset - FAB_SHIFT_DOWN 
          : -FAB_SHIFT_DOWN + 20                
      }
    />

      {showResult && (
        <>
          <View pointerEvents="auto" style={s.modalScrim} />

          <ResultSheet
            stressedMs={stressedMs}
            firstCalmMs={firstCalmRef.current ?? stressedMs}
            onContinue={onContinue}
            onFinish={finishAndSave}
            bottomOffset={bottomOffset}
          />
        </>
      )}
    </View>
  );
}

function ResultSheet({
  stressedMs, firstCalmMs, onContinue, onFinish, bottomOffset,
}: { stressedMs: number; firstCalmMs: number; onContinue: () => void; onFinish: () => void; bottomOffset: number }) {
  const y = useSharedValue(40);
  const op = useSharedValue(0);
  useEffect(() => { y.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) }); op.value = withTiming(1, { duration: 220 }); }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: op.value }));

  const mmss = (ms: number) => {
    const s = Math.floor(ms / 1000); const m = Math.floor(s / 60); const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  };

  return (
    <Animated.View style={[s.resultCard, style, { bottom: bottomOffset + 12 }]}>
      <Text style={s.resultTitle}>Calm detected</Text>
      <Text style={s.resultLine}>Time to calm: <Text style={s.bold}>{mmss(firstCalmMs)}</Text></Text>
      <Text style={s.resultLine}>Session so far: <Text style={s.bold}>{mmss(stressedMs)}</Text></Text>
      <View style={[s.row, { marginTop: 12 }]}>
        <Pressable onPress={onContinue} style={[s.btn, { backgroundColor: 'rgba(255,255,255,0.08)' }]}><Text style={s.btnText}>Continue</Text></Pressable>
        <Pressable onPress={onFinish} style={[s.btn, { backgroundColor: BRAND }]}><Text style={s.btnText}>Save & Finish</Text></Pressable>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 6, marginBottom: 6 },
  backWrap: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  backBtn: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 16, fontWeight: '800' },
  statusChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#1F2937' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { color: '#E5E7EB', fontWeight: '800', fontSize: 12 },

  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  centerWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  halo: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(122,0,255,0.22)' },
  orb: {
    width: 200, height: 200, borderRadius: 100, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: '#1F2937', shadowColor: BRAND2, shadowOpacity: 0.25, shadowRadius: 24, elevation: 12,
  },
  orbInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff', opacity: 0.9, marginTop: 8 },
  orbLabelTop: { color: '#D1D5DB', fontSize: 12 },

  timer: { color: '#fff', fontSize: 40, fontWeight: '900', textAlign: 'center', marginTop: 8 },
  hint: { color: '#9CA3AF', marginTop: 4, textAlign: 'center' },

  meterBlock: { alignItems: 'center', marginTop: 14, width: '100%' },
  meterTrack: {
    width: '86%', height: 16, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: '#1F2937', overflow: 'hidden', justifyContent: 'center',
  },
  meterFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: BRAND2 },
  arrowWrap: { position: 'absolute', top: -6, width: 20, alignItems: 'center' },
  meterLabels: { width: '86%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  meterLabel: { color: '#94A3B8', fontSize: 12 },
  peakMarker: { position: 'absolute', top: 1, width: 12, height: 12, transform: [{ rotate: '45deg' }], borderRadius: 2, backgroundColor: '#ffffff22', borderWidth: 1, borderColor: '#cbd5e1' },
  peakBadge: { color: '#B6C2D2', marginTop: 6, fontSize: 12, fontWeight: '700' },

  row: { flexDirection: 'row', gap: 10, marginTop: 16, justifyContent: 'center' },
  btn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  btnText: { color: '#fff', fontWeight: '800' },

  resultCard: {
    position: 'absolute', left: 18, right: 18, backgroundColor: '#0F172A',
    borderColor: '#1F2937', borderWidth: 1, borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 16,
    zIndex: 40,               
    elevation: 40,           
  },
  resultTitle: { color: '#fff', fontSize: 16, fontWeight: '900', marginBottom: 6 },
  resultLine: { color: '#E5E7EB', marginTop: 2 },
  bold: { fontWeight: '900', color: '#fff' },
  modalScrim: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 39,     
    elevation: 39,  
    backgroundColor: 'transparent', 
  },
});
