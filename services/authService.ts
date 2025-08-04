import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../firebase/firebaseConfig';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const registerUser = async (email: string, password: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const user = cred.user;

 
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    provider: 'password',
    role: 'user',
    points: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await AsyncStorage.setItem('userUID', user.uid);
  return user;
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
