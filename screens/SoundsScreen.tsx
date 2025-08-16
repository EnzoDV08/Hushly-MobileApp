import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming, withSpring, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { audioManager } from '../services/audioManager';
import MiniPlayer from '../components/MiniPlayer';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import { useFocusEffect } from '@react-navigation/native';
import FABBack, { FAB_BACK_SIZE } from '../components/FABBack';
import { Settings } from '../services/settings';

const BG = '#141D2A';
const BRAND = '#7A00FF';
const BRAND2 = '#9B5CFF';
const HEADER_H = 88;


type Track = { id: string; name: string; uri: string | number; hint?: string };


const BUILT_INS: Track[] = [
  { id: 'rain',   name: 'Gentle Rain',     uri: 'https://firebasestorage.googleapis.com/v0/b/hushly-mobile.firebasestorage.app/o/rain.mp3?alt=media',        hint: 'CDN' },
  { id: 'ocean',  name: 'Ocean Waves',     uri: 'https://firebasestorage.googleapis.com/v0/b/hushly-mobile.firebasestorage.app/o/ocean.mp3?alt=media',       hint: 'CDN' },
  { id: 'forest', name: 'Forest Ambience', uri: 'https://firebasestorage.googleapis.com/v0/b/hushly-mobile.firebasestorage.app/o/forest.mp3?alt=media',      hint: 'CDN' },
  { id: 'windchimes', name: 'Wind Chimes', uri: 'https://firebasestorage.googleapis.com/v0/b/hushly-mobile.firebasestorage.app/o/wind-chimes.mp3?alt=media', hint: 'CDN' },
];


export default function SoundsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [tracks] = useState<Track[]>(BUILT_INS);
  const [playing, setPlaying] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [preferredId, setPreferredId] = useState<string | null>(null);

  const [miniH, setMiniH] = useState(0);
  const miniVisible = miniH > 8;
  const fabBottomOffset = miniVisible ? Math.max(0, (miniH - FAB_BACK_SIZE) / 2) : 0;

  useEffect(() => {
    const localModules = BUILT_INS.map(t => t.uri).filter((u): u is number => typeof u !== 'string');
    Asset.loadAsync(localModules).catch(() => {});
  }, []);

  useEffect(() => { (async () => {
    try { const saved = await AsyncStorage.getItem('preferredTrackId'); if (saved) setPreferredId(saved); } catch {}
  })(); }, []);
  const setAsPreferred = async (id: string, uri: string | number) => {
    try {
      await AsyncStorage.setItem('preferredTrackId', id);
      if (typeof uri === 'string') await AsyncStorage.setItem('preferredTrackUri', uri);
      setPreferredId(id);
    } catch {}
  };

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

  async function resolveToPlayableUri(uri: string | number): Promise<string> {
    try {
      if (typeof uri === 'number') {
        const asset = Asset.fromModule(uri);
        await asset.downloadAsync();              
        return asset.localUri ?? asset.uri;        
      } else {
        const dir = FileSystem.cacheDirectory + 'audio/';
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
        const bare = uri.split('?')[0].split('/').pop() || `m${uri.length}`;
        const filename = (bare.toLowerCase().endsWith('.mp3') ? bare : `${bare}.mp3`).replace(/[^\w.-]/g, '_');
        const dest = dir + filename;
        const info = await FileSystem.getInfoAsync(dest);
        if (!info.exists) await FileSystem.downloadAsync(uri, dest);
        return dest;
      }
    } catch (e) {
      console.log('[sounds] resolveToPlayableUri failed; using original', e);
      return typeof uri === 'string' ? uri : Asset.fromModule(uri).uri;
    }
  }

  const fadeVolTo = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeTo = async (target: number, ms = 300) => {
    if (fadeVolTo.current) clearInterval(fadeVolTo.current);
    const start = Math.max(0, Math.min(1, audioManager.getState().volume ?? 0.55));
    const steps = Math.max(1, Math.floor(ms / 50));
    let i = 0;
    fadeVolTo.current = setInterval(async () => {
      i++;
      const t = i / steps;
      const v = start + (target - start) * t;
      try { await audioManager.setVolume(v); } catch {}
      if (i >= steps) { clearInterval(fadeVolTo.current!); fadeVolTo.current = null; }
    }, 50);
  };

  const playTrack = async (t: Track) => {
    try {
      cancelPreview();                  
      await fadeTo(0, 160);
      const u = await resolveToPlayableUri(t.uri);
      await audioManager.playLoop(u, 0.7, t.id);  
      setCurrentId(t.id);
      await fadeTo(0.55, 220);
    } catch (e) {
      console.log('[sounds] play error', e);
    }
  };


    const onTogglePlay = async (t: Track) => {
      const state = audioManager.getState();
      const isCurrent = state.source?.id === t.id;

      if (isCurrent && state.playing) {
        await audioManager.pause();
        setPlaying(false);
        return;
      }
      cancelPreview();                    
      await playTrack(t);
    };

    const previewTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const previewingId = useRef<string | null>(null);

    const cancelPreview = () => {
      if (previewTimeout.current) {
        clearTimeout(previewTimeout.current);
        previewTimeout.current = null;
      }
      previewingId.current = null;
    };

  useEffect(() => () => { if (previewTimeout.current) clearTimeout(previewTimeout.current); }, []);
  const previewTrack = async (t: Track) => {
  try {
    cancelPreview();                   
    previewingId.current = t.id;        

    await fadeTo(0.0, 120);
    const u = await resolveToPlayableUri(t.uri);
    await audioManager.play(u, 0.45, t.id); 
    setCurrentId(t.id);
    await fadeTo(0.18, 200);

    previewTimeout.current = setTimeout(async () => {
      if (previewingId.current === t.id) {
        await audioManager.pause();
        cancelPreview();                
      }
    }, 6000);
  } catch (e) {
    console.log('[sounds] preview error', e);
  }
};

  const stopPreviewNow = useCallback(async () => {
    try {
      cancelPreview();                   
      if (fadeVolTo.current) {
        clearInterval(fadeVolTo.current);
        fadeVolTo.current = null;
      }
      await audioManager.pause();       
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => { stopPreviewNow(); };
    }, [stopPreviewNow])
  );

  useEffect(() => () => cancelPreview(), []);

  useFocusEffect(
    useCallback(() => {
      return () => { stopPreviewNow(); };
    }, [stopPreviewNow])
  );

  const headerPulse = useSharedValue(0);
  const backPress = useSharedValue(0);
  const backPeek = useSharedValue(-8);
  useEffect(() => {
    headerPulse.value = withRepeat(withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.quad) }), -1, true);
    backPeek.value = withTiming(0, { duration: 420 });
  }, []);
  const headerStyle = useAnimatedStyle(() => ({ opacity: 0.9 + headerPulse.value * 0.1, transform: [{ translateY: (1 - headerPulse.value) * -2 }] }));
  const backWrapStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: backPeek.value }, { scale: interpolate(backPress.value, [0, 1], [1, 0.92]) }, { rotateZ: `${interpolate(backPress.value, [0, 1], [0, -6])}deg` }],
    shadowOpacity: interpolate(backPress.value, [0, 1], [0.18, 0.28]),
  }));

const renderItem = useCallback(
  ({ item, index }: { item: Track; index: number }) => {
    const active = item.id === currentId && playing;
    const preferred = item.id === preferredId;
    return (
      <SoundRow
        track={item}
        index={index}
        active={active}
        preferred={preferred}
        onPreview={() => previewTrack(item)}          
        onTogglePlay={() => onTogglePlay(item)}        
        onMakeDefault={() => setAsPreferred(item.id, item.uri)}
      />
    );
  },
  [currentId, playing, preferredId]
);

  return (
    <View style={s.screen}>
      <View style={[s.headerWrap, { paddingTop: insets.top + 16 }]}>
      <View style={s.headerRow}>
        <Animated.View style={[s.titleCol, headerStyle]}>
          <View style={s.titleRow}>
            <LinearGradient
              colors={[BRAND, BRAND2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.headerBadge}>
             <Ionicons name="musical-notes" size={16} color="#0B1220" />
            </LinearGradient>
            <Text style={s.h1}>Ambient Sounds</Text>
          </View>
          <Text style={s.hint}>
            Tap a card to preview • press ▶ to play • star to set default
          </Text>
        </Animated.View>
      </View>
      </View>
      <View style={{ flex: 1, paddingTop: insets.top + HEADER_H + 20, paddingHorizontal: 16 }}>
        <FlatList
          data={tracks}
          keyExtractor={(i) => i.id}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 120 }}
        />
      </View>

      <MiniPlayer
      forceVisible
      onHeight={setMiniH}
      dockSide={Settings.get().hand === 'left' ? 'right' : 'left'}
      narrowWidth={280}
      edgeMargin={12}
    />

    <FABBack
    onPress={() => navigation.goBack()}
    bottomOffset={fabBottomOffset - 9}
  />
    </View>
  );
}

function SoundRow({
  track, index, active, preferred, onPreview, onTogglePlay, onMakeDefault,
}: {
  track: Track;
  index: number;
  active: boolean;
  preferred: boolean;
  onPreview: () => void;
  onTogglePlay: () => void;
  onMakeDefault: () => void;
}) {
  const enter = useSharedValue(0);
  useEffect(() => {
    enter.value = withDelay(index * 60, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }));
  }, []);
  const rowStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 14 }, { scale: 0.98 + enter.value * 0.02 }],
  }));

  const b1 = useSharedValue(0.3), b2 = useSharedValue(0.6), b3 = useSharedValue(0.45);
  useEffect(() => {
    const dur = 520;
    const loop = (sv: any, seed: number) => {
      sv.value = withRepeat(withTiming(active ? (0.25 + Math.random() * 0.7) : 0.15 + seed, { duration: dur }), -1, true);
    };
    loop(b1, 0.12); loop(b2, 0.24); loop(b3, 0.18);
  }, [active]);
  const s1 = useAnimatedStyle(() => ({ transform: [{ scaleY: b1.value }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ scaleY: b2.value }] }));
  const s3 = useAnimatedStyle(() => ({ transform: [{ scaleY: b3.value }] }));

  return (
<Animated.View style={[s.itemWrap, rowStyle]}>
  <Pressable
    onPress={onPreview}                
    delayLongPress={280}
    android_ripple={{ color: '#ffffff14' }}
    style={[s.item, active && s.itemActive]}
  >
    <View style={s.iconBadge}>
      <Ionicons name={active ? 'volume-high' : 'musical-notes-outline'} size={16} color="#E5E7EB" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={s.itemTitle}>{track.name}</Text>
      {!!track.hint && <Text style={s.itemHint}>{track.hint}</Text>}
      {preferred && <Text style={[s.itemHint, { color: '#FBBF24' }]}>Default</Text>}
    </View>
    <View style={s.vizWrap} pointerEvents="none">
      <Animated.View style={[s.vizBar, s1]} />
      <Animated.View style={[s.vizBar, s2]} />
      <Animated.View style={[s.vizBar, s3]} />
    </View>
    <Pressable onPress={onMakeDefault} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
      <Ionicons name={preferred ? 'star' : 'star-outline'} size={20} color={preferred ? '#FBBF24' : '#9AA3B5'} />
    </Pressable>
    <Pressable onPress={onTogglePlay} hitSlop={10} style={{ paddingLeft: 4 }}>
      <Ionicons name={active ? 'pause-circle' : 'play-circle'} size={22} color={active ? BRAND2 : '#9AA3B5'} />
    </Pressable>
  </Pressable>
</Animated.View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  headerWrap: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 5, backgroundColor: BG },
  headerRow: { height: HEADER_H, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 12 },
  backWrap: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 8,
  },
  backBtn: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  titleCol: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  headerBadge: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10 },
  h1: { color: '#fff', fontSize: 22, fontWeight: '900' },
  hint: { color: '#93A4B8', marginTop: 4, textAlign: 'center' },

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
});
