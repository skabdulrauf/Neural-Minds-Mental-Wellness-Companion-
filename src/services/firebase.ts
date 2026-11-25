import { initializeApp, FirebaseApp, getApps, getApp } from 'firebase/app';
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
  getDocFromServer,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import firebaseAppletConfig from '../../firebase-applet-config.json';
import { FirebaseConfig, UserProfile, ChatMessage, SanctuaryCloudState } from '../utils/types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let connectionTested = false;

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

export function getFirebaseConfig(): FirebaseConfig | null {
  if (firebaseAppletConfig && firebaseAppletConfig.apiKey && firebaseAppletConfig.projectId) {
    return firebaseAppletConfig as unknown as FirebaseConfig;
  }
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

async function testConnection() {
  if (!db || connectionTested) return;
  connectionTested = true;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

export function initFirebase(): boolean {
  const config = getFirebaseConfig();
  if (!config) return false;

  try {
    app = getApps().length > 0 ? getApp() : initializeApp(config);
    auth = getAuth(app);
    const databaseId = (firebaseAppletConfig as any)?.firestoreDatabaseId;
    db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
    testConnection();
    return true;
  } catch (err) {
    console.warn('Firebase init error:', err);
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
  if (!auth) initFirebase();
  if (!auth) throw new Error('Firebase not initialized');
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(result.user);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') throw new Error('This email is already part of our community. Try signing in instead.');
    if (error.code === 'auth/weak-password') throw new Error("Let's make that password a bit stronger — at least 6 characters.");
    if (error.code === 'auth/invalid-email') throw new Error("That email doesn't look quite right. Could you double-check it?");
    throw new Error('Something went wrong creating your account. Let\'s try again.');
  }
}

export async function signInEmail(email: string, password: string): Promise<User> {
  if (!auth) initFirebase();
  if (!auth) throw new Error('Firebase not initialized');
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') throw new Error("I don't recognize that email. Would you like to create a new account?");
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') throw new Error("That email or password doesn't match. Want to try again?");
    if (error.code === 'auth/too-many-requests') throw new Error("Too many attempts — let's take a brief pause and try again soon.");
    throw new Error("Something went wrong signing in. Let's give it another try.");
  }
}

export async function signInGoogle(): Promise<User> {
  if (!auth) initFirebase();
  if (!auth) throw new Error('Firebase not initialized');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
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
    throw new Error(error?.message || "Google sign-in hit a bump. Let's try again.");
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
  if (!auth) initFirebase();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

// Sanitize profile payload to match firestore.rules strict schema
function sanitizeProfileForFirestore(uid: string, profile: Partial<UserProfile>): Record<string, any> {
  const payload: Record<string, any> = {
    uid,
    displayName: String(profile.displayName || 'Friend').slice(0, 120),
    concerns: Array.isArray(profile.concerns) ? profile.concerns.slice(0, 50) : [],
    distressedCount: typeof profile.distressedCount === 'number' ? Math.max(0, Math.min(100000, profile.distressedCount)) : 0,
    messageCount: typeof profile.messageCount === 'number' ? Math.max(0, Math.min(1000000, profile.messageCount)) : 0,
    phq9Scores: Array.isArray(profile.phq9Scores) ? profile.phq9Scores.slice(-50) : [],
    moodHistory: Array.isArray(profile.moodHistory) ? profile.moodHistory.slice(-365) : [],
    streak: typeof profile.streak === 'number' ? Math.max(0, Math.min(10000, profile.streak)) : 0,
    journalEntries: Array.isArray(profile.journalEntries) ? profile.journalEntries.slice(-200) : [],
    updatedAt: Date.now(),
  };

  if (typeof profile.email === 'string' && profile.email.length <= 254) payload.email = profile.email;
  if (typeof profile.photoURL === 'string' && profile.photoURL.length <= 1024) payload.photoURL = profile.photoURL;
  if (profile.inferredAge && ['child', 'teen', 'young_adult', 'adult', 'elderly'].includes(profile.inferredAge)) {
    payload.inferredAge = profile.inferredAge;
  }
  if (profile.inferredGender && ['male', 'female', 'non_binary', 'unknown'].includes(profile.inferredGender)) {
    payload.inferredGender = profile.inferredGender;
  }
  if (typeof profile.menstrualAware === 'boolean') payload.menstrualAware = profile.menstrualAware;
  if (typeof profile.lastVisit === 'number') payload.lastVisit = profile.lastVisit;
  if (typeof profile.lastActiveDate === 'string' && profile.lastActiveDate.length <= 20) {
    payload.lastActiveDate = profile.lastActiveDate;
  }
  if (Array.isArray(profile.miraMemory)) {
    payload.miraMemory = profile.miraMemory.slice(-100);
  }
  return payload;
}

export async function saveUserProfile(uid: string, profile: Partial<UserProfile>): Promise<void> {
  if (!db || !auth?.currentUser || auth.currentUser.uid !== uid) return;
  const path = `users/${uid}`;
  try {
    const ref = doc(db, 'users', uid);
    const cleanPayload = sanitizeProfileForFirestore(uid, profile);
    await setDoc(ref, cleanPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadUserProfile(uid: string): Promise<Partial<UserProfile> | null> {
  if (!db || !auth?.currentUser || auth.currentUser.uid !== uid) return null;
  const path = `users/${uid}`;
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as Partial<UserProfile>) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function saveChatHistory(uid: string, messages: ChatMessage[]): Promise<void> {
  if (!db || !auth?.currentUser || auth.currentUser.uid !== uid) return;
  const path = `chats/${uid}`;
  try {
    const ref = doc(db, 'chats', uid);
    await setDoc(ref, {
      uid,
      messages: messages.slice(-150),
      updatedAt: Date.now(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadChatHistory(uid: string): Promise<ChatMessage[]> {
  if (!db || !auth?.currentUser || auth.currentUser.uid !== uid) return [];
  const path = `chats/${uid}`;
  try {
    const ref = doc(db, 'chats', uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data().messages || [];
    }
    return [];
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

// ─── CLOUD SANCTUARY STORAGE SYNC (Garden, Letters, Programs, First Aid, Sound Presets) ───
export async function syncLocalSanctuaryToCloud(uid: string): Promise<boolean> {
  if (!db || !auth?.currentUser || auth.currentUser.uid !== uid) return false;
  const path = `sanctuary_state/${uid}`;
  try {
    const payload: SanctuaryCloudState = {
      uid,
      gardenPlants: (localStorage.getItem('nm_garden') || '[]').slice(0, 50000),
      futureLetters: (localStorage.getItem('nm_future_letters') || '[]').slice(0, 50000),
      activeProgram: (localStorage.getItem('nm_program') || '').slice(0, 20000),
      firstAidKit: (localStorage.getItem('nm_first_aid_kit') || '').slice(0, 20000),
      soundPresets: (localStorage.getItem('nm_sound_volumes') || '{}').slice(0, 10000),
      faithPreference: (localStorage.getItem('nm_faith_religion') || '').slice(0, 40),
      miraMode: (localStorage.getItem('nm_mira_mode') || 'casual').slice(0, 30),
      updatedAt: Date.now(),
    };
    await setDoc(doc(db, 'sanctuary_state', uid), payload);
    localStorage.setItem('nm_last_cloud_sync', String(payload.updatedAt));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

export async function pullSanctuaryFromCloud(uid: string): Promise<SanctuaryCloudState | null> {
  if (!db || !auth?.currentUser || auth.currentUser.uid !== uid) return null;
  const path = `sanctuary_state/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'sanctuary_state', uid));
    if (!snap.exists()) return null;
    const data = snap.data() as SanctuaryCloudState;
    if (data.gardenPlants && data.gardenPlants !== '[]') localStorage.setItem('nm_garden', data.gardenPlants);
    if (data.futureLetters && data.futureLetters !== '[]') localStorage.setItem('nm_future_letters', data.futureLetters);
    if (data.activeProgram) localStorage.setItem('nm_program', data.activeProgram);
    if (data.firstAidKit) localStorage.setItem('nm_first_aid_kit', data.firstAidKit);
    if (data.soundPresets && data.soundPresets !== '{}') localStorage.setItem('nm_sound_volumes', data.soundPresets);
    if (data.faithPreference) localStorage.setItem('nm_faith_religion', data.faithPreference);
    if (data.miraMode) localStorage.setItem('nm_mira_mode', data.miraMode);
    if (data.updatedAt) localStorage.setItem('nm_last_cloud_sync', String(data.updatedAt));
    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export function subscribeSanctuaryState(uid: string, onUpdate: (state: SanctuaryCloudState) => void): () => void {
  if (!db || !auth?.currentUser || auth.currentUser.uid !== uid) return () => {};
  const path = `sanctuary_state/${uid}`;
  const ref = doc(db, 'sanctuary_state', uid);
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as SanctuaryCloudState);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function logCrisisEvent(uid: string, message: string): Promise<void> {
  if (!db || !auth?.currentUser || auth.currentUser.uid !== uid) return;
  const docId = `${uid}_${Date.now()}`;
  const path = `crisis_logs/${docId}`;
  try {
    const ref = doc(db, 'crisis_logs', docId);
    await setDoc(ref, {
      uid,
      timestamp: Date.now(),
      messageSnippet: message.substring(0, 100),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseConfig() !== null;
}
