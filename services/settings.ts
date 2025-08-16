// services/settings.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { auth, db } from '../firebase/firebaseConfig';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';

export type Sens = 'low' | 'med' | 'high';
export type Hand = 'left' | 'right' | 'auto';

export type Prefs = {
  shake: boolean;        // kept for main screen
  haptics: boolean;
  autoplay: boolean;
  sensitivity: Sens;
  oneHand: boolean;      // NEW
  hand: Hand;            // NEW
};

export const K_SHAKE = 'settings:shake';
export const K_HAPTICS = 'settings:haptics';
export const K_AUTOPLAY = 'settings:autoplay';
export const K_SENS = 'settings:sensitivity';
export const K_ONEHAND = 'settings:oneHand';    // NEW
export const K_HAND = 'settings:hand';          // NEW

export const SETTINGS_EVENT = 'hushly:settingsChanged';

const DEFAULTS: Prefs = {
  shake: true,
  haptics: true,
  autoplay: false,
  sensitivity: 'med',
  oneHand: false,
  hand: 'auto',
};

let cache: Prefs = { ...DEFAULTS };
const listeners = new Set<(p: Prefs) => void>();
let unsubCloud: null | (() => void) = null;
let saveTimer: any = null;

function prefsRef(uid: string) {
  return doc(db, 'users', uid, 'meta', 'prefs');
}

async function loadLocal(): Promise<Prefs> {
  const [s1, s2, s3, s4, s5, s6] = await Promise.all([
    AsyncStorage.getItem(K_SHAKE),
    AsyncStorage.getItem(K_HAPTICS),
    AsyncStorage.getItem(K_AUTOPLAY),
    AsyncStorage.getItem(K_SENS),
    AsyncStorage.getItem(K_ONEHAND),
    AsyncStorage.getItem(K_HAND),
  ]);

  return {
    shake: s1 != null ? s1 === '1' : DEFAULTS.shake,
    haptics: s2 != null ? s2 === '1' : DEFAULTS.haptics,
    autoplay: s3 != null ? s3 === '1' : DEFAULTS.autoplay,
    sensitivity: s4 === 'low' || s4 === 'high' ? (s4 as Sens) : DEFAULTS.sensitivity,
    oneHand: s5 != null ? s5 === '1' : DEFAULTS.oneHand,
    hand: s6 === 'left' || s6 === 'right' || s6 === 'auto' ? (s6 as Hand) : DEFAULTS.hand,
  };
}

async function saveLocal(p: Prefs) {
  await Promise.all([
    AsyncStorage.setItem(K_SHAKE, p.shake ? '1' : '0'),
    AsyncStorage.setItem(K_HAPTICS, p.haptics ? '1' : '0'),
    AsyncStorage.setItem(K_AUTOPLAY, p.autoplay ? '1' : '0'),
    AsyncStorage.setItem(K_SENS, p.sensitivity),
    AsyncStorage.setItem(K_ONEHAND, p.oneHand ? '1' : '0'),
    AsyncStorage.setItem(K_HAND, p.hand),
  ]);
}

function emit(p: Prefs) {
  listeners.forEach((fn) => fn(p));
  DeviceEventEmitter.emit(SETTINGS_EVENT, p);
}

async function loadCloud(uid: string) {
  const snap = await getDoc(prefsRef(uid));
  return (snap.exists() ? (snap.data() as Partial<Prefs>) : {});
}

function saveCloudDebounced(uid: string, p: Prefs) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    setDoc(prefsRef(uid), { ...p, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
  }, 250);
}

export async function loadPrefs(): Promise<Prefs> {
  // local first
  cache = { ...DEFAULTS, ...(await loadLocal()) };
  emit(cache);

  // then cloud merge/subscribe if signed in
  if (auth.currentUser?.uid) {
    const uid = auth.currentUser.uid;
    const remote = await loadCloud(uid);
    cache = { ...cache, ...remote };
    await saveLocal(cache);
    emit(cache);

    unsubCloud?.();
    unsubCloud = onSnapshot(prefsRef(uid), (snap) => {
      if (!snap.exists()) return;
      const next = { ...cache, ...(snap.data() as Partial<Prefs>) };
      if (JSON.stringify(next) !== JSON.stringify(cache)) {
        cache = next;
        saveLocal(cache);
        emit(cache);
      }
    });
  } else {
    unsubCloud?.();
    unsubCloud = null;
  }

  return cache;
}

export function getCachedPrefs(): Prefs {
  return cache;
}

export async function update(patch: Partial<Prefs>) {
  cache = { ...cache, ...patch };
  await saveLocal(cache);
  emit(cache);
  if (auth.currentUser?.uid) saveCloudDebounced(auth.currentUser.uid, cache);
}

export const Settings = {
  load: loadPrefs,
  get: getCachedPrefs,
  update,
  subscribe(fn: (p: Prefs) => void) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };  
  },
};

auth.onAuthStateChanged(() => { loadPrefs(); });
