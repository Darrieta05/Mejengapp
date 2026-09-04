import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { AdminSession } from '../types/auth';
import { getFirebaseServices, isFirebaseConfigured } from './firebase';

export interface AuthChangePayload {
  session: AdminSession | null;
}

export function subscribeAuthChanges(
  callback: (payload: AuthChangePayload) => void
): () => void {
  if (!isFirebaseConfigured()) {
    callback({
      session: {
        uid: 'demo-admin',
        email: 'demo@local',
        isAdmin: true,
        source: 'demo'
      }
    });
    return () => {};
  }

  const { auth } = getFirebaseServices();
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback({ session: null });
      return;
    }
    callback({ session: await toAdminSession(user) });
  });
}

export async function signInWithGoogle(): Promise<AdminSession> {
  if (!isFirebaseConfigured()) {
    return {
      uid: 'demo-admin',
      email: 'demo@local',
      isAdmin: true,
      source: 'demo'
    };
  }

  const { auth } = getFirebaseServices();
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return toAdminSession(result.user);
}

export const signInAdmin = signInWithGoogle;

export async function signOutAdmin(): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const { auth } = getFirebaseServices();
  await signOut(auth);
}

async function toAdminSession(user: User): Promise<AdminSession> {
  const { db } = getFirebaseServices();
  await setDoc(
    doc(db, 'users', user.uid),
    {
      uid: user.uid,
      email: user.email,
      role: 'player'
    },
    { merge: true }
  ).catch(() => undefined);
  const adminRef = doc(db, 'admins', user.uid);
  const adminSnap = await getDoc(adminRef);

  return {
    uid: user.uid,
    email: user.email,
    isAdmin: adminSnap.exists(),
    source: 'firebase'
  };
}
