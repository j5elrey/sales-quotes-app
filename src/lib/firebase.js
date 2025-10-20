// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration object
// NOTE: Replace these values with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyBcLfZYZaNlJ1e_RNU4ZfqI57FAk7VpGL8",
  authDomain: "ventas-cotizaciones.firebaseapp.com",
  projectId: "ventas-cotizaciones",
  storageBucket: "ventas-cotizaciones.firebasestorage.app",
  messagingSenderId: "862823015171",
  appId: "1:862823015171:web:42eeef6fac1717774ebf36",
  measurementId: "G-WNJ8E506V2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

