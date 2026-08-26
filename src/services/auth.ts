import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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

export async function signInAdmin(): Promise<AdminSession> {
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

export async function signOutAdmin(): Promise<void> {
  if (!isFirebaseConfigured()) return;
  const { auth } = getFirebaseServices();
  await signOut(auth);
}

async function toAdminSession(user: User): Promise<AdminSession> {
  const { db } = getFirebaseServices();
  const adminRef = doc(db, 'admins', user.uid);
  const adminSnap = await getDoc(adminRef);

  return {
    uid: user.uid,
    email: user.email,
    isAdmin: adminSnap.exists(),
    source: 'firebase'
  };
}
