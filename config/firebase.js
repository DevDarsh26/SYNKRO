import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if Firebase is configured
const isConfigured = Object.values(firebaseConfig).every(value => value && value !== 'undefined');

let app, auth, db;

if (isConfigured) {
  // Initialize Firebase
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
} else {
  // Provide mock objects for development without Firebase
  console.warn('⚠️ Firebase is not configured. Please set up your environment variables.');
  console.warn('📝 Copy .env.example to .env.local and add your Firebase credentials.');
  
  app = null;
  auth = null;
  db = null;
}

export { app, auth, db, isConfigured };

// Made with Bob
