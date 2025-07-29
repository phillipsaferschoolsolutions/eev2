
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

let app: FirebaseApp | undefined;

// Only initialize Firebase if we're in the browser and have the required config
if (typeof window !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId) {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0]!;
  }
} else if (typeof window !== 'undefined') {
  console.warn(
    'Firebase configuration is incomplete. Please check your .env.local file and ensure all required Firebase environment variables are set:\n' +
    '- NEXT_PUBLIC_FIREBASE_API_KEY\n' +
    '- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN\n' +
    '- NEXT_PUBLIC_FIREBASE_PROJECT_ID\n' +
    '- NEXT_PUBLIC_FIREBASE_APP_ID\n\n' +
    'Get these values from Firebase Console -> Project Settings -> General -> Your apps -> Web app'
  );
}

// Create auth, firestore, functions, and storage only if app is initialized
const auth = app ? getAuth(app) : null;
const firestore = app ? getFirestore(app) : null;
const functions = app ? getFunctions(app) : null;
const storage = app ? getStorage(app) : null;

export { app, auth, firestore, functions, storage };
