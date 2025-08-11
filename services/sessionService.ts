import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, orderBy, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';

const COL = 'relaxSessions';

export type RelaxSession = {
  id?: string;
  userId: string;
  startedAt: number;
  relaxedAt: number;
  durationMs: number;
  timeToRelaxMs: number;
  notes?: string;
  createdAt: number;
};

export async function createSession(data: Omit<RelaxSession, 'id'|'userId'|'createdAt'>) {
  const auth = getAuth();
  if (!auth.currentUser) throw new Error('Not signed in');
  const db = getFirestore();
  const ref = await addDoc(collection(db, COL), {
    userId: auth.currentUser.uid,
    ...data,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function listMySessions(): Promise<RelaxSession[]> {
  const auth = getAuth();
  if (!auth.currentUser) throw new Error('Not signed in');
  const db = getFirestore();
  const q = query(collection(db, COL), where('userId', '==', auth.currentUser.uid), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
}

export async function deleteSession(id: string) {
  const db = getFirestore();
  await deleteDoc(doc(db, COL, id));
}

export async function updateSession(id: string, patch: Partial<Pick<RelaxSession,'notes'>>) {
  const db = getFirestore();
  await updateDoc(doc(db, COL, id), patch as any);
}
