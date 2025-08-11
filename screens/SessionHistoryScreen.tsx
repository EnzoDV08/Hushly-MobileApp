import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { deleteSession, listMySessions, updateSession } from '../services/sessionService';

const BG = '#141D2A';
const BRAND = '#7A00FF';
const BRAND2 = '#9B5CFF';

type SessionItem = {
  id: string;
  startedAt: number | Date | { seconds: number; nanoseconds?: number } | any;
  durationMs: number;
  timeToRelaxMs: number;
  notes?: string;
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

export default function SessionHistoryScreen() {
  const [items, setItems] = useState<SessionItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<{ id: string; notes: string } | null>(null);
  const [sortNewest, setSortNewest] = useState(true);

  const reload = useCallback(async () => {
    const rows = await listMySessions();
    const norm = (rows as any[]).map((i) => ({
      id: i.id,
      startedAt: i.startedAt,
      durationMs: i.durationMs ?? 0,
      timeToRelaxMs: i.timeToRelaxMs ?? 0,
      notes: i.notes ?? '',
    })) as SessionItem[];

    norm.sort((a, b) =>
      (toDate(sortNewest ? b.startedAt : a.startedAt).getTime() -
        toDate(sortNewest ? a.startedAt : b.startedAt).getTime())
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

  const metrics = useMemo(() => {
    if (!items.length) return null;
    const times = items.map((i) => i.timeToRelaxMs);
    const fastest = Math.min(...times);
    const avg = Math.floor(times.reduce((a, b) => a + b, 0) / times.length);
    const total = items.reduce((a, i) => a + (i.durationMs || 0), 0);
    return { fastest, avg, total, count: items.length };
  }, [items]);

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
    const pct = item.durationMs > 0 ? Math.min(1, Math.max(0, item.timeToRelaxMs / item.durationMs)) : 0;
    return (
      <Animated.View
        style={[
          st.card,
          {
            opacity: 0,
            transform: [{ translateY: 12 }],
          },
        ]}
        entering={{
          initialValues: { opacity: 0, transform: [{ translateY: 12 }] },
          animations: {
            opacity: withTiming(1, { duration: 260 }),
            transform: [{ translateY: withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) }) }],
          },
          delay: 40 * index,
        } as any}
      >
        <View style={st.cardRowTop}>
          <View style={{ flex: 1 }}>
            <Text style={st.title}>Relaxed in {mmss(item.timeToRelaxMs)}</Text>
            <Text style={st.sub}>
              Duration {mmss(item.durationMs)} • {started.toLocaleString()}
            </Text>
          </View>

          <View style={st.kpiPill}>
            <Ionicons name="sparkles-outline" size={14} color="#0B1220" />
            <Text style={st.kpiText}>{Math.round(pct * 100)}%</Text>
          </View>
        </View>

        <View style={st.barTrack}>
          <LinearGradient
            colors={[BRAND, BRAND2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[st.barFill, { width: `${Math.round(pct * 100)}%` }]}
          />
        </View>
        <View style={st.barLabels}>
          <Text style={st.barLabelLeft}>calm</Text>
          <Text style={st.barLabelRight}>full session</Text>
        </View>

        {editing?.id === item.id ? (
          <View style={{ marginTop: 10 }}>
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
          <View style={[st.row, { marginTop: 10 }]}>
            <Pressable style={st.btnGhost} onPress={() => setEditing({ id: item.id, notes: item.notes || '' })}>
              <Ionicons name="create-outline" size={16} color="#E5E7EB" />
              <Text style={st.btnGhostText}>Edit</Text>
            </Pressable>
            <Pressable
              style={[st.btn, { backgroundColor: '#EF4444' }]}
              onPress={async () => {
                await deleteSession(item.id);
                setItems((prev) => prev.filter((x) => x.id !== item.id));
              }}
            >
              <Ionicons name="trash-outline" size={16} color="#0B1220" />
              <Text style={st.btnText}>Delete</Text>
            </Pressable>
          </View>
        )}

        {item.notes ? <Text style={st.notes}>“{item.notes}”</Text> : null}
      </Animated.View>
    );
  };

  return (
    <View style={st.screen}>
      <Animated.View style={[st.header, headerStyle]}>
        <View style={st.headerRow}>
          <View style={st.badge}>
            <Ionicons name="stats-chart-outline" size={14} color="#0B1220" />
          </View>
          <Text style={st.h1}>Your Stats</Text>
          <Pressable style={st.sortBtn} onPress={() => setSortNewest((s) => !s)}>
            <Ionicons name={sortNewest ? 'swap-vertical' : 'swap-vertical'} size={16} color="#E5E7EB" />
            <Text style={st.sortText}>{sortNewest ? 'Newest' : 'Oldest'}</Text>
          </Pressable>
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
      </Animated.View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 18 }}
        refreshControl={<RefreshControl tintColor="#fff" refreshing={refreshing} onRefresh={onRefresh} />}
        ListFooterComponent={<View style={{ height: 8 }} />}
      />
    </View>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG, padding: 16 },

  header: { marginBottom: 8 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badge: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#A78BFA',
  },
  h1: { color: '#fff', fontSize: 22, fontWeight: '900' },
  sortBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: '#1F2937',
  },
  sortText: { color: '#E5E7EB', fontWeight: '800', fontSize: 12 },

  statsWrap: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statCard: {
    flexGrow: 1,
    minWidth: '48%',
    backgroundColor: '#0F172A',
    borderWidth: 1, borderColor: '#1F2937',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  statLabel: { color: '#9CA3AF', fontSize: 12 },
  statValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 2 },

  empty: { color: '#94A3B8', marginBottom: 12 },

  card: {
    backgroundColor: '#0F172A',
    borderColor: '#1F2937',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  cardRowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  kpiPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
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

  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
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
});
