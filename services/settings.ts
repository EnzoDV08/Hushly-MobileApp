import AsyncStorage from '@react-native-async-storage/async-storage';

export type Sens = 'low' | 'med' | 'high';
export type Prefs = { shake: boolean; haptics: boolean; autoplay: boolean; sensitivity: Sens };

export const K_SHAKE = 'settings:shake';
export const K_HAPTICS = 'settings:haptics';
export const K_AUTOPLAY = 'settings:autoplay';
export const K_SENS = 'settings:sensitivity';

let cache: Prefs | null = null;
const listeners = new Set<(p: Prefs) => void>();

export async function loadPrefs(): Promise<Prefs> {
  const [s1, s2, s3, s4] = await Promise.all([
    AsyncStorage.getItem(K_SHAKE),
    AsyncStorage.getItem(K_HAPTICS),
    AsyncStorage.getItem(K_AUTOPLAY),
    AsyncStorage.getItem(K_SENS),
  ]);
  cache = {
    shake: s1 != null ? s1 === '1' : true,
    haptics: s2 != null ? s2 === '1' : true,
    autoplay: s3 != null ? s3 === '1' : false,
    sensitivity: s4 === 'low' || s4 === 'high' ? s4 : 'med',
  };
  return cache!;
}

export function getCachedPrefs(): Prefs {
  return cache ?? { shake: true, haptics: true, autoplay: false, sensitivity: 'med' };
}

async function save(p: Partial<Prefs>) {
  const cur = { ...getCachedPrefs(), ...p };
  cache = cur;
  await Promise.all([
    AsyncStorage.setItem(K_SHAKE, cur.shake ? '1' : '0'),
    AsyncStorage.setItem(K_HAPTICS, cur.haptics ? '1' : '0'),
    AsyncStorage.setItem(K_AUTOPLAY, cur.autoplay ? '1' : '0'),
    AsyncStorage.setItem(K_SENS, cur.sensitivity),
  ]);
  listeners.forEach((fn) => fn(cur));
}

export const Settings = {
  load: loadPrefs,
  get: getCachedPrefs,
  update: save,
  subscribe(fn: (p: Prefs) => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
