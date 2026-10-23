// Import the functions you need from the SDKs you need
import {
    initializeApp
} from "firebase/app";
import {
    getAnalytics
} from "firebase/analytics";
import {
    connectAuthEmulator,
    getAuth
} from "firebase/auth";
import {
    connectFirestoreEmulator,
    getFirestore
} from "firebase/firestore";

// Values come from .env.development (dev project), .env.production (prod project) or .env.emulator
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp)

if (import.meta.env.VITE_USE_EMULATORS === "true") {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectAuthEmulator(getAuth(firebaseApp), "http://127.0.0.1:9099", { disableWarnings: true });
} else {
    getAnalytics(firebaseApp);
}
