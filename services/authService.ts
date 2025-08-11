import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../firebase/firebaseConfig';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  deleteUser,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

export const checkUsernameAvailable = async (username: string): Promise<boolean> => {
  const raw = (username || '').trim();
  if (!raw || raw.length < 2) return false;
  const lower = raw.toLowerCase();
  const snap = await getDoc(doc(db, 'usernames', lower));
  return !snap.exists();
};

export const assertUsernameAvailable = async (username: string) => {
  const ok = await checkUsernameAvailable(username);
  if (!ok) {
    const err: any = new Error('This username is already taken.');
    err.code = 'username-taken';
    throw err;
  }
};

export const checkEmailAvailable = async (email: string): Promise<boolean> => {
  const e = (email || '').trim().toLowerCase();
  if (!e) return false;
  const methods = await fetchSignInMethodsForEmail(auth, e);
  return methods.length === 0;
};

export const assertEmailAvailable = async (email: string) => {
  try {
    const ok = await checkEmailAvailable(email);
    if (!ok) {
      const err: any = new Error('This email is already registered.');
      err.code = 'email-already-in-use';
      throw err;
    }
  } catch (e: any) {
    if (e?.code === 'auth/invalid-email') {
      const err: any = new Error('Please enter a valid email.');
      err.code = 'invalid-email';
      throw err;
    }
    throw e;
  }
};

const claimUsername = async (uid: string, username: string) => {
  const lower = username.trim().toLowerCase();
  await setDoc(
    doc(db, 'usernames', lower),
    { uid, displayName: username, lower, createdAt: serverTimestamp() },
    { merge: false }
  );
};

export const registerUser = async (email: string, password: string, username: string) => {
  await assertEmailAvailable(email);
  await assertUsernameAvailable(username);

  let createdUid: string | null = null;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;
    createdUid = user.uid;

    await claimUsername(user.uid, username);

    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email ?? null,
      displayName: username,
      displayNameLower: username.trim().toLowerCase(),
      photoURL: user.photoURL ?? null,
      provider: 'password',
      role: 'user',
      points: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await AsyncStorage.setItem('userUID', user.uid);
    return user;
  } catch (e: any) {
    if (createdUid && auth.currentUser && auth.currentUser.uid === createdUid) {
      try { await deleteUser(auth.currentUser); }
      catch { try { await signOut(auth); } catch {} }
    }

    if (e?.code === 'permission-denied' || e?.code === 'username-taken') {
      const err: any = new Error('This username is already taken.');
      err.code = 'username-taken';
      throw err;
    }
    if (e?.code === 'auth/email-already-in-use') {
      const err: any = new Error('This email is already registered.');
      err.code = 'email-already-in-use';
      throw err;
    }
    throw e;
  }
};

export const loginUser = async (email: string, password: string) => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const user = cred.user;
  await setDoc(
    doc(db, 'users', user.uid),
    { uid: user.uid, email: user.email ?? null, updatedAt: serverTimestamp() },
    { merge: true }
  );
  await AsyncStorage.setItem('userUID', user.uid);
  return user;
};

export const logoutUser = async () => {
  await AsyncStorage.removeItem('userUID');
  await signOut(auth);
};
