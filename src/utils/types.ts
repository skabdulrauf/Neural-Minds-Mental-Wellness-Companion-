export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  emotion?: string;
  riskLevel?: 'low' | 'moderate' | 'high' | 'critical';
}

export type MiraFactCategory = 'problem' | 'person' | 'goal' | 'event' | 'mood' | 'trigger' | 'win' | 'preference' | 'detail';

export interface MiraMemoryFact {
  id?: string;
  type: MiraFactCategory;
  text: string;
  date: string;
  pinned?: boolean;
}

export interface SanctuaryCloudState {
  uid: string;
  gardenPlants?: string;
  futureLetters?: string;
  activeProgram?: string;
  firstAidKit?: string;
  soundPresets?: string;
  faithPreference?: string;
  miraMode?: string;
  updatedAt: number;
}

export interface UserProfile {
  uid?: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  inferredAge?: 'child' | 'teen' | 'young_adult' | 'adult' | 'elderly';
  inferredGender?: 'male' | 'female' | 'non_binary' | 'unknown';
  menstrualAware?: boolean;
  concerns: string[];
  distressedCount: number;
  messageCount: number;
  lastVisit?: number;
  phq9Scores: number[];
  moodHistory: { date: string; mood: number; emotion: string }[];
  streak: number;
  lastActiveDate?: string;
  journalEntries: { date: string; content: string; prompt: string }[];
  miraMemory?: MiraMemoryFact[];
  updatedAt?: number;
}

export interface LocationData {
  lat: number;
  lon: number;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
}

export interface Professional {
  name: string;
  type: string;
  distance?: number;
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  description?: string;
  lat: number;
  lon: number;
}

export interface CrisisResource {
  name: string;
  phone: string;
  description: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export type AppView = 'feed' | 'chat' | 'dashboard' | 'breathing' | 'grounding' | 'journal' | 'professionals' | 'sounds' | 'stories' | 'toolkit' | 'faith' | 'news' | 'coaching' | 'programs' | 'badges' | 'letters' | 'firstaid' | 'story' | 'relationships' | 'student' | 'garden' | 'moments' | 'family';

export interface PHQ9Question {
  id: number;
  text: string;
}
