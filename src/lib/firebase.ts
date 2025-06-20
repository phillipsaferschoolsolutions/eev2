
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore'; // Added
import { getFunctions, type Functions } from 'firebase/functions';
import { getStorage, type FirebaseStorage } from 'firebase/storage'; // Added

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;
let functions: Functions;
let storage: FirebaseStorage; // Added

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0]!;
}

auth = getAuth(app);
firestore = getFirestore(app);
functions = getFunctions(app);
storage = getStorage(app); // Initialized

// Set persistence
auth.setPersistence(browserLocalPersistence).then(() => {
  // The problematic line that caused the error has been removed.
  // If Firebase Auth debugging is needed, it's typically done through
  // browser network inspection and console logs from the SDK itself.
});

// Check if all required environment variables are set
// This is more of a developer-time check; consider more robust checks for production
if (
  !firebaseConfig.apiKey ||
  !firebaseConfig.authDomain ||
  !firebaseConfig.projectId ||
  !firebaseConfig.appId
) {
  console.warn(
    'Firebase environment variables are not fully configured. ' +
    'Please check your .env file and ensure all NEXT_PUBLIC_FIREBASE_* variables are set.'
  );
}


export { app, auth, firestore, functions, storage }; // Exported storage
