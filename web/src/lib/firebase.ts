import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth, RecaptchaVerifier, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase Auth lazily - cached instances
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!_app) {
    if (!getApps().length) {
      _app = initializeApp(firebaseConfig);
    } else {
      _app = getApps()[0];
    }
  }
  return _app;
}

export function getAuthInstance(): Auth {
  if (!_auth) {
    _auth = getAuth(getFirebaseApp());
  }
  return _auth;
}

export { getFirebaseApp as getApp };

// Recaptcha verifier for phone auth
let recaptchaVerifier: RecaptchaVerifier | null = null;

export function getRecaptchaVerifier(
  containerId: string = "recaptcha-container"
): RecaptchaVerifier {
  if (!recaptchaVerifier && typeof window !== "undefined") {
    recaptchaVerifier = new RecaptchaVerifier(getAuthInstance(), containerId, {
      size: "invisible",
      callback: () => {
        // reCAPTCHA solved
      },
    });
  }
  return recaptchaVerifier!;
}

export function clearRecaptchaVerifier(): void {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
}

// Google Auth
const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const auth = getAuthInstance();
  return signInWithPopup(auth, googleProvider);
}

export async function signOut() {
  const auth = getAuthInstance();
  return firebaseSignOut(auth);
}
