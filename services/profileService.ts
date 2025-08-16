import { auth, db, storage } from '../firebase/firebaseConfig';
import { updateProfile, updateEmail, reauthenticateWithCredential, EmailAuthProvider, fetchSignInMethodsForEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const checkUsernameAvailable = async (name: string) => {
  const lower = (name || '').trim().toLowerCase();
  if (lower.length < 2) return false;

  const snap = await getDoc(doc(db, 'usernames', lower));
  if (!snap.exists()) return true;

  const current = auth.currentUser?.uid;
  const mappedUid = snap.data()?.uid;
  return mappedUid === current;
};

export const updateDisplayNameAndUsername = async (newName: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');

  const lower = newName.trim().toLowerCase();
  if (!(await checkUsernameAvailable(newName))) {
    const e: any = new Error('This username is already taken.');
    e.code = 'username-taken';
    throw e;
  }

  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  const oldLower = (userSnap.data()?.displayNameLower || '').toLowerCase();

  const batch = writeBatch(db);

  batch.set(doc(db, 'usernames', lower), {
    uid: user.uid, displayName: newName, lower, createdAt: serverTimestamp()
  });

  if (oldLower && oldLower !== lower) {
    batch.delete(doc(db, 'usernames', oldLower));
  }

  batch.set(userRef, {
    displayName: newName,
    displayNameLower: lower,
    updatedAt: serverTimestamp()
  }, { merge: true });

  await batch.commit();
  await updateProfile(user, { displayName: newName });
};

export const checkEmailRegistered = async (email: string) => {
  const methods = await fetchSignInMethodsForEmail(auth, email.trim().toLowerCase());
  return methods.length > 0;
};

export const updateAccountEmail = async (newEmail: string, currentPassword: string) => {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Not signed in');
  const cred = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, cred);
  await updateEmail(user, newEmail.trim().toLowerCase());
  await setDoc(doc(db, 'users', user.uid), {
    email: user.email, updatedAt: serverTimestamp()
  }, { merge: true });
};

export const uploadAvatarFromUri = async (localUri: string) => {
  console.log('[AvatarSvc] start uploadAvatarFromUri, localUri:', localUri);
  const user = auth.currentUser;
  if (!user) {
    console.error('[AvatarSvc] not signed in');
    throw new Error('Not signed in');
  }

  try {
    console.log('[AvatarSvc] fetching blob…');
    const res = await fetch(localUri);
    const blob = await res.blob();
    console.log('[AvatarSvc] blob size/type:', blob.size, blob.type);


    const storagePath = `avatars/${user.uid}.jpg`;
    console.log('[AvatarSvc] storagePath:', storagePath);
    const r = ref(storage, storagePath);

    console.log('[AvatarSvc] uploading bytes…');
    await uploadBytes(r, blob, { contentType: 'image/jpeg' });
    console.log('[AvatarSvc] uploadBytes OK');

    console.log('[AvatarSvc] getting download URL…');
    const url = await getDownloadURL(r);
    const freshUrl = `${url}?v=${Date.now()}`;
    console.log('[AvatarSvc] got URL:', freshUrl);

    console.log('[AvatarSvc] updating profile and Firestore…');
    await updateProfile(user, { photoURL: freshUrl });
    await setDoc(
      doc(db, 'users', user.uid),
      { photoURL: freshUrl, updatedAt: serverTimestamp() },
      { merge: true }
    );
    console.log('[AvatarSvc] saved to Auth + Firestore');

    console.log('[AvatarSvc] end uploadAvatarFromUri');
    return freshUrl;

  } catch (err: any) {
    console.error('[AvatarSvc] ERROR:', err?.code, err?.message, err);
    throw new Error(err?.message || 'Upload failed');
  }
};


