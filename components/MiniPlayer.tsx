import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { audioManager } from '../services/audioManager';

const BRAND_BG = '#0B1220';

export default function MiniPlayer() {
  const insets = useSafeAreaInsets();
  const [playing, setPlaying] = useState(false);
  const [title, setTitle] = useState('Ambient — Focus Tones');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const off = audioManager.addListener((p) => {
      setPlaying(p);
      const s = audioManager.getState();
      const nameFromId =
        (typeof s.source?.id === 'string' && prettyName(s.source.id)) ||
        (typeof s.source?.uri === 'string' ? 'Ambient — Custom' : 'Ambient — Focus Tones');
      setTitle(nameFromId);
      setVisible(!!s.source || p);
    });
    const s = audioManager.getState();
    setPlaying(s.playing);
    setTitle(s.source?.id ? prettyName(s.source.id) : 'Ambient — Focus Tones');
    setVisible(!!s.source || s.playing);
    return off;
  }, []);

  const onPlayPause = async () => {
    const s = audioManager.getState();
    if (playing) {
      await audioManager.pause();
    } else if (s.source) {
      await audioManager.resume();
    }
  };

  const onStop = async () => {
    await audioManager.stop();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <View style={[styles.wrap, { paddingBottom: insets.bottom + 14 }]}>
      <Ionicons name="musical-notes" size={18} color="#E5E7EB" />
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable onPress={onPlayPause} style={styles.ctrlBtn}>
          <Ionicons name={playing ? 'pause' : 'play'} size={18} color="#0F172A" />
        </Pressable>
        <Pressable onPress={onStop} style={[styles.ctrlBtn, { backgroundColor: '#FCA5A5' }]}>
          <Ionicons name="stop" size={16} color="#0F172A" />
        </Pressable>
      </View>
    </View>
  );
}

function prettyName(id: string) {
  switch (id) {
    case 'calm': return 'Calm (offline)';
    case 'rain': return 'Rain';
    case 'forest': return 'Forest';
    case 'brown': return 'Brown Noise';
    case 'focus': return 'Focus Tones';
    default: return 'Ambient — Focus Tones';
  }
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,               
    backgroundColor: BRAND_BG,
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
  title: { color: '#E5E7EB', fontWeight: '700', flex: 1 },
  ctrlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
