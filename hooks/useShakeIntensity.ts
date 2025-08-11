import { useEffect, useRef, useState } from 'react';
import { Accelerometer } from 'expo-sensors';

export function useShakeIntensity(
  enabled = true,
  {
    intervalMs = 55,
    alpha = 0.22,
    startThreshold = 0.40, 
    stopThreshold = 0.18,  
    graceMs = 1200,
  } = {}
) {
  const [intensity, setIntensity] = useState(0);
  const [isShaking, setIsShaking] = useState(false);

  const emaRef = useRef(0);
  const baselineRef = useRef(0);   
  const lastAboveRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    Accelerometer.setUpdateInterval(intervalMs);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const g = Math.sqrt(x * x + y * y + z * z);
      let delta = Math.abs(g - 1.0);

      if (delta < 0.25) {
        baselineRef.current = baselineRef.current * 0.98 + delta * 0.02;
      }

      if (baselineRef.current > delta) baselineRef.current = delta;

      delta = Math.max(0, delta - baselineRef.current);


      emaRef.current = alpha * delta + (1 - alpha) * emaRef.current;
      const smoothed = emaRef.current;
      setIntensity(smoothed);

      const now = Date.now();
      if (smoothed >= startThreshold) {
        lastAboveRef.current = now;
        if (!isShaking) setIsShaking(true);
      } else {
        if (isShaking && now - lastAboveRef.current >= graceMs && smoothed <= stopThreshold) {
          setIsShaking(false);
        }
      }
    });

    return () => sub.remove();
  }, [enabled, intervalMs, alpha, startThreshold, stopThreshold, graceMs, isShaking]);

  return { intensity, isShaking };
}
