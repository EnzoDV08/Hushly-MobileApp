import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { audioManager } from '../services/audioManager';

const BRAND_BG = '#0B1220';
const BRAND    = '#7A00FF';
const BRAND2   = '#9B5CFF';
const W = Dimensions.get('window').width;

type DockSide = 'left' | 'right';
 type Props = {
   forceVisible?: boolean;
   onHeight?: (h: number) => void;
   dockSide?: DockSide;             
   narrowWidth?: number;            
   edgeMargin?: number;               
 };
type AudioSourceLike = { id?: string; uri?: string | number };
type AudioStateLike = {
  playing?: boolean;
  volume?: number;
  source?: AudioSourceLike | null;
  position?: number;  positionMs?: number;
  duration?: number;  durationMs?: number;
};

function readProgress(state: any) {
  const pos = Number(state?.position ?? state?.positionMs ?? 0);
  const dur = Number(state?.duration ?? state?.durationMs ?? 0);
  return { pos, dur };
}
function prettyName(id?: string) {
  switch (id) {
    case 'calm': return 'Calm (offline)';
    case 'rain': return 'Gentle Rain';
    case 'ocean': return 'Ocean Waves';
    case 'forest': return 'Forest Ambience';
    case 'windchimes': return 'Wind Chimes';
    case 'brown': return 'Brown Noise';
    case 'focus': return 'Focus Tones';
    default: return 'Ambient — Focus Tones';
  }
}
function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

 export default function MiniPlayer({
   forceVisible = false,
   onHeight,
   dockSide,
   narrowWidth,
   edgeMargin = 12,
 }: Props) {
  const insets = useSafeAreaInsets();

  const [playing, setPlaying] = useState(false);
  const [title, setTitle] = useState('Ambient — Focus Tones');
  const [visible, setVisible] = useState(forceVisible);
  const [posMs, setPosMs] = useState(0);
  const [durMs, setDurMs] = useState(0);


  const lastTick = useRef<number | null>(null);

  const lastVisible = useRef<boolean>(false);
  useEffect(() => {
    if (lastVisible.current && !visible) onHeight?.(0);
    lastVisible.current = visible;
  }, [visible, onHeight]);

  useEffect(() => {
    const off = audioManager.addListener((p: boolean) => {
      setPlaying(p);
      const s = audioManager.getState() as AudioStateLike;

      const computed =
        (typeof s.source?.id === 'string' && prettyName(s.source.id)) ||
        (typeof s.source?.uri === 'string' ? 'Ambient — Custom' : 'Ambient — Focus Tones');
      setTitle(computed);
      const shouldShow = forceVisible || !!s.source || p;
      setVisible(shouldShow);

      const { pos, dur } = readProgress(s);
      if (dur > 0) {
        setPosMs(pos);
        setDurMs(dur);
      }
      lastTick.current = Date.now();
    });

    const poll = setInterval(() => {
      const s = audioManager.getState() as AudioStateLike;
      const { pos, dur } = readProgress(s);

      if (dur > 0) {
        setDurMs(dur);
        if (s.playing) {
          const now = Date.now();
          const dt = lastTick.current ? now - lastTick.current : 0;
          const backendPos = pos;
          setPosMs(prev => {
            const candidate = backendPos > 0 ? backendPos : prev + dt;
            return Math.min(candidate, dur);
          });
          lastTick.current = now;
        } else {

          setPosMs(pos);
          lastTick.current = Date.now();
        }
      } else {

        setDurMs(0);
        setPosMs(0);
        lastTick.current = Date.now();
      }
    }, 250);

 
    const s = audioManager.getState() as AudioStateLike;
    setPlaying(!!s.playing);
    setTitle(s.source?.id ? prettyName(s.source.id) : 'Ambient — Focus Tones');
    setVisible(forceVisible || !!s.source || !!s.playing);
    const { pos, dur } = readProgress(s);
    if (dur > 0) { setPosMs(pos); setDurMs(dur); }
    lastTick.current = Date.now();

    return () => { off(); clearInterval(poll); };
    }, [forceVisible]);

const onPlayPause = async () => {
  const s = audioManager.getState() as AudioStateLike;
  if (playing) {
    await audioManager.pause();
    return;
  }

  const src = s.source;
  if (!src || src.uri === undefined || src.uri === null) return;

  const vol = typeof s.volume === 'number' ? s.volume : 0.55;
  await audioManager.playLoop(src.uri, vol, src.id);
};

  const onStop = async () => {
    await audioManager.stop();
     setVisible(forceVisible);
  };

  if (!visible) {              
  return null;
}

  const pct = durMs > 0 ? Math.max(0, Math.min(1, posMs / durMs)) : 0;
 
   const isDocked = !!dockSide && !!narrowWidth;
    const dockedStyle = isDocked
        ? [
            { width: Math.min(narrowWidth!, W - edgeMargin * 2) },
            dockSide === 'left'
              ? { left: edgeMargin, right: undefined }
              : { right: edgeMargin, left: undefined },
          ]
        : [{ left: 12, right: 12 }]; 

  return (
     <View
      pointerEvents="box-none"
       style={[
         styles.wrap,
         {
           bottom: Math.max(12, insets.bottom),
           paddingBottom: 12,
         },
         ...dockedStyle,
      ]}
       onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}
     >
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Ionicons name={playing ? 'musical-notes' : 'musical-notes-outline'} size={16} color="#0B1220" />
        </View>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={onPlayPause} style={[styles.ctrlBtn, { backgroundColor: '#86EFAC' }]} hitSlop={8} accessibilityRole="button"  accessibilityLabel={playing ? 'Pause' : 'Play'} >
            <Ionicons name={playing ? 'pause' : 'play'} size={18} color="#0F172A" />
          </Pressable>
          <Pressable onPress={onStop} style={[styles.ctrlBtn, { backgroundColor: '#FCA5A5' }]} hitSlop={8} accessibilityRole="button" accessibilityLabel="Stop">
            <Ionicons name="stop" size={16} color="#0F172A" />
          </Pressable>
        </View>
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%` }]} />
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{fmt(posMs)}</Text>
          <Text style={styles.timeText}>{fmt(durMs)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 20,
    backgroundColor: BRAND_BG,
    borderColor: '#1F2937', borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 8, elevation: 9,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  badge: {
    paddingHorizontal: 8, paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: BRAND2,
    marginRight: 10,
  },
  title: {
    flex: 1,
    color: '#E5E7EB',
    fontWeight: '800',
    fontSize: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  ctrlBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },

  progressBlock: { gap: 4 },
  progressTrack: {
    width: '100%', height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: BRAND },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: { color: '#B6C2D2', fontWeight: '700', fontSize: 11 },
});
