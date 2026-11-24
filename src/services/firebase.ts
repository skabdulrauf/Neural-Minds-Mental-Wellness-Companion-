import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  Auth,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  Firestore,
} from 'firebase/firestore';
import { FirebaseConfig, UserProfile, ChatMessage } from '../utils/types';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function getFirebaseConfig(): FirebaseConfig | null {
  const stored = localStorage.getItem('neuralminds_firebase_config');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function saveFirebaseConfig(config: FirebaseConfig): void {
  localStorage.setItem('neuralminds_firebase_config', JSON.stringify(config));
}

export function initFirebase(): boolean {
  const config = getFirebaseConfig();
  if (!config) return false;

  try {
    app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
    return true;
  } catch {
    return false;
  }
}

export function getAuthInstance(): Auth | null {
  return auth;
}

export function getDbInstance(): Firestore | null {
  return db;
}

export async function signUpEmail(email: string, password: string): Promise<User> {
  if (!auth) throw new Error('Firebase not initialized');
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(result.user);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') throw new Error('This email is already part of our community. Try signing in instead.');
    if (error.code === 'auth/weak-password') throw new Error('Let\'s make that password a bit stronger — at least 6 characters.');
    if (error.code === 'auth/invalid-email') throw new Error('That email doesn\'t look quite right. Could you double-check it?');
    throw new Error('Something went wrong creating your account. Let\'s try again.');
  }
}

export async function signInEmail(email: string, password: string): Promise<User> {
  if (!auth) throw new Error('Firebase not initialized');
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') throw new Error('I don\'t recognize that email. Would you like to create a new account?');
    if (error.code === 'auth/wrong-password') throw new Error('That password doesn\'t match. Want to try again?');
    if (error.code === 'auth/too-many-requests') throw new Error('Too many attempts — let\'s take a brief pause and try again soon.');
    throw new Error('Something went wrong signing in. Let\'s give it another try.');
  }
}

export async function signInGoogle(): Promise<User> {
  if (!auth) throw new Error('Firebase not initialized');
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider);
      throw new Error('REDIRECT');
    }
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('No worries — you closed the sign-in window. Ready when you are.');
    }
    throw new Error('Google sign-in hit a bump. Let\'s try again.');
  }
}

export async function checkRedirectResult(): Promise<User | null> {
  if (!auth) return null;
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch {
    return null;
  }
}

export async function logOut(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export function onAuth(callback: (user: User | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function saveUserProfile(uid: string, profile: Partial<UserProfile>): Promise<void> {
  if (!db) return;
  try {
    const ref = doc(db, 'users', uid);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(ref, profile as any);
    } else {
      await setDoc(ref, profile);
    }
  } catch (error) {
    console.warn('Firestore save error:', error);
  }
}

export async function loadUserProfile(uid: string): Promise<Partial<UserProfile> | null> {
  if (!db) return null;
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as Partial<UserProfile>) : null;
  } catch {
    return null;
  }
}

export async function saveChatHistory(uid: string, messages: ChatMessage[]): Promise<void> {
  if (!db) return;
  try {
    const ref = doc(db, 'chats', uid);
    await setDoc(ref, { messages: messages.slice(-100), updatedAt: Date.now() });
  } catch {
    console.warn('Failed to save chat history');
  }
}

export async function loadChatHistory(uid: string): Promise<ChatMessage[]> {
  if (!db) return [];
  try {
    const ref = doc(db, 'chats', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data().messages || [];
    }
    return [];
  } catch {
    return [];
  }
}

export async function logCrisisEvent(uid: string, message: string): Promise<void> {
  if (!db) return;
  try {
    const ref = doc(db, 'crisis_logs', `${uid}_${Date.now()}`);
    await setDoc(ref, {
      uid,
      timestamp: Date.now(),
      messageSnippet: message.substring(0, 100),
    });
  } catch {
    console.warn('Failed to log crisis event');
  }
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseConfig() !== null;
}
