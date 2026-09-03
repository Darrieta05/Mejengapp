import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

let app: FirebaseApp | null = null;

function getEnv(name: string): string {
  return (import.meta.env[name] as string | undefined)?.trim() ?? '';
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    getEnv('VITE_FIREBASE_API_KEY') &&
      getEnv('VITE_FIREBASE_AUTH_DOMAIN') &&
      getEnv('VITE_FIREBASE_PROJECT_ID')
  );
}

function getFirebaseConfig() {
  return {
    apiKey: getEnv('VITE_FIREBASE_API_KEY'),
    authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnv('VITE_FIREBASE_APP_ID')
  };
}

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  app = initializeApp(getFirebaseConfig());
  return app;
}

export function getFirebaseServices() {
  const firebaseApp = getFirebaseApp();
  return {
    auth: getAuth(firebaseApp),
    db: getFirestore(firebaseApp),
    functions: getFunctions(firebaseApp)
  };
}
