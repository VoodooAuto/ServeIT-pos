// Firebase setup for Khilao app
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCPNhR3Fcgzd8pcHga_muAM3VLhWBdNUaA",
  authDomain: "khilao-ae1b2.firebaseapp.com",
  projectId: "khilao-ae1b2",
  storageBucket: "khilao-ae1b2.firebasestorage.app",
  messagingSenderId: "50532049880",
  appId: "1:50532049880:web:01aa4037ab6e0b5ce848ad",
  measurementId: "G-B434ZRCYV1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); 