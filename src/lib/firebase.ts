import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// WARNING: It is not recommended to store this configuration directly in your code.
// For better security and flexibility, use environment variables.
const firebaseConfig = {
  apiKey: "AIzaSyC8bO9q5hYxqj8gUKAvPt80WnC8hE7LQTc",
  authDomain: "agricoop-3592f.firebaseapp.com",
  projectId: "agricoop-3592f",
  storageBucket: "agricoop-3592f.firebasestorage.app",
  messagingSenderId: "989213083275",
  appId: "1:989213083275:web:7fde7906e1d327f85bf68e"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);


export function checkFirebaseConfig() {
    // This check is no longer needed as the configuration is hardcoded.
    // It is kept for compatibility with other parts of the application that import it.
    const allKeysPresent = Object.values(firebaseConfig).every(Boolean);
    if (!allKeysPresent) {
        // This will only trigger if the hardcoded object above is incomplete.
        throw new Error('Hardcoded Firebase configuration is missing values.');
    }
}

export { app, auth, db };
