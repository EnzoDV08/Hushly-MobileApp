import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../firebase/firebaseConfig';
import { createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const registerUser = async (email: string, password: string, username: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const user = cred.user;

 
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    email: user.email ?? null,
    displayName: username,
    photoURL: user.photoURL ?? null,
    provider: 'password',
    role: 'user',
    points: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  await AsyncStorage.setItem('userUID', user.uid);
  console.log(` New user registered: ${user.uid} (${username})`);
  return user;
};

export const loginUser = async (email: string, password: string) => {
  console.log(` Attempting login for: ${email.trim()}`);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const user = cred.user;

  await setDoc(
    doc(db, 'users', user.uid),
    { uid: user.uid, email: user.email ?? null, updatedAt: serverTimestamp() },
    { merge: true }
  );

  await AsyncStorage.setItem('userUID', user.uid);
  console.log(` User logged in: ${user.uid} (${user.email})`);
  return user;
};

export const logoutUser = async () => {
  console.log(' Signing out user...');
  await AsyncStorage.removeItem('userUID');
  await signOut(auth);

  console.log(' User signed out successfully');
};
