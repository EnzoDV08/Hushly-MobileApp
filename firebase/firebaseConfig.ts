import { initializeApp } from 'firebase/app';
import { getAuth} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// import { initializeAuth, getReactNativePersistence } from 'firebase/auth/react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyCj5qiPWKgg97G_HUOpW-xKGw1G8sL1M9c',
  authDomain: 'hushly-mobile.firebaseapp.com',
  projectId: 'hushly-mobile',
  storageBucket: 'hushly-mobile.appspot.com',
  messagingSenderId: '433413816515',
  appId: '1:433413816515:web:a914058e779be85614a276',
  measurementId: 'G-6E3RWGTVJL',
};


const app = initializeApp(firebaseConfig);
// const auth = initializeAuth(app, {
//   persistence: getReactNativePersistence(ReactNativeAsyncStorage),
// });

// const db = getFirestore(app);

// export { app, auth, db };

export const auth = getAuth(app);
export const db = getFirestore(app);



