import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useShakeIntensity } from './useShakeIntensity';
import { navigationRef } from '../navigationRef';
import { K_SHAKE } from '../services/settings';

const SUSTAIN_MS = 1500; // ~1.5s continuous shake before opening Session
const START = 0.24;      // global sensitivity (between your MED and HIGH)
const STOP  = 0.12;

export default function GlobalShakeWatcher() {
  // optional: read Settings toggle once (defaults true)
  const shakeOnRef = useRef(true);
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem('K_SHAKE');
      shakeOnRef.current = raw != null ? raw === '1' : true;
    })();
  }, []);

  const { isShaking } = useShakeIntensity(true, {
    intervalMs: 45,
    alpha: 0.18,
    startThreshold: START,
    stopThreshold: STOP,
    graceMs: 900,
  });

  const sinceRef = useRef<number | null>(null);
  const armedRef = useRef(true);

  useEffect(() => {
  (async () => {
    const raw = await AsyncStorage.getItem(K_SHAKE);
    shakeOnRef.current = raw != null ? raw === '1' : true;
  })();
}, []);

  useEffect(() => {
    if (!shakeOnRef.current) return;

    const now = Date.now();
    const route = navigationRef.getCurrentRoute();
    const onSession = route?.name === 'Session';
    const appActive = AppState.currentState === 'active';

    if (!appActive || onSession) {
      // reset if we can’t/shouldn’t trigger
      sinceRef.current = null;
      armedRef.current = true;
      return;
    }

    if (isShaking) {
      if (sinceRef.current == null) sinceRef.current = now;
      if (armedRef.current && now - sinceRef.current >= SUSTAIN_MS) {
        armedRef.current = false; // one-shot until we calm again
        navigationRef.navigate('Session' as never);
      }
    } else {
      sinceRef.current = null;
      // re-arm after calm
      armedRef.current = true;
    }
  }, [isShaking]);

  return null; // no UI
}