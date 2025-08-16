import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

export type SessionCreate = {
  startedAt: number;
  relaxedAt: number;
  durationMs: number;
  timeToRelaxMs: number;
  notes?: string;
  peakPct?: number;  
};

export type RelaxSession = {
  id?: string;
  uid: string;
  startedAt: Timestamp;
  relaxedAt: Timestamp;
  durationMs: number;
  timeToRelaxMs: number;
  notes?: string;
  peakPct?: number | null;  
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

function userSessionsCol(uid: string) {
  const db = getFirestore();
  return collection(db, 'users', uid, 'sessions');
}

export async function createSession(data: SessionCreate) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

  const payload: Omit<RelaxSession, 'id'> = {
    uid: user.uid,
    startedAt: Timestamp.fromMillis(data.startedAt),
    relaxedAt: Timestamp.fromMillis(data.relaxedAt),
    durationMs: Math.max(0, Math.floor(data.durationMs || 0)),
    timeToRelaxMs: Math.max(0, Math.floor(data.timeToRelaxMs || 0)),
    notes: data.notes ?? '',
    peakPct:
      typeof data.peakPct === 'number' && isFinite(data.peakPct)
        ? clamp01(data.peakPct)      
        : null,
    createdAt: serverTimestamp() as any,
    updatedAt: serverTimestamp() as any,
  };

  const ref = await addDoc(userSessionsCol(user.uid), payload as any);
  return ref.id;
}


export async function listMySessions(): Promise<RelaxSession[]> {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');

  const q = query(userSessionsCol(user.uid), orderBy('startedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as RelaxSession[];
}

export async function updateSession(id: string, patch: Partial<Pick<RelaxSession, 'notes'>>) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');

  const db = getFirestore();
  await updateDoc(doc(db, 'users', user.uid, 'sessions', id), {
    ...patch,
    updatedAt: serverTimestamp(),
  } as any);
}

export async function deleteSession(id: string) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');

  const db = getFirestore();
  await deleteDoc(doc(db, 'users', user.uid, 'sessions', id));
}
