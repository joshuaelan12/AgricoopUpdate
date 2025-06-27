import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC8bO9q5hYxqj8gUKAvPt80WnC8hE7LQTc",
  authDomain: "agricoop-3592f.firebaseapp.com",
  projectId: "agricoop-3592f",
  storageBucket: "agricoop-3592f.appspot.com",
  messagingSenderId: "989213083275",
  appId: "1:989213083275:web:7fde7906e1d327f85bf68e"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
