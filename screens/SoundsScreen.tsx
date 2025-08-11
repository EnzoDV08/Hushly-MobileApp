import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, FlatList,
  LayoutChangeEvent, GestureResponderEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing, useAnimatedStyle, useSharedValue,
  withDelay, withRepeat, withTiming, withSpring, interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { audioManager } from '../services/audioManager';
import MiniPlayer from '../components/MiniPlayer';

const BG = '#141D2A';
const BRAND = '#7A00FF';
const BRAND2 = '#9B5CFF';
const HEADER_H = 72;

type Track = { id: string; name: string; uri: string | number; hint?: string };

const TRACKS: Track[] = [
  { id: 'calm',   name: 'Calm (offline)', uri: require('../assets/sounds/calm-music.mp3'), hint: 'Built-in' },
  { id: 'rain',   name: 'Rain',           uri: 'https://cdn.pixabay.com/audio/2022/07/26/audio_6f9e1a2dcd.mp3' },
  { id: 'forest', name: 'Forest',         uri: 'https://cdn.pixabay.com/audio/2021/09/07/audio_d1b1f3e9b9.mp3' },
  { id: 'brown',  name: 'Brown Noise',    uri: 'https://cdn.pixabay.com/audio/2022/03/10/audio_b2bfb2b9e2.mp3' },
  { id: 'focus',  name: 'Focus Tones',    uri: 'https://cdn.pixabay.com/audio/2021/10/26/audio_46c1a0b2c3.mp3' },
];

export default function SoundsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const [playing, setPlaying] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [vol, setVol] = useState<number>(() => {
    try { return Math.max(0, Math.min(1, audioManager.getState().volume ?? 0.55)); }
    catch { return 0.55; }
  });

  useEffect(() => {
    const off = audioManager.addListener((p) => {
      setPlaying(p);
      const s = audioManager.getState();
      setCurrentId((s.source?.id as string) ?? null);
    });
    const s = audioManager.getState();
    setPlaying(s.playing);
    setCurrentId((s.source?.id as string) ?? null);
    return off;
  }, []);

  const fadeInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeTo = async (target: number, ms = 400) => {
    if (fadeInterval.current) clearInterval(fadeInterval.current);
    const start = vol;
    const steps = Math.max(1, Math.floor(ms / 50));
    let i = 0;
    fadeInterval.current = setInterval(async () => {
      i++;
      const t = i / steps;
      const v = start + (target - start) * t;
      setVol(v);
      await audioManager.setVolume(v);
      if (i >= steps) {
        clearInterval(fadeInterval.current!);
        fadeInterval.current = null;
      }
    }, 50);
  };

  const playTrack = async (t: Track) => {
    try {
      await fadeTo(0, 180);
      await audioManager.playLoop(t.uri, 0, t.id);
      setCurrentId(t.id);
      await fadeTo(Math.max(0.05, vol), 260);
    } catch (e) {
      console.log('[sounds] play error', e);
    }
  };

  const onPauseResume = async () => {
    if (playing) await audioManager.pause();
    else if (currentId) {
      const t = TRACKS.find(x => x.id === currentId);
      if (t) await audioManager.playLoop(t.uri, vol, t.id);
    }
  };

  const onStop = async () => {
    if (fadeInterval.current) clearInterval(fadeInterval.current);
    await audioManager.stop();
    setCurrentId(null);
  };

  const [barW, setBarW] = useState(1);
  const onBarLayout = (e: LayoutChangeEvent) => setBarW(e.nativeEvent.layout.width);
  const setFromTap = async (e: GestureResponderEvent) => {
    const x = Math.max(0, Math.min(barW, e.nativeEvent.locationX));
    const v = +(x / barW).toFixed(2);
    setVol(v);
    await audioManager.setVolume(v);
  };

  const headerPulse = useSharedValue(0);
  const backPress = useSharedValue(0);
  const backPeek = useSharedValue(-8);

  useEffect(() => {
    headerPulse.value = withRepeat(withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.quad) }), -1, true);
    backPeek.value = withTiming(0, { duration: 420 });
  }, []);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: 0.9 + headerPulse.value * 0.1,
    transform: [{ translateY: (1 - headerPulse.value) * -2 }],
  }));
  const backWrapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: backPeek.value },
      { scale: interpolate(backPress.value, [0, 1], [1, 0.92]) },
      { rotateZ: `${interpolate(backPress.value, [0, 1], [0, -6])}deg` },
    ],
    shadowOpacity: interpolate(backPress.value, [0, 1], [0.18, 0.28]),
  }));

  const renderItem = useCallback(({ item, index }: { item: Track; index: number }) => {
    const active = item.id === currentId && playing;
    return <SoundRow track={item} index={index} active={active} onPress={() => playTrack(item)} volume={vol} />;
  }, [currentId, playing, vol]);

  return (
    <View style={s.screen}>
      <View style={[s.headerWrap, { paddingTop: insets.top }]}>
        <View style={s.headerRow}>
          <Animated.View style={[s.backWrap, backWrapStyle]}>
            <Pressable
              onPress={() => navigation.goBack()}
              onPressIn={() => { backPress.value = withSpring(1, { mass: 0.3, damping: 12 }); }}
              onPressOut={() => { backPress.value = withSpring(0, { mass: 0.3, damping: 12 }); }}
              style={s.backBtn}
            >
              <Ionicons name="arrow-back" size={22} color="#0F172A" />
            </Pressable>
          </Animated.View>

          <Animated.View style={[s.titleCol, headerStyle]}>
            <LinearGradient
              colors={[BRAND, BRAND2]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.headerBadge}
            >
              <Ionicons name="musical-notes" size={16} color="#0B1220" />
            </LinearGradient>
            <Text style={s.h1}>Ambient Sounds</Text>
            <Text style={s.hint}>Tap a card to play • long press to preview</Text>
          </Animated.View>
          <View style={{ width: 52 }} />
        </View>
      </View>
      <View style={{ flex: 1, paddingTop: insets.top + HEADER_H + 8, paddingHorizontal: 16 }}>
        <FlatList
          data={TRACKS}
          keyExtractor={(i) => i.id}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 110 }} 
        />
        <View style={s.controls}>
          <Pressable onPress={onPauseResume} style={[s.ghostBtn, { minWidth: 96 }]}>
            <Ionicons name={playing ? 'pause' : 'play'} size={16} color="#E5E7EB" />
            <Text style={s.ghostText}>{playing ? 'Pause' : 'Play'}</Text>
          </Pressable>

          <View style={s.volWrap}>
            <Text style={s.volPct}>{Math.round(vol * 100)}%</Text>
            <Pressable onLayout={onBarLayout} onPress={setFromTap} style={s.volTrack}>
              <View style={[s.volFill, { width: `${Math.round(vol * 100)}%` }]} />
              <View style={[s.volThumb, { left: Math.max(8, Math.round(vol * (barW - 16))) }]} />
            </Pressable>
          </View>

          <Pressable onPress={onStop} style={[s.ghostBtn, { backgroundColor: '#EF444433', borderColor: '#EF4444' }]}>
            <Ionicons name="stop" size={16} color="#FCA5A5" />
            <Text style={[s.ghostText, { color: '#FCA5A5' }]}>Stop</Text>
          </Pressable>
        </View>
      </View>

      <MiniPlayer />
    </View>
  );
}

function SoundRow({
  track, index, active, onPress, volume,
}: { track: Track; index: number; active: boolean; onPress: () => void; volume: number }) {
  const enter = useSharedValue(0);
  useEffect(() => {
    enter.value = withDelay(index * 60, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
  }, []);
  const rowStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 14 }, { scale: 0.98 + enter.value * 0.02 }],
  }));

  const h1 = useSharedValue(0.3), h2 = useSharedValue(0.6), h3 = useSharedValue(0.45);
  useEffect(() => {
    const dur = 520;
    const loop = (sv: Animated.SharedValue<number>, seed: number) => {
      sv.value = withRepeat(
        withTiming(active ? (0.25 + Math.random() * (0.7 * Math.max(0.2, volume))) : 0.15 + seed, { duration: dur }),
        -1,
        true,
      );
    };
    loop(h1, 0.12); loop(h2, 0.24); loop(h3, 0.18);
  }, [active, volume]);
  const b1 = useAnimatedStyle(() => ({ transform: [{ scaleY: h1.value }] }));
  const b2 = useAnimatedStyle(() => ({ transform: [{ scaleY: h2.value }] }));
  const b3 = useAnimatedStyle(() => ({ transform: [{ scaleY: h3.value }] }));

  return (
    <Animated.View style={[s.itemWrap, rowStyle]}>
      <Pressable onPress={onPress} android_ripple={{ color: '#ffffff14' }} style={[s.item, active && s.itemActive]}>
        <View style={s.iconBadge}>
          <Ionicons name={active ? 'volume-high' : 'musical-notes-outline'} size={16} color="#E5E7EB" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.itemTitle}>{track.name}</Text>
          {!!track.hint && <Text style={s.itemHint}>{track.hint}</Text>}
        </View>
        <View style={s.vizWrap} pointerEvents="none">
          <Animated.View style={[s.vizBar, b1]} />
          <Animated.View style={[s.vizBar, b2]} />
          <Animated.View style={[s.vizBar, b3]} />
        </View>
        <Ionicons name="play-circle" size={22} color={active ? BRAND2 : '#9AA3B5'} />
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  headerWrap: {
    position: 'absolute', left: 0, right: 0, top: 0, zIndex: 5,
    backgroundColor: BG,
  },
  headerRow: {
    height: HEADER_H, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10,
  },
  backWrap: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 8,
  },
  backBtn: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  titleCol: { flex: 1 },
  headerBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginBottom: 6 },
  h1: { color: '#fff', fontSize: 22, fontWeight: '900' },
  hint: { color: '#93A4B8', marginTop: 2 },

  itemWrap: { borderRadius: 14, overflow: 'hidden' },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#1F2937',
    padding: 14, borderRadius: 14,
  },
  itemActive: { borderColor: BRAND, shadowColor: BRAND2, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8 },
  iconBadge: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  itemTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 16, marginBottom: 2 },
  itemHint: { color: '#9CA3AF', fontSize: 12 },

  vizWrap: { width: 28, height: 18, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginRight: 8 },
  vizBar: { width: 4, height: '100%', backgroundColor: BRAND2, borderRadius: 2, transform: [{ scaleY: 0.2 }] },

  controls: {
    marginTop: 14, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 10, paddingBottom: 12,
  },
  ghostBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#334155',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12,
  },
  ghostText: { color: '#E5E7EB', fontWeight: '800' },

  volWrap: { flex: 1, paddingHorizontal: 4 },
  volPct: { color: '#B6C2D2', fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  volTrack: {
    height: 14, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: '#1F2937', overflow: 'hidden', justifyContent: 'center',
  },
  volFill: { ...StyleSheet.absoluteFillObject, width: '40%', backgroundColor: BRAND2 },
  volThumb: {
    position: 'absolute', top: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6,
  },
});
