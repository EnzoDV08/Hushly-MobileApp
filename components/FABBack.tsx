// components/FABBack.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings } from '../services/settings';

export const FAB_BACK_SIZE = 58;
const BTN_SIZE = FAB_BACK_SIZE;
const ACCENT = '#7A00FF';
const ACCENT2 = '#9B5CFF';
const MARGIN_H = 20; // distance from screen edge

export default function FABBack({
  onPress,
  bottomOffset = 0,
}: {
  onPress: () => void;
  bottomOffset?: number;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // one-hand prefs
  const [oneHand, setOneHand] = useState(Settings.get().oneHand);
  const [hand, setHand] = useState(Settings.get().hand);
  useEffect(() => Settings.subscribe(p => {
    setOneHand(p.oneHand);
    setHand(p.hand);
  }), []);

  const side: 'left' | 'right' = useMemo(() => {
    if (!oneHand) return 'left';
    return hand === 'auto' ? 'left' : hand;
  }, [oneHand, hand]);

  // helpers
  const targetLeft = (s: 'left' | 'right') =>
    s === 'left'
      ? MARGIN_H
      : Math.max(MARGIN_H, width - MARGIN_H - BTN_SIZE);

  // shared values
  const appear  = useSharedValue(0);
  const press   = useSharedValue(0);
  const leftSV  = useSharedValue(targetLeft(side));

  // arrow flip: scaleX  + directional nudge
  // left side  -> arrow points LEFT  (scaleX = 1)
  // right side -> arrow points RIGHT (scaleX = -1)
  const flipSV  = useSharedValue(side === 'left' ? 1 : -1);
  const nudgeSV = useSharedValue(0);

  // on mount
  useEffect(() => {
    leftSV.value = targetLeft(side);
    appear.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) });
    flipSV.value = side === 'left' ? 1 : -1;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when side changes (Preferred side toggled)
  useEffect(() => {
    // glide the fab horizontally
    leftSV.value = withTiming(targetLeft(side), { duration: 280, easing: Easing.out(Easing.cubic) });

    // flip the arrow
    flipSV.value = withTiming(side === 'left' ? 1 : -1, { duration: 220, easing: Easing.out(Easing.cubic) });

    // do a tiny nudge in the movement direction
    const dir = side === 'left' ? -1 : 1; // nudge toward the new side
    nudgeSV.value = withTiming(8 * dir, { duration: 140 }, () => {
      nudgeSV.value = withTiming(0, { duration: 180 });
    });
  }, [side, width]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    left: leftSV.value,
    transform: [
      { translateY: (1 - appear.value) * 12 },
      { scale: 1 - press.value * 0.07 },
    ],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: nudgeSV.value }, // directional nudge
      { scaleX: flipSV.value },      // flip arrow
    ],
  }));

  const handlePress = async () => {
    if (Settings.get().haptics) {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    }
    onPress();
  };

  return (
    <Animated.View
      style={[
        styles.wrap,
        { bottom: insets.bottom + 12 + bottomOffset },
        wrapStyle,
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPressIn={() => { press.value = withSpring(1, { mass: 0.25, damping: 14 }); }}
        onPressOut={() => { press.value = withSpring(0, { mass: 0.25, damping: 14 }); }}
        onPress={handlePress}
        style={styles.btn}
        android_ripple={{ color: '#ffffff22', borderless: true, radius: BTN_SIZE }}
      >
        <LinearGradient
          colors={[ACCENT, ACCENT2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <Animated.View style={iconStyle}>
          {/* We always use chevron-back and flip it; this keeps visual weight identical */}
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  btn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
