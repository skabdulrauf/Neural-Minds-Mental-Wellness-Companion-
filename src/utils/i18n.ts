export type Lang = 'en' | 'hi';

export function getLang(): Lang {
  return (localStorage.getItem('nm_language') as Lang) || 'en';
}

export function setLang(lang: Lang) {
  localStorage.setItem('nm_language', lang);
}

const T = {
  // Nav
  today: { en: 'Today', hi: 'आज' },
  chat: { en: 'Chat', hi: 'चैट' },
  dashboard: { en: 'Dashboard', hi: 'डैशबोर्ड' },
  breathe: { en: 'Breathe', hi: 'सांस' },
  ground: { en: 'Ground', hi: 'ग्राउंड' },
  journal: { en: 'Journal', hi: 'डायरी' },
  sounds: { en: 'Sounds', hi: 'ध्वनि' },
  sleep: { en: 'Sleep', hi: 'नींद' },
  toolkit: { en: 'Toolkit', hi: 'टूलकिट' },
  faith: { en: 'Faith', hi: 'आस्था' },
  news: { en: 'News', hi: 'समाचार' },
  coaching: { en: 'Coaching', hi: 'कोचिंग' },
  help: { en: 'Help', hi: 'मदद' },
  programs: { en: 'Programs', hi: 'प्रोग्राम' },
  badges: { en: 'Badges', hi: 'बैज' },
  letters: { en: 'Letters', hi: 'पत्र' },
  myKit: { en: 'My Kit', hi: 'मेरी किट' },
  myStory: { en: 'My Story', hi: 'मेरी कहानी' },
  relationships: { en: 'Relations', hi: 'रिश्ते' },
  student: { en: 'Student', hi: 'छात्र' },
  garden: { en: 'Garden', hi: 'बगीचा' },
  moments: { en: 'Moments', hi: 'पल' },
  family: { en: 'Family', hi: 'परिवार' },

  // Login
  welcome: { en: 'welcome', hi: 'स्वागत है' },
  loginSubtitle: { en: 'your conversations are saved and waiting for you.', hi: 'आपकी बातचीत सुरक्षित है।' },
  loginSubtitleMobile: { en: 'your conversations are saved and waiting.', hi: 'आपकी बातचीत सुरक्षित है।' },
  continueGoogle: { en: 'continue with google', hi: 'गूगल से जारी रखें' },
  or: { en: 'or', hi: 'या' },
  namePlaceholder: { en: 'your name (or nickname)', hi: 'आपका नाम (या उपनाम)' },
  startAs: { en: 'start as', hi: 'शुरू करें' },
  startGuest: { en: 'start as guest', hi: 'मेहमान के रूप में शुरू करें' },
  seeDemo: { en: '👀 See how it works →', hi: '👀 देखें कैसे काम करता है →' },
  syncNote: { en: 'google syncs across devices • guest stays on this device', hi: 'गूगल सभी डिवाइसों पर सिंक • मेहमान इसी डिवाइस पर' },
  localNote: { en: 'your data stays safely on this device', hi: 'आपका डेटा इसी डिवाइस पर सुरक्षित है' },

  // Sidebar buttons
  newChat: { en: 'New chat', hi: 'नई चैट' },
  exportChats: { en: 'Export chats', hi: 'चैट एक्सपोर्ट' },
  settings: { en: 'Settings', hi: 'सेटिंग्स' },
  signOut: { en: 'Sign out', hi: 'लॉग आउट' },

  // Settings modal
  profile: { en: 'Profile', hi: 'प्रोफ़ाइल' },
  miraPersonality: { en: "Mira's Personality", hi: 'मीरा की शैली' },
  casualFriend: { en: '😎 Casual friend', hi: '😎 दोस्ताना' },
  supportive: { en: '💚 Supportive', hi: '💚 सहयोगी' },
  app: { en: 'App', hi: 'ऐप' },
  aiStatus: { en: 'AI Status', hi: 'AI स्थिति' },
  cloudSync: { en: 'Cloud Sync', hi: 'क्लाउड सिंक' },
  location: { en: 'Location', hi: 'स्थान' },
  messagesSent: { en: 'Messages sent', hi: 'भेजे गए संदेश' },
  memberSince: { en: 'Member since', hi: 'सदस्य' },
  dangerZone: { en: 'Danger Zone', hi: 'खतरे का क्षेत्र' },
  clearHistory: { en: '🗑️ Clear chat history', hi: '🗑️ चैट हिस्ट्री हटाएँ' },
  resetAll: { en: '💣 Reset all data', hi: '💣 सारा डेटा रीसेट करें' },

  // Dashboard
  yourJourney: { en: 'Your Journey', hi: 'आपकी यात्रा' },
  dashSubtitle: { en: 'A reflection of how you\'ve been feeling', hi: 'आपकी भावनाओं का दर्पण' },
  streak: { en: 'Streak', hi: 'स्ट्रीक' },
  avgMood: { en: 'Avg Mood', hi: 'औसत मूड' },
  messages: { en: 'Messages', hi: 'संदेश' },
  topFeeling: { en: 'Top Feeling', hi: 'मुख्य भावना' },
  moodTimeline: { en: 'Mood Timeline', hi: 'मूड टाइमलाइन' },
  emotionLandscape: { en: 'Emotion Landscape', hi: 'भावना चित्र' },

  // Export
  saveExport: { en: 'Save & Export Chats', hi: 'चैट सेव और एक्सपोर्ट' },
  sendGmail: { en: 'Send to Gmail', hi: 'Gmail पर भेजें' },
  saveDrive: { en: 'Save to Drive', hi: 'Drive पर सेव' },
  downloadDevice: { en: 'Download to Device', hi: 'डिवाइस पर डाउनलोड' },

  // Chat
  shareMind: { en: "Share what's on your mind...", hi: 'अपने मन की बात बताएँ...' },
  miraNote: { en: 'Mira listens without judgment. For emergencies, tap Help for crisis resources.', hi: 'मीरा बिना किसी निर्णय के सुनती है। आपातकाल में, मदद टैप करें।' },
  howFeeling: { en: 'how are you today?', hi: 'आज आप कैसे हैं?' },

  // Misc
  safeSpace: { en: 'Safe Space', hi: 'सुरक्षित जगह' },
  loading: { en: 'loading your space...', hi: 'आपकी जगह लोड हो रही है...' },
  connected: { en: '✓ Connected', hi: '✓ कनेक्टेड' },
  close: { en: 'Close', hi: 'बंद करें' },
  cancel: { en: 'Cancel', hi: 'रद्द' },
  save: { en: 'save', hi: 'सेव' },
  edit: { en: 'edit', hi: 'बदलें' },
  stop: { en: 'Stop', hi: 'रुकें' },
} as const;

export type TKey = keyof typeof T;

export function t(key: TKey, lang: Lang): string {
  return T[key]?.[lang] || T[key]?.en || key;
}
