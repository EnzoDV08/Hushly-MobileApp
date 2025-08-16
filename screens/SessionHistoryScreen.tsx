import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { deleteSession, listMySessions, updateSession } from '../services/sessionService';
import { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import FABBack from '../components/FABBack';

const BG = '#141D2A';
const BRAND = '#7A00FF';
const BRAND2 = '#9B5CFF';
const SCROLL_UNDER = 40;

type SessionItem = {
  id: string;
  startedAt: number | Date | { seconds: number; nanoseconds?: number } | any;
  durationMs: number;
  timeToRelaxMs: number;
  notes?: string;
  peakPct?: number; 
};

function toDate(v: any): Date {
  if (!v) return new Date();
  if (typeof v?.toDate === 'function') return v.toDate();
  if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000);
  if (typeof v === 'number') return new Date(v);
  if (v instanceof Date) return v;
  return new Date(v);
}

function mmss(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

type Range = '7d' | '30d' | 'all';

export default function SessionHistoryScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState<SessionItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<{ id: string; notes: string } | null>(null);
  const [sortNewest, setSortNewest] = useState(true);
  const [query, setQuery] = useState('');
  const [range, setRange] = useState<Range>('30d');
  const [headerH, setHeaderH] = useState(0);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const rows = await listMySessions();
    const norm = (rows as any[]).map((i) => ({
      id: i.id,
      startedAt: i.startedAt,
      durationMs: i.durationMs ?? 0,
      timeToRelaxMs: i.timeToRelaxMs ?? 0,
      notes: i.notes ?? '',
      peakPct:
      typeof i.peakPct === 'number'
        ? i.peakPct
        : (i.peakPct != null && !Number.isNaN(Number(i.peakPct)) ? Number(i.peakPct) : undefined),
    })) as SessionItem[];

    norm.sort(
      (a, b) =>
        toDate(sortNewest ? b.startedAt : a.startedAt).getTime() -
        toDate(sortNewest ? a.startedAt : b.startedAt).getTime()
    );
    setItems(norm);
  }, [sortNewest]);

  useEffect(() => {
    reload();
  }, [reload]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const filtered = useMemo(() => {
    let list = items;
    const now = Date.now();
    if (range !== 'all') {
      const days = range === '7d' ? 7 : 30;
      const cutoff = now - days * 24 * 60 * 60 * 1000;
      list = list.filter((i) => toDate(i.startedAt).getTime() >= cutoff);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((i) => (i.notes || '').toLowerCase().includes(q));
    }
    return list;
  }, [items, range, query]);

const metrics = useMemo(() => {
  if (!filtered.length) return null;

  const times = filtered.map((i) => i.timeToRelaxMs);
  const fastest = Math.min(...times);
  const avg = Math.floor(times.reduce((a, b) => a + b, 0) / times.length);
  const total = filtered.reduce((a, i) => a + (i.durationMs || 0), 0);

  const peaks = filtered
    .map((i) => (typeof i.peakPct === 'number' ? clamp01(i.peakPct) : null))
    .filter((v): v is number => v !== null);

  const bestPeak = peaks.length ? Math.max(...peaks) : null;
  const avgPeak = peaks.length ? peaks.reduce((a, b) => a + b, 0) / peaks.length : null;

  return { fastest, avg, total, count: filtered.length, bestPeak, avgPeak };
}, [filtered]);

  const hIn = useSharedValue(0);
  useEffect(() => {
    hIn.value = withDelay(60, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
  }, []);
  const headerStyle = useAnimatedStyle(() => ({
    opacity: hIn.value,
    transform: [{ translateY: (1 - hIn.value) * -10 }],
  }));

  const renderItem = ({ item, index }: { item: SessionItem; index: number }) => {
  const started = toDate(item.startedAt);

  const calmPct = item.durationMs > 0 ? clamp01(item.timeToRelaxMs / item.durationMs) : 0;

  const peakPct = (typeof item.peakPct === 'number' ? clamp01(item.peakPct) :
                  (item.peakPct != null && !Number.isNaN(Number(item.peakPct)) ? clamp01(Number(item.peakPct)) : null));
  const barPct = (peakPct != null ? peakPct : calmPct);

  const peakText = (peakPct != null) ? `${Math.round(peakPct * 100)}%` : '—';

  const barPctLabel = `${Math.round(barPct * 100)}%`;

    return (
      <Animated.View
        style={[
          st.card,
          {
            opacity: 0,
            transform: [{ translateY: 12 }],
          },
        ]}
        entering={() => {
          'worklet';
          return {
            initialValues: { opacity: 0, transform: [{ translateY: 12 }] },
            animations: {
              opacity: withTiming(1, { duration: 260 }),
              transform: [
                { translateY: withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) }) },
              ],
            },
            delay: 40 * index,
          };
        }}
      >
        <View style={st.cardRowTop}>
          <View style={{ flex: 1 }}>
            <Text style={st.title}>Relaxed in {mmss(item.timeToRelaxMs)}</Text>
            <Text style={st.sub}>
              Duration {mmss(item.durationMs)} • {started.toLocaleString()}
            </Text>
          </View>

        <View style={st.kpiPill}>
          <Ionicons name="pulse-outline" size={14} color="#0B1220" />
          <Text style={st.kpiText}>Peak {peakText}</Text>
        </View>
        </View>

      <View style={st.barTrack}>
        <LinearGradient
          colors={[BRAND, BRAND2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[st.barFill, { width: `${Math.round(barPct * 100)}%` }]}
        />
      </View>
      <View style={st.barLabels}>
        <Text style={st.barLabelRight}>
          {peakPct != null 
            ? `Peak ${Math.round(barPct * 100)}%` 
            : `${Math.round(barPct * 100)}%`}
        </Text>
      </View>
        {editing?.id === item.id ? (
          <View style={{ marginTop: 12 }}>
            <TextInput
              value={editing?.notes ?? ''}
              onChangeText={(t) => setEditing({ id: item.id, notes: t })}
              placeholder="Notes…"
              placeholderTextColor="#94A3B8"
              style={st.input}
              multiline
            />
            <View style={st.row}>
              <Pressable style={st.btnGhost} onPress={() => setEditing(null)}>
                <Text style={st.btnGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={st.btn}
                onPress={async () => {
                  if (!editing) return;
                  await updateSession(item.id, { notes: editing.notes });
                  setEditing(null);
                  await reload();
                }}
              >
                <Text style={st.btnText}>Save</Text>
              </Pressable>
            </View>
          </View>
          ) : (
            <View style={[st.row, { marginTop: 12 }]}>
              <Pressable style={st.btnGhost} onPress={() => setEditing({ id: item.id, notes: item.notes || '' })}>
                <Ionicons name="create-outline" size={16} color="#E5E7EB" />
                <Text style={st.btnGhostText}>Edit</Text>
              </Pressable>
              <Pressable
                style={[st.btn, { backgroundColor: '#EF4444' }]}
                onPress={() => setConfirmId(confirmId === item.id ? null : item.id)}
              >
                <Ionicons name="trash-outline" size={16} color="#0B1220" />
                <Text style={st.btnText}>{confirmId === item.id ? 'Confirm?' : 'Delete'}</Text>
              </Pressable>
            </View>
          )}
          
         {confirmId === item.id && (
        <Animated.View
          entering={FadeInDown.duration(220).easing(Easing.out(Easing.cubic))}
          exiting={FadeOutUp.duration(140)}
          style={{
            overflow: 'hidden',
            borderRadius: 12,
            marginTop: 8,
            backgroundColor: '#1B2333',
            borderWidth: 1,
            borderColor: '#223049',
          }}
        >
        <View style={st.confirmWrap}>
          <View style={{ flex: 1 }}>
            <Text style={st.confirmTitle}>Delete this session?</Text>
            <Text style={st.confirmSub}>This action can’t be undone.</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={st.confirmGhost} onPress={() => setConfirmId(null)}>
              <Text style={st.confirmGhostText}>Keep</Text>
            </Pressable>
            <Pressable
              style={st.confirmDanger}
              onPress={async () => {
                await deleteSession(item.id);
                setItems(prev => prev.filter(x => x.id !== item.id));
                setConfirmId(null);
              }}
            >
              <Ionicons name="trash-outline" size={16} color="#0B1220" />
              <Text style={st.confirmDangerText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    )}

        {item.notes ? <Text style={st.notes}>“{item.notes}”</Text> : null}
      </Animated.View>
    );
  };



  return (
    <View style={st.screen}>
      <LinearGradient
        colors={['#181F30', BG]} 
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <Animated.View
        style={[st.headerWrap, { paddingTop: insets.top + 6 }, headerStyle]}
        onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)} 
        pointerEvents="box-none"
      >
        <View style={st.headerRowFloating}>
          <View style={st.titleCol}>
            <Text style={st.h1}>Session History</Text>
            <View style={st.underline} />
          </View>

          <Pressable style={st.sortBtn} onPress={() => setSortNewest((s) => !s)}>
            <Ionicons name="swap-vertical" size={16} color="#E5E7EB" />
            <Text style={st.sortText}>{sortNewest ? 'Newest' : 'Oldest'}</Text>
          </Pressable>
        </View>

        <View style={st.toolsWrap}>
          <View style={st.searchWrap}>
            <Ionicons name="search" size={14} color="#9CA3AF" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search notes"
              placeholderTextColor="#94A3B8"
              style={st.searchInput}
              returnKeyType="search"
            />
            {query ? (
              <Pressable onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </Pressable>
            ) : null}
          </View>
          <LinearGradient
            pointerEvents="none"
            colors={['transparent', '#0F1623']}
            style={st.headerScrim}
          />

          <View style={st.rangeRow}>
            {(['7d', '30d', 'all'] as Range[]).map((r) => (
              <Pressable
                key={r}
                onPress={() => setRange(r)}
                style={[
                  st.rangeChip,
                  range === r && { backgroundColor: '#A78BFA', borderColor: '#A78BFA' },
                ]}
              >
                <Text style={[st.rangeText, range === r && { color: '#0B1220', fontWeight: '900' }]}>
                  {r === '7d' ? '7 days' : r === '30d' ? '30 days' : 'All time'}
                </Text>
              </Pressable>
            ))}
          </View>

          {metrics ? (
            <View style={st.statsWrap}>
              <View style={st.statCard}>
                <Text style={st.statLabel}>Fastest</Text>
                <Text style={st.statValue}>{mmss(metrics.fastest)}</Text>
              </View>
              <View style={st.statCard}>
                <Text style={st.statLabel}>Average</Text>
                <Text style={st.statValue}>{mmss(metrics.avg)}</Text>
              </View>
              <View style={st.statCard}>
                <Text style={st.statLabel}>Total</Text>
                <Text style={st.statValue}>{mmss(metrics.total)}</Text>
              </View>
              <View style={st.statCard}>
                <Text style={st.statLabel}>Sessions</Text>
                <Text style={st.statValue}>{metrics.count}</Text>
              </View>
            </View>
          ) : (
            <Text style={st.empty}>No sessions yet. Start one from the main screen ✨</Text>
          )}
          <View style={{ height: SCROLL_UNDER }} pointerEvents="none" />
        </View>
      </Animated.View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{
          paddingTop: headerH + 12,     
          paddingHorizontal: 16,
          paddingBottom: 28,
        }}
        refreshControl={<RefreshControl tintColor="#fff" refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={<View style={{ height: 6 }} />}
        ListFooterComponent={<View style={{ height: 14 }} />}
        ListEmptyComponent={
          <Text style={[st.empty, { textAlign: 'center', marginTop: 30 }]}>
            Nothing here for this range/search.
          </Text>
        }
      />
      <FABBack onPress={() => navigation.goBack?.()} bottomOffset={10} />
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

   headerWrap: {
     position: 'absolute',
     left: 0,
     right: 0,
     top: 0,
     zIndex: 10,
     backgroundColor: '#0F1623',   
     shadowColor: '#000',
     shadowOpacity: 0.25,
     shadowRadius: 12,
     shadowOffset: { width: 0, height: 6 },
     elevation: 10,
   },
  headerRowFloating: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  backWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 8,
  },
  backBtn: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  titleCol: { flex: 1 },
  h1: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 0.2, textAlign: 'left' },
  underline: { marginTop: 6, width: 118, height: 3, borderRadius: 999, backgroundColor: BRAND },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  sortText: { color: '#E5E7EB', fontWeight: '800', fontSize: 12 },

  toolsWrap: { paddingHorizontal: 16, marginTop: 8 },
    headerScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,      
    height: 24,      
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, color: '#fff' },
  rangeRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 6 },
  rangeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1F2937',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  rangeText: { color: '#E5E7EB', fontWeight: '800', fontSize: 12 },
  statsWrap: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  statCard: {
    flexGrow: 1,
    minWidth: '48%',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  statLabel: { color: '#9CA3AF', fontSize: 12 },
  statValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 2 },

  empty: { color: '#94A3B8' },

  card: {
    backgroundColor: '#0F172A',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginVertical: 6,          
  },
  cardRowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  kpiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#86EFAC',
  },
  kpiText: { color: '#0B1220', fontWeight: '900', fontSize: 12 },

  title: { color: '#fff', fontWeight: '800' },
  sub: { color: '#9CA3AF', marginTop: 2 },

  barTrack: {
    marginTop: 10,
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: '#1F2937',
    overflow: 'hidden',
  },
  barFill: { height: '100%' },

  barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  barLabelLeft: { color: '#94A3B8', fontSize: 11 },
  barLabelRight: { color: '#94A3B8', fontSize: 11 },

  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: {
    backgroundColor: BRAND,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnText: { color: '#0B1220', fontWeight: '900' },
  btnGhost: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnGhostText: { color: '#E5E7EB', fontWeight: '800' },

  input: {
    borderWidth: 1,
    borderColor: '#1F2937',
    backgroundColor: '#0B1220',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 44,
  },
  notes: { color: '#B6C2D2', marginTop: 10, fontStyle: 'italic' },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: '#0F172A',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  modalIconWrap: {
    alignSelf: 'flex-start',
    backgroundColor: '#F59E0B',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 8,
  },
  modalTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  modalText: { color: '#CBD5E1', marginTop: 6 },
  modalRow: { flexDirection: 'row', gap: 10, marginTop: 14, justifyContent: 'flex-end' },
  modalGhost: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  modalGhostText: { color: '#E5E7EB', fontWeight: '800' },
  modalDanger: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalDangerText: { color: '#0B1220', fontWeight: '900' },
  confirmWrap: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 12,
  paddingVertical: 10,
  gap: 12,
},
confirmTitle: { color: '#fff', fontWeight: '900' },
confirmSub: { color: '#94A3B8', marginTop: 2, fontSize: 12 },

confirmGhost: {
  backgroundColor: 'rgba(255,255,255,0.06)',
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#1F2937',
},
confirmGhostText: { color: '#E5E7EB', fontWeight: '800' },

confirmDanger: {
  backgroundColor: '#EF4444',
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 10,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},
confirmDangerText: { color: '#0B1220', fontWeight: '900' },
});
