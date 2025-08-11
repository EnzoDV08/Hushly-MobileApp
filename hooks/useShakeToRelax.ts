import { useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';

export function useShakeToRelax(
  onShake: () => void,
  enabled = true,
  cooldownMs = 10_000,
  thresholdG = 1.35,
  intervalMs = 50
) {
  const lastTsRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    Accelerometer.setUpdateInterval(intervalMs);

    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const g = Math.sqrt(x * x + y * y + z * z); 
      const delta = Math.abs(g - 1.0);            

      if (delta > thresholdG) {
        const now = Date.now();
        if (now - lastTsRef.current >= cooldownMs) {
          lastTsRef.current = now;
          onShake();
        }
      }
    });

    return () => sub.remove();
  }, [enabled, onShake, cooldownMs, thresholdG, intervalMs]);
}