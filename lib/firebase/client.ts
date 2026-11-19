import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const clean = (val?: string) => (val ? val.trim().replace(/^[\r\n\t]+|[\r\n\t]+$/g, '') : undefined);

const firebaseConfig = {
  apiKey: clean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY) || "AIzaSyDeaLEE1bTWou8_J56LYLG36bEvJnYYZjo",
  authDomain: clean(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) || "toc1-d8f54.firebaseapp.com",
  projectId: clean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) || "toc1-d8f54",
  storageBucket: clean(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) || "toc1-d8f54.firebasestorage.app",
  messagingSenderId: clean(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) || "583310116967",
  appId: clean(process.env.NEXT_PUBLIC_FIREBASE_APP_ID) || "1:583310116967:web:39052f02dcf2a22f6d6cc2",
  measurementId: clean(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) || "G-9E7N4MJD23"
};

// Initialize Firebase (Singleton pattern to prevent re-initialization during SSR/hot-reload)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firebase Analytics safely for client-side browser only
export const initAnalytics = async () => {
  if (typeof window !== 'undefined') {
    const supported = await isSupported();
    if (supported) {
      return getAnalytics(app);
    }
  }
  return null;
};
