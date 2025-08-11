import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCj5qiPWKgg97G_HUOpW-xKGw1G8sL1M9c',
  authDomain: 'hushly-mobile.firebaseapp.com',
  projectId: 'hushly-mobile',
  storageBucket: 'hushly-mobile.firebasestorage.app',
  messagingSenderId: '433413816515',
  appId: '1:433413816515:web:a914058e779be85614a276',
  measurementId: 'G-6E3RWGTVJL',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];


export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app, 'gs://hushly-mobile.firebasestorage.app');




