import { Accelerometer } from 'expo-sensors';
import { useEffect, useState } from 'react';

export function useShakeToRelax(callback: () => void) {
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    const subscribe = () => {
      const sub = Accelerometer.addListener(({ x, y, z }) => {
        const totalForce = Math.abs(x) + Math.abs(y) + Math.abs(z);
        if (totalForce > 1.8) callback(); // tweak threshold
      });
      setSubscription(sub);
    };

    subscribe();
    return () => subscription?.remove();
  }, []);
}
