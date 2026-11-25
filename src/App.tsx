import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MessageCircle, BarChart3, Wind, Grip, BookOpen, MapPin,
  LogOut, Menu, X, Leaf, Settings, User as UserIcon, ChevronRight,
  Headphones, Moon, Download, FileJson, FileText, PenLine, Wrench, BookHeart, Sparkles, AlertCircle, Trophy, Bell, Compass, Mail, HeartHandshake, Flower2, Zap,
} from 'lucide-react';
import { AppView, ChatMessage, UserProfile, LocationData } from './utils/types';
import { Lang, getLang, setLang as saveLang, t } from './utils/i18n';
import ChatView from './components/ChatView';
import Dashboard from './components/Dashboard';
import BreathingExercise from './components/BreathingExercise';
import GroundingExercise from './components/GroundingExercise';
import Journal from './components/Journal';
import ProfessionalsView from './components/ProfessionalsView';
import AmbientSounds from './components/AmbientSounds';
import SleepStories from './components/SleepStories';
import WellnessToolkit from './components/WellnessToolkit';
import FaithSection from './components/FaithSection';
import NewsSection from './components/NewsSection';
import LifeCoaching from './components/LifeCoaching';
import Programs from './components/Programs';
import Badges from './components/Badges';
import FutureLetters from './components/FutureLetters';
import FirstAidKit from './components/FirstAidKit';
import LifeStory from './components/LifeStory';
import RelationshipSupport from './components/RelationshipSupport';
import StudentMode from './components/StudentMode';
import GratitudeGarden from './components/GratitudeGarden';
import MindfulMoments from './components/MindfulMoments';
import FamilyMode from './components/FamilyMode';
import DailyFeed from './components/DailyFeed';
import { checkBadges, loadBadgeExtras, saveBadgeExtras, loadUnlockedBadges, saveUnlockedBadges, BadgeExtras, BADGES } from './utils/badges';
import { generateNotifications, dismissNotification, AppNotification } from './utils/notifications';
import { loadStreakData, saveStreakData, recordActivity, isStreakAtRisk, checkMilestone, markMilestoneCelebrated, useStreakFreeze, StreakData, MilestoneInfo } from './utils/streaks';
import { shouldShowSafetyCheckin, markSafetyCheckinShown, recordPanicUse } from './utils/crisis';
import {
  initFirebase, logOut as firebaseLogOut, isFirebaseConfigured,
  saveChatHistory as fbSaveChat, loadChatHistory as fbLoadChat,
  saveUserProfile as fbSaveProfile, loadUserProfile as fbLoadProfile,
  onAuth, signInGoogle, signInEmail, signUpEmail,
  syncLocalSanctuaryToCloud, pullSanctuaryFromCloud,
} from './services/firebase';
import {
  getActiveSession, createLocalSession, createGoogleSession,
  clearActiveSession, saveLocalChatHistory, loadLocalChatHistory,
  saveLocalProfile, loadLocalProfile, exportChatAsJSON, exportChatAsTXT,
  sendChatToGmail, saveToGoogleDrive,
  LocalSession,
} from './services/storage';
import { generateDynamicGreeting, isWrappedDay, generateWeeklyWrapped, loadWeeklyWrapped } from './utils/engagement';
import { getUserLocation } from './services/location';

// ── PANIC OVERLAY ──
function PanicOverlay({ panicPhase, setPanicPhase, panicCount, setPanicCount, onClose }: {
  panicPhase: 'in' | 'hold' | 'out';
  setPanicPhase: (p: 'in' | 'hold' | 'out') => void;
  panicCount: number;
  setPanicCount: (n: number) => void;
  onClose: (sendToChat: boolean) => void;
}) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef(panicPhase);
  const countRef = useRef(panicCount);

  useEffect(() => {
    // Auto-start 4-7-8 breathing
    phaseRef.current = 'in';
    countRef.current = 4;
    setPanicPhase('in');
    setPanicCount(4);

    intervalRef.current = setInterval(() => {
      countRef.current--;
      setPanicCount(countRef.current);

      if (countRef.current <= 0) {
        if (phaseRef.current === 'in') {
          phaseRef.current = 'hold';
          countRef.current = 7;
          setPanicPhase('hold');
        } else if (phaseRef.current === 'hold') {
          phaseRef.current = 'out';
          countRef.current = 8;
          setPanicPhase('out');
        } else {
          phaseRef.current = 'in';
          countRef.current = 4;
          setPanicPhase('in');
        }
        setPanicCount(countRef.current);
      }
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const label = panicPhase === 'in' ? 'breathe in...' : panicPhase === 'hold' ? 'hold...' : 'breathe out...';
  const scale = panicPhase === 'in' ? 1.4 : panicPhase === 'hold' ? 1.4 : 1;
  const dur = panicPhase === 'in' ? 4 : panicPhase === 'out' ? 8 : 0.3;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-forest-950/80 backdrop-blur-lg p-6">

      {/* Calming message */}
      <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="font-serif text-2xl md:text-3xl text-white text-center mb-10 leading-relaxed">
        You are safe.<br />I am here with you.
      </motion.p>

      {/* Breathing circle */}
      <div className="relative mb-10">
        <motion.div
          animate={{ scale }}
          transition={{ duration: dur, ease: 'easeInOut' }}
          className="w-40 h-40 rounded-full bg-gradient-to-br from-forest-400/40 to-forest-600/40 border-2 border-forest-400/50 flex items-center justify-center"
        >
          <motion.div
            animate={{ scale }}
            transition={{ duration: dur, ease: 'easeInOut' }}
            className="w-28 h-28 rounded-full bg-forest-500/20 flex items-center justify-center"
          >
            <div className="text-center">
              <p className="text-white/90 text-lg font-light">{label}</p>
              <p className="text-white font-serif text-3xl mt-1">{panicCount}</p>
            </div>
          </motion.div>
        </motion.div>
        {/* Glow pulse */}
        <div className="absolute inset-0 rounded-full animate-breathe opacity-30 bg-forest-400/20 blur-xl" />
      </div>

      {/* Crisis helplines */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
        className="w-full max-w-sm space-y-2 mb-8">
        {[
          { flag: '🇮🇳', name: 'iCall India', contact: '9152987821', href: 'tel:9152987821' },
          { flag: '🌍', name: 'International', contact: 'findahelpline.com', href: 'https://findahelpline.com' },
          { flag: '💬', name: 'Crisis Text Line', contact: 'Text HOME to 741741', href: 'sms:741741?body=HOME' },
        ].map(h => (
          <a key={h.name} href={h.href} target={h.href.startsWith('http') ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10 hover:bg-white/20 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-lg">{h.flag}</span>
              <span className="text-white/90 text-sm font-medium">{h.name}</span>
            </div>
            <span className="text-forest-300 text-sm">{h.contact}</span>
          </a>
        ))}
      </motion.div>

      {/* Close button */}
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
        onClick={() => onClose(true)}
        className="bg-forest-600 hover:bg-forest-700 text-white px-8 py-3 rounded-2xl font-medium transition-all active:scale-95">
        I feel a little better
      </motion.button>
      <button onClick={() => onClose(false)}
        className="mt-3 text-white/40 hover:text-white/70 text-xs transition-colors">
        close without sending to Mira
      </button>
    </motion.div>
  );
}

// Typewriter animation component
function TypewriterText({ text, className = '', delay = 0 }: { text: string; className?: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [started, text]);

  return (
    <span className={className}>
      {displayed}
      <span className={`inline-block w-0.5 h-[1em] bg-current ml-0.5 align-middle ${displayed.length < text.length ? 'animate-pulse' : 'opacity-0'}`} />
    </span>
  );
}

const DEFAULT_PROFILE: UserProfile = {
  concerns: [],
  distressedCount: 0,
  messageCount: 0,
  phq9Scores: [],
  moodHistory: [],
  streak: 0,
  journalEntries: [],
};

export default function App() {
  const [view, setView] = useState<AppView>('feed');
  const [session, setSession] = useState<LocalSession | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [authLoading, setAuthLoading] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [showPanic, setShowPanic] = useState(false);
  const [panicPhase, setPanicPhase] = useState<'in' | 'hold' | 'out'>('in');
  const [panicCount, setPanicCount] = useState(4);
  const [isDemo, setIsDemo] = useState(false);
  const [transitionDir, setTransitionDir] = useState(1);
  const [lang, setLangState] = useState<Lang>(getLang);
  const [badgeExtras, setBadgeExtras] = useState<BadgeExtras>(loadBadgeExtras);
  const [unlockedBadges, setUnlockedBadges] = useState<Set<string>>(loadUnlockedBadges);
  const [badgeToast, setBadgeToast] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [streakData, setStreakData] = useState<StreakData>(loadStreakData);
  const [milestoneModal, setMilestoneModal] = useState<MilestoneInfo | null>(null);
  const [streakRisk, setStreakRisk] = useState(false);
  const [showSafetyCheckin, setShowSafetyCheckin] = useState(false);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authError, setAuthError] = useState('');
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [lastCloudSync, setLastCloudSync] = useState<number | null>(() => {
    const s = localStorage.getItem('nm_last_cloud_sync');
    return s ? Number(s) : null;
  });

  // Listen for Google Maps Platform Demo Key Quota Event (Tier 1 & Tier 2)
  useEffect(() => {
    const onQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  // Badge system — check and unlock
  const runBadgeCheck = useCallback((prof: UserProfile, extras: BadgeExtras) => {
    const newlyUnlocked = checkBadges(prof, extras, unlockedBadges);
    if (newlyUnlocked.length > 0) {
      const updated = new Set(unlockedBadges);
      newlyUnlocked.forEach(id => updated.add(id));
      setUnlockedBadges(updated);
      saveUnlockedBadges(updated);
      // Show toast for the first one
      const badge = BADGES.find(b => b.id === newlyUnlocked[0]);
      if (badge) {
        setBadgeToast(`${badge.emoji} ${badge.title}`);
        setTimeout(() => setBadgeToast(null), 3500);
      }
    }
  }, [unlockedBadges]);

  // Track section visits for badges
  useEffect(() => {
    if (!appReady) return;
    const extras = loadBadgeExtras();
    if (!extras.sectionsVisited.includes(view)) {
      extras.sectionsVisited = [...new Set([...extras.sectionsVisited, view])];
      saveBadgeExtras(extras);
      setBadgeExtras(extras);
    }
    // Increment specific counters
    if (view === 'breathing') { extras.breathingSessions = (extras.breathingSessions || 0) + 1; saveBadgeExtras(extras); setBadgeExtras(extras); }
    if (view === 'stories') { extras.sleepStoriesOpened = (extras.sleepStoriesOpened || 0) + 1; saveBadgeExtras(extras); setBadgeExtras(extras); }
    if (view === 'faith') { extras.faithVisits = (extras.faithVisits || 0) + 1; saveBadgeExtras(extras); setBadgeExtras(extras); }
    if (view === 'news') { extras.newsReads = (extras.newsReads || 0) + 1; saveBadgeExtras(extras); setBadgeExtras(extras); }
    // Run badge check
    runBadgeCheck(profile, extras);
  }, [view, appReady]);

  // Check badges when profile changes (mood, messages, journal, streak)
  useEffect(() => {
    if (!appReady) return;
    runBadgeCheck(profile, badgeExtras);
  }, [profile.messageCount, profile.streak, profile.moodHistory.length, profile.journalEntries?.length]);

  // Generate notifications on load and profile changes
  useEffect(() => {
    if (!appReady) return;
    setNotifications(generateNotifications(profile));
    // Safety check-in for sustained low mood
    if (shouldShowSafetyCheckin(profile)) {
      setShowSafetyCheckin(true);
      markSafetyCheckinShown();
    }
    // Generate Weekly Wrapped on Sunday
    if (isWrappedDay() && !loadWeeklyWrapped()) {
      generateWeeklyWrapped(profile).catch(() => {});
    }
  }, [appReady, profile.moodHistory.length, profile.streak, profile.lastActiveDate]);

  const handleDismissNotif = (id: string) => {
    dismissNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Streak system — record activity when profile changes
  useEffect(() => {
    if (!appReady || !session) return;
    // Record activity when user does something meaningful
    if ((profile.messageCount || 0) > 0 || profile.moodHistory.length > 0 || (profile.journalEntries?.length || 0) > 0) {
      const updated = recordActivity(streakData);
      if (updated.currentStreak !== streakData.currentStreak || updated.bestStreak !== streakData.bestStreak) {
        setStreakData(updated);
        saveStreakData(updated);
        // Check milestones
        const milestone = checkMilestone(updated);
        if (milestone) {
          setMilestoneModal(milestone);
          const marked = markMilestoneCelebrated(updated, milestone.days);
          setStreakData(marked);
          saveStreakData(marked);
        }
      }
    }
    // Check risk
    setStreakRisk(isStreakAtRisk(streakData));
  }, [appReady, profile.messageCount, profile.moodHistory.length, profile.journalEntries?.length]);

  const handleUseFreeze = () => {
    const result = useStreakFreeze(streakData);
    if (result) {
      setStreakData(result);
      saveStreakData(result);
    }
  };

  const handleExport = (fn: () => boolean) => {
    const ok = fn();
    setExportStatus(ok ? 'success' : 'error');
    setTimeout(() => {
      setExportStatus('idle');
      setShowExport(false);
    }, ok ? 1200 : 2000);
  };

  const handleNotifAction = (notif: AppNotification) => {
    navigateTo(notif.action.view);
    handleDismissNotif(notif.id);
    setShowNotifs(false);
  };

  const toggleLang = () => {
    const next: Lang = lang === 'en' ? 'hi' : 'en';
    saveLang(next);
    setLangState(next);
  }; // 1=forward, -1=back

  // ─── INIT ───
  useEffect(() => {
    boot();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShowSettings(false); setMobileMenuOpen(false); setShowExport(false); setExportStatus('idle'); setShowNotifs(false); }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // Track firebase readiness in a ref so closures always see latest value
  const firebaseReadyRef = useRef(false);
  
  const boot = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      await handleDemoLogin();
      return;
    }

    const fbConfigured = isFirebaseConfigured();
    if (fbConfigured) {
      const ok = initFirebase();
      firebaseReadyRef.current = ok;
      if (ok) {
        onAuth(async (fbUser) => {
          if (fbUser) {
            const sess = await createGoogleSession(fbUser);
            setFirebaseUser(fbUser);
            await loadSession(sess, fbUser, true);
          } else {
            setFirebaseUser(null);
            const existingLocal = await getActiveSession();
            if (existingLocal && existingLocal.provider === 'local') {
              await loadSession(existingLocal, null, false);
            } else {
              setShowLoginPrompt(true);
              setAppReady(true);
            }
          }
        });
        return;
      }
    }

    const existing = await getActiveSession();
    if (existing) {
      await loadSession(existing, null, false);
    } else {
      setShowLoginPrompt(true);
      setAppReady(true);
    }
  }, []);

  // ─── LOAD SESSION ───
  const loadSession = async (sess: LocalSession, fbUser: any, fbReady: boolean = false) => {
    setSession(sess);
    setShowLoginPrompt(false);

    let loadedProfile = { ...DEFAULT_PROFILE };
    let loadedMessages: ChatMessage[] = [];

    // Try Firebase first, fall back to local
    const useFb = fbReady || firebaseReadyRef.current;
    if (fbUser && useFb) {
      const fbProfile = await fbLoadProfile(fbUser.uid);
      if (fbProfile) loadedProfile = { ...DEFAULT_PROFILE, ...fbProfile };
      loadedMessages = await fbLoadChat(fbUser.uid);
      // Pull cloud sanctuary state (Garden, Future Letters, 7-Day Programs, First Aid, Sound Presets)
      const cloudSanctuary = await pullSanctuaryFromCloud(fbUser.uid);
      if (cloudSanctuary?.updatedAt) {
        setLastCloudSync(cloudSanctuary.updatedAt);
      }
    }

    // Local fallback or supplement
    if (loadedMessages.length === 0) {
      loadedMessages = await loadLocalChatHistory(sess.id);
    }
    if (!loadedProfile.displayName) {
      const localProfile = await loadLocalProfile(sess.id);
      if (localProfile) loadedProfile = { ...DEFAULT_PROFILE, ...loadedProfile, ...localProfile };
    }

    loadedProfile.displayName = loadedProfile.displayName || sess.name || 'Friend';
    loadedProfile.email = sess.email || loadedProfile.email;
    loadedProfile.photoURL = sess.photoURL || loadedProfile.photoURL;

    // Streak calc
    const today = new Date().toISOString().split('T')[0];
    if (loadedProfile.lastActiveDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      loadedProfile.streak = loadedProfile.lastActiveDate === yesterday
        ? (loadedProfile.streak || 0) + 1 : 1;
      loadedProfile.lastActiveDate = today;
    }

    setProfile(loadedProfile);
    setMessages(loadedMessages);

    // Generate greeting if needed
    if (loadedMessages.length === 0) {
      try {
        const greeting = await generateDynamicGreeting(loadedProfile);
        const greetingMsg: ChatMessage = {
          id: `ai_greeting_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          role: 'assistant', content: greeting, timestamp: Date.now(),
        };
        setMessages([greetingMsg]);
        await persistChat(sess, fbUser, [greetingMsg]);
      } catch {
        const fallback: ChatMessage = {
          id: `ai_greeting_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          role: 'assistant',
          content: `hey ${loadedProfile.displayName || 'there'}, i'm mira. what's up?`,
          timestamp: Date.now(),
        };
        setMessages([fallback]);
        await persistChat(sess, fbUser, [fallback]);
      }
    }

    // Persist profile
    await persistProfile(sess, fbUser, loadedProfile);

    getUserLocation().then(loc => setLocation(loc)).catch(() => {});
    setAppReady(true);
  };

  // ─── PERSISTENCE HELPERS (dual: Firebase + local) ───
  const persistChat = async (sess: LocalSession | null, fbUser: any, msgs: ChatMessage[]) => {
    const s = sess || session;
    const fb = fbUser || firebaseUser;
    if (s) await saveLocalChatHistory(s.id, msgs);
    if (fb && firebaseReadyRef.current) await fbSaveChat(fb.uid, msgs);
  };

  const persistProfile = async (sess: LocalSession | null, fbUser: any, prof: Partial<UserProfile>) => {
    const s = sess || session;
    const fb = fbUser || firebaseUser;
    if (s) await saveLocalProfile(s.id, prof);
    if (fb && firebaseReadyRef.current) {
      await fbSaveProfile(fb.uid, prof);
      const ok = await syncLocalSanctuaryToCloud(fb.uid);
      if (ok) setLastCloudSync(Date.now());
    }
  };

  const handleManualCloudSync = async () => {
    if (!firebaseUser || !firebaseReadyRef.current) return;
    setCloudSyncing(true);
    try {
      await fbSaveProfile(firebaseUser.uid, profile);
      await fbSaveChat(firebaseUser.uid, messages);
      const ok = await syncLocalSanctuaryToCloud(firebaseUser.uid);
      if (ok) setLastCloudSync(Date.now());
    } finally {
      setCloudSyncing(false);
    }
  };

  // Wrapper for ChatView to use
  const handleSetMessages = (msgs: ChatMessage[]) => {
    setMessages(msgs);
    persistChat(null, null, msgs);
  };

  const handleSetProfile = (prof: UserProfile) => {
    setProfile(prof);
    persistProfile(null, null, prof);
  };

  // ─── AUTH ACTIONS (Official Firebase Auth) ───
  const handleGoogleLogin = async () => {
    setAuthError('');
    setAuthLoading(true);
    try {
      await signInGoogle();
    } catch (err: any) {
      if (err.message !== 'REDIRECT') {
        setAuthError(err.message || 'Google sign-in could not complete. Please try again.');
      }
    }
    setAuthLoading(false);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const email = authEmail.trim();
    const pass = authPassword;
    if (!email || !pass) {
      setAuthError('Please enter both your email address and password.');
      return;
    }
    setAuthLoading(true);
    try {
      if (authMode === 'signup') {
        await signUpEmail(email, pass);
      } else {
        await signInEmail(email, pass);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please check your credentials.');
    }
    setAuthLoading(false);
  };
  
  const handleDemoLogin = async () => {
    const sess = await createLocalSession('Demo User');
    sess.id = `demo_${Date.now()}`; // Mark as demo so guest login won't reuse it
    localStorage.setItem('neuralminds_active_session', sess.id);
    localStorage.setItem('neuralminds_user_name', 'Demo User');
    setIsDemo(true);

    const now = Date.now();
    const day = 86400000;

    // Pre-fill demo chat messages
    const demoMessages: ChatMessage[] = [
      { id: 'demo_1', role: 'assistant', content: "hey! i'm mira :) what's going on?", timestamp: now - 3600000 * 4 },
      { id: 'demo_2', role: 'user', content: "honestly i'm so stressed about work. my boss keeps piling stuff on me and i feel like i can't say no", timestamp: now - 3600000 * 3.9, emotion: 'anxiety', riskLevel: 'moderate' },
      { id: 'demo_3', role: 'assistant', content: "ugh that's the worst. like where's the line between being a team player and being taken advantage of?? has it always been like this or is it getting worse lately?", timestamp: now - 3600000 * 3.8 },
      { id: 'demo_4', role: 'user', content: "it's been getting worse the last few months. i stayed until 9pm yesterday and nobody even said thanks", timestamp: now - 3600000 * 3.7, emotion: 'sadness' },
      { id: 'demo_5', role: 'assistant', content: "9pm??? okay no. that's not dedication anymore, that's exploitation. and the no-thanks part... honestly that stings more than the hours sometimes. do you actually enjoy the work itself or has that gone too?", timestamp: now - 3600000 * 3.6 },
      { id: 'demo_6', role: 'user', content: "i used to love it but now i just dread mondays. i even had a panic attack on sunday night last week", timestamp: now - 3600000 * 3.5, emotion: 'anxiety', riskLevel: 'moderate' },
      { id: 'demo_7', role: 'assistant', content: "okay a panic attack on sunday night is your body literally screaming that something needs to change. that's not just work stress anymore — that's burnout. have you talked to anyone about this? like a friend or even your doctor?", timestamp: now - 3600000 * 3.4 },
      { id: 'demo_8', role: 'user', content: "no... i keep telling myself it'll get better but it never does. maybe i should start looking for other jobs", timestamp: now - 3600000 * 3.3, emotion: 'hopelessness' },
    ];

    // Pre-fill demo profile
    const demoProfile: UserProfile = {
      ...DEFAULT_PROFILE,
      displayName: 'Demo User',
      messageCount: 8,
      distressedCount: 3,
      streak: 7,
      lastActiveDate: new Date().toISOString().split('T')[0],
      phq9Scores: [8],
      moodHistory: [
        { date: new Date(now - day * 6).toISOString().split('T')[0], mood: 3, emotion: 'neutral' },
        { date: new Date(now - day * 5).toISOString().split('T')[0], mood: 4, emotion: 'calm' },
        { date: new Date(now - day * 4).toISOString().split('T')[0], mood: 2, emotion: 'sadness' },
        { date: new Date(now - day * 3).toISOString().split('T')[0], mood: 5, emotion: 'joy' },
        { date: new Date(now - day * 2).toISOString().split('T')[0], mood: 3, emotion: 'anxiety' },
        { date: new Date(now - day * 1).toISOString().split('T')[0], mood: 4, emotion: 'calm' },
        { date: new Date(now).toISOString().split('T')[0], mood: 4, emotion: 'calm' },
      ],
      journalEntries: [{
        date: new Date(now - day * 2).toISOString().split('T')[0],
        prompt: "What's weighing on your heart right now?",
        content: "work has been really getting to me lately. i feel like i'm drowning in deadlines and nobody notices how hard i'm trying. but today i took a walk during lunch and just... breathed. it helped more than i expected. maybe i need to do that more. i'm exhausted but underneath it all, i think i'm starting to realize i deserve better than this. that feels scary but also kind of hopeful?",
      }],
      concerns: ['work stress', 'burnout', 'anxiety'],
    };

    // Set data directly then load session
    setProfile(demoProfile);
    setMessages(demoMessages);
    await saveLocalChatHistory(sess.id, demoMessages);
    await saveLocalProfile(sess.id, demoProfile);

    setSession(sess);
    setShowLoginPrompt(false);
    setAppReady(true);
    getUserLocation().then(loc => setLocation(loc)).catch(() => {});
  };

  const handleNewChat = async () => {
    const greetingMsg: ChatMessage = {
      id: `ai_new_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role: 'assistant',
      content: `hey ${profile.displayName || 'there'} :) starting fresh. what's on your mind?`,
      timestamp: Date.now(),
    };
    setMessages([greetingMsg]);
    persistChat(null, null, [greetingMsg]);
    setView('chat');
  };

  const handleLogout = async () => {
    if (firebaseUser) await firebaseLogOut();
    clearActiveSession();
    setSession(null);
    setFirebaseUser(null);
    setProfile(DEFAULT_PROFILE);
    setMessages([]);
    setIsDemo(false);
    setAppReady(true);
    setShowLoginPrompt(true);
  };

  // ─── NAV & PILLAR ARCHITECTURE ───
  const VIEW_ORDER: AppView[] = ['feed','chat','dashboard','badges','breathing','grounding','moments','journal','garden','letters','sounds','stories','toolkit','programs','firstaid','faith','coaching','story','relationships','student','family','professionals'];
  
  const navigateTo = (target: AppView) => {
    const from = VIEW_ORDER.indexOf(view);
    const to = VIEW_ORDER.indexOf(target);
    setTransitionDir(to >= from ? 1 : -1);
    setView(target);
  };

  // Check if mood logged today for notification dot
  const today = new Date().toISOString().split('T')[0];
  const moodLoggedToday = profile.moodHistory.some(m => m.date === today);

  // Map sub-views to their parent pillar so sidebar highlights stay cohesive
  const getActivePillar = (currentView: AppView): AppView => {
    if (['dashboard', 'badges', 'story'].includes(currentView)) return 'dashboard';
    if (['breathing', 'grounding', 'moments'].includes(currentView)) return 'breathing';
    if (['journal', 'garden', 'letters'].includes(currentView)) return 'journal';
    if (['sounds', 'stories'].includes(currentView)) return 'sounds';
    if (['toolkit', 'programs', 'firstaid', 'faith', 'coaching', 'relationships', 'student', 'family'].includes(currentView)) return 'toolkit';
    return currentView;
  };

  const activePillar = getActivePillar(view);

  const navSections: { title: string; items: { view: AppView; icon: React.ReactNode; label: string }[] }[] = [
    {
      title: 'Daily Sanctuary',
      items: [
        { view: 'feed', icon: <Sparkles className="w-4 h-4" />, label: t('today', lang) },
        { view: 'chat', icon: <MessageCircle className="w-4 h-4" />, label: t('chat', lang) },
        { view: 'dashboard', icon: <span className="relative"><BarChart3 className="w-4 h-4" />{unlockedBadges.size > 0 && <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-warm-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">{unlockedBadges.size}</span>}</span>, label: 'Your Journey' },
      ],
    },
    {
      title: 'Mind & Somatic',
      items: [
        { view: 'breathing', icon: <Wind className="w-4 h-4" />, label: 'Breathe & Ground' },
        { view: 'journal', icon: <BookOpen className="w-4 h-4" />, label: 'Journal & Garden' },
        { view: 'sounds', icon: <Headphones className="w-4 h-4" />, label: 'Sounds & Sleep' },
      ],
    },
    {
      title: 'Growth & Care',
      items: [
        { view: 'toolkit', icon: <Wrench className="w-4 h-4" />, label: 'Wellness Studio' },
        { view: 'professionals', icon: <MapPin className="w-4 h-4" />, label: 'Care & Helplines' },
      ],
    },
  ];

  const navItems = navSections.flatMap(s => s.items);

  // Contextual sub-navigation tabs for consolidated pillars
  const PILLAR_SUBTABS: Partial<Record<AppView, { view: AppView; label: string; icon: React.ReactNode }[]>> = {
    dashboard: [
      { view: 'dashboard', label: 'Mood & Insights', icon: <BarChart3 className="w-3.5 h-3.5" /> },
      { view: 'badges', label: `Milestones (${unlockedBadges.size})`, icon: <Trophy className="w-3.5 h-3.5" /> },
      { view: 'story', label: 'My Life Story', icon: <BookOpen className="w-3.5 h-3.5" /> },
    ],
    breathing: [
      { view: 'breathing', label: 'Somatic Breathing', icon: <Wind className="w-3.5 h-3.5" /> },
      { view: 'grounding', label: '5-4-3-2-1 Grounding', icon: <Grip className="w-3.5 h-3.5" /> },
      { view: 'moments', label: '60-Second Resets', icon: <Zap className="w-3.5 h-3.5" /> },
    ],
    journal: [
      { view: 'journal', label: 'Guided Journal', icon: <BookOpen className="w-3.5 h-3.5" /> },
      { view: 'garden', label: 'Gratitude Garden', icon: <Flower2 className="w-3.5 h-3.5" /> },
      { view: 'letters', label: 'Future Letters', icon: <Mail className="w-3.5 h-3.5" /> },
    ],
    sounds: [
      { view: 'sounds', label: 'Ambient Sound Mixer', icon: <Headphones className="w-3.5 h-3.5" /> },
      { view: 'stories', label: 'Sleep Stories', icon: <Moon className="w-3.5 h-3.5" /> },
    ],
    toolkit: [
      { view: 'toolkit', label: 'CBT & Reframing', icon: <Wrench className="w-3.5 h-3.5" /> },
      { view: 'programs', label: '7-Day Programs', icon: <Trophy className="w-3.5 h-3.5" /> },
      { view: 'firstaid', label: 'First Aid Kit', icon: <HeartHandshake className="w-3.5 h-3.5" /> },
      { view: 'faith', label: 'Faith & Wisdom', icon: <BookHeart className="w-3.5 h-3.5" /> },
      { view: 'coaching', label: 'Life Coaching', icon: <Compass className="w-3.5 h-3.5" /> },
    ],
  };

  const currentSubtabs = PILLAR_SUBTABS[activePillar];

  const uid = firebaseUser?.uid || session?.id || null;

  // ─── LOGIN SCREEN ───
  if (showLoginPrompt) {
    const TAGLINE = "Your mind. Your rhythm. Your sanctuary.";
    const features = [
      { emoji: '🌿', label: 'Empathetic Companion' },
      { emoji: '🌬️', label: 'Somatic Breathing' },
      { emoji: '📔', label: 'Reflective Journal' },
      { emoji: '🧭', label: 'CBT & 7-Day Paths' },
    ];

    return (
      <div className="min-h-screen bg-warm-50 flex flex-col lg:flex-row">
        {/* Left panel — desktop only */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12"
          style={{ background: 'linear-gradient(135deg, #1b392f 0%, #255644 30%, #204538 60%, #0e201a 100%)', backgroundSize: '400% 400%', animation: 'gradientShift 12s ease infinite' }}>
          <style>{`@keyframes gradientShift { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }`}</style>
          <div className="absolute top-16 left-16 w-44 h-44 rounded-full bg-forest-500/10 animate-float" />
          <div className="absolute bottom-32 right-16 w-64 h-64 organic-blob bg-warm-400/5 animate-breathe" />
          <div className="absolute top-1/2 right-1/3 w-20 h-20 rounded-full bg-forest-400/10 animate-float" style={{ animationDelay: '3s' }} />

          <div className="relative z-10 max-w-md">
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
              <Leaf className="w-14 h-14 text-forest-300 mb-8" />
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="font-serif text-5xl text-white mb-4 leading-tight">
              NeuralMinds
            </motion.h1>
            <TypewriterText text={TAGLINE} className="text-warm-300 text-xl font-light mb-8 block h-8" delay={600} />

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}
              className="flex flex-wrap gap-2 mb-8">
              {features.map(f => (
                <span key={f.label} className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-forest-200 text-xs px-3 py-1.5 rounded-xl border border-white/10">
                  {f.emoji} {f.label}
                </span>
              ))}
            </motion.div>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3 }}
              className="text-forest-300 text-sm leading-relaxed">
              A warm, tactile sanctuary for emotional clarity, somatic regulation, guided journaling, and honest conversation with Mira.
            </motion.p>
          </div>
        </div>

        {/* Right panel / mobile full screen */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 min-h-screen lg:min-h-0">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm w-full">
            {/* Mobile header — logo + tagline + badges */}
            <div className="lg:hidden text-center mb-8">
              <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 12, delay: 0.1 }}
                className="w-16 h-16 bg-gradient-to-br from-forest-500 to-forest-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-forest-500/20">
                <Leaf className="w-8 h-8 text-white" />
              </motion.div>
              <h1 className="font-serif text-2xl text-forest-900 mb-1">NeuralMinds</h1>
              <TypewriterText text={TAGLINE} className="text-sand-500 text-sm block h-5 mb-4" delay={400} />
              <div className="flex flex-wrap justify-center gap-1.5">
                {features.map((f, i) => (
                  <motion.span key={f.label} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2 + i * 0.15 }}
                    className="inline-flex items-center gap-1 bg-forest-50 text-forest-700 text-[11px] px-2.5 py-1 rounded-full border border-forest-100">
                    {f.emoji} {f.label}
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Desktop welcome text */}
            <div className="hidden lg:block">
              <h2 className="font-serif text-3xl text-forest-900 mb-2">{t('welcome', lang)}</h2>
              <p className="text-sand-600 mb-6">{t('loginSubtitle', lang)}</p>
            </div>
            {/* Mobile welcome text */}
            <div className="lg:hidden">
              <h2 className="font-serif text-2xl text-forest-900 mb-1 text-center">{t('welcome', lang)}</h2>
              <p className="text-sand-500 text-sm mb-5 text-center">{t('loginSubtitleMobile', lang)}</p>
            </div>

            <div className="space-y-4">
              {/* Official Google OAuth 2.0 Sign-In */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={authLoading}
                className="w-full bg-white hover:bg-sand-50 border-2 border-forest-200 hover:border-forest-400 text-forest-900 py-3.5 px-4 rounded-2xl font-semibold flex items-center justify-center gap-3 transition-all shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-60"
              >
                {authLoading ? (
                  <div className="w-5 h-5 border-2 border-forest-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                <span>{t('continueGoogle', lang)}</span>
              </button>

              <div className="relative flex items-center">
                <div className="flex-1 border-t border-sand-200" />
                <span className="px-3 text-[11px] font-medium text-sand-400 uppercase tracking-wider">
                  or official email authorization
                </span>
                <div className="flex-1 border-t border-sand-200" />
              </div>

              {/* Official Email & Password Authorization Form */}
              <form onSubmit={handleEmailAuth} className="space-y-2.5">
                <div className="flex bg-sand-100 p-1 rounded-xl text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signin'); setAuthError(''); }}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      authMode === 'signin' ? 'bg-white text-forest-800 shadow-xs' : 'text-sand-600'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); setAuthError(''); }}
                    className={`flex-1 py-1.5 rounded-lg transition-all ${
                      authMode === 'signup' ? 'bg-white text-forest-800 shadow-xs' : 'text-sand-600'
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                {authMode === 'signup' && (
                  <input
                    type="text"
                    value={guestName}
                    onChange={e => setGuestName(e.target.value)}
                    placeholder="Your first name (optional)"
                    className="w-full px-4 py-2.5 bg-white border border-sand-200 rounded-xl text-forest-900 placeholder:text-sand-400 text-sm focus:border-forest-400 outline-none"
                  />
                )}
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full px-4 py-2.5 bg-white border border-sand-200 rounded-xl text-forest-900 placeholder:text-sand-400 text-sm focus:border-forest-400 outline-none"
                />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="Password (min 6 characters)"
                  className="w-full px-4 py-2.5 bg-white border border-sand-200 rounded-xl text-forest-900 placeholder:text-sand-400 text-sm focus:border-forest-400 outline-none"
                />

                {authError && (
                  <div className="p-2.5 rounded-xl bg-clay-50 border border-clay-200 text-xs text-clay-700">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-forest-600 hover:bg-forest-700 text-white py-3 rounded-2xl font-medium transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {authMode === 'signup' ? 'Authorize & Create Sanctuary Account' : 'Authorize & Sign In'}
                </button>
              </form>
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-forest-700 bg-forest-50/80 border border-forest-100 rounded-xl py-2 px-3">
              <span>🔒</span>
              <span>Official Firebase Auth &amp; Cloud Firestore Encrypted Sync</span>
            </div>

            {/* Instant Sanctuary Preview / Offline Local Mode */}
            <div className="mt-4 pt-3 border-t border-sand-100 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full flex items-center justify-center gap-2 border border-dusk-200 hover:border-dusk-300 text-dusk-700 bg-dusk-50/60 hover:bg-dusk-50 py-2.5 rounded-2xl text-xs font-medium transition-all active:scale-[0.98]"
              >
                👀 Explore Interactive Demo Sanctuary →
              </button>
            </div>

            <p className="text-[10px] text-sand-400 text-center mt-3">NeuralMinds Cloud Sanctuary • Google Maps &amp; Firebase Enabled</p>
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── LOADING ───
  if (!appReady) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="w-16 h-16 bg-forest-100 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-breathe">
            <Leaf className="w-8 h-8 text-forest-600" />
          </div>
          <p className="text-sand-500 font-handwritten text-xl">loading your space...</p>
        </motion.div>
      </div>
    );
  }

  // ─── MAIN APP ───
  return (
    <div className="h-screen flex bg-warm-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[248px] bg-white border-r border-sand-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 mb-8 mt-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-9 h-9 bg-forest-100 rounded-xl flex items-center justify-center animate-breathe flex-shrink-0">
              <Leaf className="w-5 h-5 text-forest-600" />
            </div>
            <div className="min-w-0 overflow-hidden">
              <p className="font-serif text-base text-forest-900 leading-tight truncate">NeuralMinds</p>
              <p className="text-[10px] text-sand-400 tracking-wide uppercase truncate">{t('safeSpace', lang)}</p>
            </div>
          </div>
          {/* Language toggle + Notifications */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={toggleLang}
              className="text-[10px] font-bold bg-sand-100 hover:bg-sand-200 px-1.5 py-1 rounded-lg transition-colors flex-shrink-0">
              {lang === 'en' ? 'हिं' : 'EN'}
            </button>
            <div className="relative flex-shrink-0">
              <button onClick={() => setShowNotifs(!showNotifs)}
                className="w-7 h-7 rounded-lg bg-sand-100 hover:bg-sand-200 flex items-center justify-center transition-colors relative">
                <Bell className="w-3.5 h-3.5 text-sand-600" />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-clay-500 rounded-full border border-white" />
                )}
              </button>
              {/* Notification dropdown */}
              <AnimatePresence>
                {showNotifs && (
                  <>
                  {/* Invisible backdrop to close on outside click */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
                  <motion.div initial={{ opacity: 0, y: -5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5, scale: 0.95 }}
                    className="absolute top-9 right-0 w-44 max-w-[180px] bg-white rounded-xl shadow-xl border border-sand-200 z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-sand-100">
                      <p className="text-xs font-medium text-forest-900">Notifications</p>
                    </div>
                    {notifications.length === 0 ? (
                      <div className="px-3 py-6 text-center">
                        <p className="text-xs text-sand-400">all clear! nothing new 🌿</p>
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.map(n => (
                          <div key={n.id} className="px-3 py-2.5 border-b border-sand-50 last:border-0 hover:bg-sand-50/50">
                            <div className="flex items-start gap-2">
                              <span className="text-base mt-0.5">{n.emoji}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-forest-900 leading-relaxed">{n.message}</p>
                                <button onClick={() => handleNotifAction(n)}
                                  className="text-[10px] text-forest-600 font-medium mt-1 hover:underline">
                                  {n.action.label} →
                                </button>
                              </div>
                              <button onClick={() => handleDismissNotif(n.id)}
                                className="text-sand-300 hover:text-sand-500 text-xs mt-0.5">✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
        {isDemo && (
          <div className="mx-2 mb-3 px-2.5 py-1 bg-warm-100 border border-warm-300 rounded-lg text-center">
            <span className="text-[10px] font-bold text-warm-700 uppercase tracking-wider">Demo Mode</span>
          </div>
        )}

        <nav className="flex-1 space-y-5 overflow-y-auto pr-1">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-sand-400 mb-1.5">
                {section.title}
              </p>
              {section.items.map((item) => {
                const isActive = activePillar === item.view;
                return (
                  <button
                    key={item.view}
                    onClick={() => navigateTo(item.view)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                      isActive ? 'bg-forest-50 text-forest-800 shadow-xs border border-forest-100/80' : 'text-sand-600 hover:bg-sand-50 hover:text-forest-800'
                    }`}
                  >
                    <span className={`transition-colors ${isActive ? 'text-forest-600' : 'text-sand-400 group-hover:text-forest-500'}`}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                    {isActive && <motion.div layoutId="activeNav" className="ml-auto w-1.5 h-5 rounded-full bg-gradient-to-b from-forest-400 to-forest-600" />}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-sand-100 pt-3 mt-3 space-y-1.5">
          {session && (
            <div className="flex items-center gap-2.5 px-2 py-1.5">
              {session.photoURL ? (
                <img src={session.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-forest-100 flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-forest-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-forest-900 truncate">{profile.displayName}</p>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-sand-400 truncate">
                    {session.email || (session.provider === 'google' ? 'Google account' : 'Guest')}
                  </p>
                  {streakData.currentStreak > 0 && (
                    <span className={`text-[10px] text-warm-600 font-medium whitespace-nowrap ${streakData.currentStreak >= streakData.bestStreak && streakData.currentStreak > 1 ? 'animate-pulse' : ''}`}>
                      🔥 {streakData.currentStreak}d
                      {streakData.freezesAvailable > 0 && ' 🧊'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          <button onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-forest-600 hover:text-forest-700 hover:bg-forest-50 transition-colors font-medium">
            <PenLine className="w-3.5 h-3.5" /> {t('newChat', lang)}
          </button>
          <button onClick={() => { setExportStatus('idle'); setShowExport(true); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-sand-500 hover:text-forest-600 hover:bg-forest-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> {t('exportChats', lang)}
          </button>
          <button onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-sand-500 hover:text-sand-700 hover:bg-sand-50 transition-colors">
            <Settings className="w-3.5 h-3.5" /> {t('settings', lang)}
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-sand-500 hover:text-clay-600 hover:bg-clay-50 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> {t('signOut', lang)}
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-sand-200">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-forest-600" />
            <span className="font-serif text-forest-900">NeuralMinds</span>
            {isDemo && <span className="text-[9px] font-bold text-warm-600 bg-warm-100 px-1.5 py-0.5 rounded">DEMO</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleLang}
              className="text-[10px] font-bold bg-sand-100 hover:bg-sand-200 px-2 py-1 rounded-lg transition-colors">
              {lang === 'en' ? 'हिं' : 'EN'}
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="w-9 h-9 rounded-xl bg-sand-100 flex items-center justify-center">
              {mobileMenuOpen ? <X className="w-5 h-5 text-sand-600" /> : <Menu className="w-5 h-5 text-sand-600" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 z-30 bg-forest-950/30 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 w-64 bg-white shadow-2xl p-6 pt-20" onClick={e => e.stopPropagation()}>
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <button key={item.view} onClick={() => { navigateTo(item.view); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      view === item.view ? 'bg-forest-50 text-forest-700' : 'text-sand-600 hover:bg-sand-50'
                    }`}>
                    {item.icon} {item.label}
                    {view === item.view && <ChevronRight className="w-4 h-4 ml-auto text-forest-400" />}
                  </button>
                ))}
              </nav>
              <div className="mt-6 space-y-1 border-t border-sand-100 pt-4">
                <button onClick={() => { handleNewChat(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-forest-600 hover:bg-forest-50 font-medium">
                  <PenLine className="w-4 h-4" /> {t('newChat', lang)}
                </button>
                <button onClick={() => { setExportStatus('idle'); setShowExport(true); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-sand-500 hover:bg-forest-50">
                  <Download className="w-4 h-4" /> {t('exportChats', lang)}
                </button>
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-sand-500 hover:text-clay-600 hover:bg-clay-50">
                  <LogOut className="w-4 h-4" /> {t('signOut', lang)}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export modal */}
      <AnimatePresence>
        {showExport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-forest-950/30 backdrop-blur-sm p-4"
            onClick={() => { setExportStatus('idle'); setShowExport(false); }}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-5" onClick={e => e.stopPropagation()}>
              <div>
                <h3 className="font-serif text-xl text-forest-900">Save & Export Chats</h3>
                <p className="text-sm text-sand-500 mt-1">{messages.length} messages</p>
              </div>

              {/* Gmail section */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-forest-800 uppercase tracking-wider">Send to Gmail</p>
                <button onClick={() => {
                  // Action FIRST, close modal AFTER — preserves user gesture for link/popup
                  sendChatToGmail(messages, profile.displayName || 'User', session?.email);
                  setTimeout(() => setShowExport(false), 200);
                }}
                  className="w-full flex items-center gap-3 bg-white border border-sand-200 hover:border-red-200 hover:bg-red-50/50 text-forest-800 py-3 px-4 rounded-xl font-medium transition-all group">
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                  </svg>
                  <div className="text-left">
                    <p className="text-sm font-medium">Send backup to Gmail</p>
                    <p className="text-[11px] text-sand-500">opens Gmail with your chat pre-filled</p>
                  </div>
                </button>
              </div>

              {/* Google Drive section */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-forest-800 uppercase tracking-wider">Save to Drive</p>
                <button onClick={() => {
                  saveToGoogleDrive(messages, profile.displayName || 'User');
                  setTimeout(() => setShowExport(false), 500);
                }}
                  className="w-full flex items-center gap-3 bg-white border border-sand-200 hover:border-blue-200 hover:bg-blue-50/50 text-forest-800 py-3 px-4 rounded-xl font-medium transition-all group">
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-20.4 35.3c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.4 13.4z" fill="#ea4335"/>
                    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                    <path d="m73.4 26.5-10.1-17.5c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 23.8h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                  </svg>
                  <div className="text-left">
                    <p className="text-sm font-medium">Save to Google Drive</p>
                    <p className="text-[11px] text-sand-500">downloads file + opens Drive to upload</p>
                  </div>
                </button>
              </div>

              {/* Download section */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-forest-800 uppercase tracking-wider">Download to Device</p>
                {exportStatus !== 'idle' && (
                  <p className={`text-sm text-center py-1 ${exportStatus === 'success' ? 'text-forest-600' : 'text-clay-600'}`}>
                    {exportStatus === 'success' ? '✓ downloaded!' : messages.length === 0 ? 'no messages to export' : 'download failed — try Gmail instead'}
                  </p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => handleExport(() => exportChatAsJSON(messages, profile.displayName || 'User'))}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-forest-600 hover:bg-forest-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
                    <FileJson className="w-4 h-4" /> JSON
                  </button>
                  <button onClick={() => handleExport(() => exportChatAsTXT(messages, profile.displayName || 'User'))}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-sand-200 hover:bg-sand-50 text-forest-800 py-2.5 rounded-xl text-sm font-medium transition-colors">
                    <FileText className="w-4 h-4" /> TXT
                  </button>
                </div>
              </div>

              <button onClick={() => { setExportStatus('idle'); setShowExport(false); }} className="w-full text-sm text-sand-500 hover:text-sand-700 py-1">Cancel</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-forest-950/30 backdrop-blur-sm p-4"
            onClick={() => setShowSettings(false)}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              
              {/* Header */}
              <div className="sticky top-0 bg-white rounded-t-2xl px-6 pt-5 pb-3 border-b border-sand-100 z-10">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl text-forest-900">Settings</h3>
                  <button onClick={() => setShowSettings(false)} className="w-7 h-7 rounded-full bg-sand-100 hover:bg-sand-200 flex items-center justify-center">
                    <X className="w-4 h-4 text-sand-500" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4 space-y-5">
                {/* ── PROFILE ── */}
                <div>
                  <p className="text-[10px] font-bold text-sand-500 uppercase tracking-wider mb-3">Profile</p>
                  <div className="flex items-center gap-3 mb-3">
                    {session?.photoURL ? (
                      <img src={session.photoURL} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-forest-100 flex items-center justify-center text-forest-700 font-serif text-xl">
                        {(profile.displayName || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        defaultValue={profile.displayName || ''}
                        onBlur={e => {
                          const val = e.target.value.trim();
                          if (val && val !== profile.displayName) {
                            handleSetProfile({ ...profile, displayName: val });
                          }
                        }}
                        className="w-full text-sm font-medium text-forest-900 bg-transparent border-b border-transparent hover:border-sand-300 focus:border-forest-400 outline-none py-0.5 transition-colors"
                      />
                      <span className={`text-[10px] px-1.5 py-0.5 rounded mt-0.5 inline-block ${
                        session?.provider === 'google' ? 'bg-forest-50 text-forest-600' : 'bg-sand-50 text-sand-500'
                      }`}>
                        {session?.provider === 'google' ? '✓ Google' : '○ Guest'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── MIRA PERSONALITY ── */}
                <div>
                  <p className="text-[10px] font-bold text-sand-500 uppercase tracking-wider mb-3">Mira's Personality</p>
                  <div className="flex gap-2">
                    {(['casual', 'supportive'] as const).map(mode => {
                      const current = localStorage.getItem('nm_mira_mode') || 'casual';
                      return (
                        <button key={mode} onClick={() => { localStorage.setItem('nm_mira_mode', mode); setShowSettings(s => !s); setTimeout(() => setShowSettings(true), 50); }}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            current === mode
                              ? 'bg-forest-600 text-white shadow-sm'
                              : 'bg-sand-50 text-sand-600 border border-sand-200 hover:border-forest-200'
                          }`}>
                          {mode === 'casual' ? '😎 Casual friend' : '💚 Supportive'}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-sand-400 mt-1.5">
                    {(localStorage.getItem('nm_mira_mode') || 'casual') === 'casual'
                      ? 'texts like a real friend — casual, lowercase, honest'
                      : 'warmer and gentler — still real, but softer'}
                  </p>
                </div>

                {/* ── APP & CLOUD STORAGE STATUS ── */}
                <div>
                  <p className="text-[10px] font-bold text-sand-500 uppercase tracking-wider mb-3">Cloud Storage &amp; Status</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Mira Intelligence', value: '✓ Gemini + Deep Memory (100 facts)', active: true },
                      { label: 'Cloud Firestore', value: firebaseUser ? '✓ Connected & Syncing' : '✓ Provisioned (Sign in to sync)', active: !!firebaseUser },
                      { label: 'Last Cloud Backup', value: lastCloudSync ? new Date(lastCloudSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Local Sanctuary', active: !!lastCloudSync },
                      { label: 'Location & Maps', value: location ? `✓ ${location.city || 'Detected'}` : '○ Ready in Care & Helplines', active: !!location },
                      { label: 'Messages sent', value: `${profile.messageCount || 0}`, active: true },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-sand-600">{row.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-lg ${row.active ? 'text-forest-600 bg-forest-50' : 'text-sand-500 bg-sand-50'}`}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                  {firebaseUser && (
                    <button
                      type="button"
                      onClick={handleManualCloudSync}
                      disabled={cloudSyncing}
                      className="mt-3 w-full py-2 px-3 rounded-xl bg-forest-600 hover:bg-forest-700 text-white text-xs font-medium transition-all disabled:opacity-60"
                    >
                      {cloudSyncing ? 'Syncing Sanctuary to Cloud Firestore...' : '☁️ Sync All Sanctuary Data to Cloud Now'}
                    </button>
                  )}
                </div>

                {/* ── DANGER ZONE ── */}
                <div>
                  <p className="text-[10px] font-bold text-clay-500 uppercase tracking-wider mb-3">Danger Zone</p>
                  <div className="space-y-2">
                    <button onClick={() => {
                      handleSetMessages([]);
                      setShowSettings(false);
                    }}
                      className="w-full text-left text-sm text-clay-600 hover:text-clay-700 bg-clay-50/50 hover:bg-clay-50 border border-clay-100 px-3 py-2.5 rounded-xl transition-colors">
                      🗑️ Clear chat history
                    </button>
                    <button onClick={() => {
                      clearActiveSession();
                      localStorage.clear();
                      indexedDB.deleteDatabase('neuralminds_db');
                      window.location.reload();
                    }}
                      className="w-full text-left text-sm text-clay-600 hover:text-clay-700 bg-clay-50/50 hover:bg-clay-50 border border-clay-100 px-3 py-2.5 rounded-xl transition-colors">
                      💣 Reset all data
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-sand-100 text-center">
                <p className="text-[10px] text-sand-300">Beta v1.0 — Prototype • Made with 💚</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        {mapsQuotaExceeded && (
          <div
            role="alert"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 9999,
              background: '#fffbeb',
              color: '#78350f',
              borderBottom: '1px solid #f59e0b',
              padding: '10px 16px',
              fontSize: '14px',
              textAlign: 'center',
            }}
          >
            <strong>Google Maps daily limit reached</strong> — Map features are paused until the shared daily quota resets at midnight Pacific Time. To remove this limit, connect your own Google Cloud billing account.
          </div>
        )}
        {currentSubtabs && (
          <div className="bg-white/80 backdrop-blur-md border-b border-sand-200/80 px-4 md:px-8 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
            {currentSubtabs.map(tab => {
              const isTabActive = view === tab.view;
              return (
                <button
                  key={tab.view}
                  onClick={() => navigateTo(tab.view)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    isTabActive
                      ? 'bg-forest-600 text-white shadow-xs'
                      : 'text-sand-600 hover:bg-sand-100 hover:text-forest-800'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={view}
            initial={{ opacity: 0, x: transitionDir * 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: transitionDir * -20 }}
            transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex-1 flex flex-col min-h-0">
            {view === 'feed' && (
              <DailyFeed
                userName={profile.displayName || ''}
                faithPref={localStorage.getItem('nm_faith_religion')}
                profile={profile}
                setProfile={handleSetProfile}
                onNavigate={navigateTo}
              />
            )}
            {view === 'chat' && <ChatView messages={messages} setMessages={handleSetMessages} profile={profile} setProfile={handleSetProfile} location={location} uid={uid} lang={lang} />}
            {view === 'dashboard' && <Dashboard profile={profile} setProfile={handleSetProfile} />}
            {view === 'breathing' && <BreathingExercise />}
            {view === 'grounding' && <GroundingExercise />}
            {view === 'journal' && <Journal profile={profile} setProfile={handleSetProfile} />}
            {view === 'sounds' && <AmbientSounds />}
            {view === 'stories' && <SleepStories />}
            {view === 'toolkit' && <WellnessToolkit />}
            {view === 'faith' && <FaithSection profile={profile} setProfile={handleSetProfile} />}
            {view === 'news' && <NewsSection />}
            {view === 'coaching' && <LifeCoaching profile={profile} />}
            {view === 'programs' && <Programs />}
            {view === 'badges' && <Badges profile={profile} />}
            {view === 'letters' && <FutureLetters />}
            {view === 'firstaid' && <FirstAidKit />}
            {view === 'story' && <LifeStory profile={profile} />}
            {view === 'relationships' && <RelationshipSupport />}
            {view === 'student' && <StudentMode />}
            {view === 'garden' && <GratitudeGarden />}
            {view === 'moments' && <MindfulMoments />}
            {view === 'family' && <FamilyMode />}
            {view === 'professionals' && <ProfessionalsView location={location} setLocation={setLocation} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Streak risk banner */}
      {streakRisk && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="fixed top-16 md:top-3 left-3 right-3 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[55] bg-warm-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-sm max-w-lg md:max-w-xl mx-auto">
          <span className="text-lg flex-shrink-0">🔥</span>
          <span className="flex-1 leading-snug">your streak ends at midnight! 2 mins is all it takes.</span>
          {streakData.freezesAvailable > 0 && (
            <button onClick={handleUseFreeze} className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg text-xs font-medium flex-shrink-0">
              🧊
            </button>
          )}
          <button onClick={() => setStreakRisk(false)} className="text-white/60 hover:text-white flex-shrink-0">✕</button>
        </motion.div>
      )}

      {/* Milestone celebration modal */}
      <AnimatePresence>
        {milestoneModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-forest-950/60 backdrop-blur-md p-6">
            <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 10 }}
              transition={{ type: 'spring', damping: 15 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', damping: 10 }}
                className="text-6xl mb-4">🔥</motion.div>
              <h2 className="font-serif text-2xl text-forest-900 mb-2">{milestoneModal.days}-day streak!</h2>
              <p className="text-forest-800 leading-relaxed mb-6">{milestoneModal.message}</p>
              {streakData.bestStreak === streakData.currentStreak && (
                <p className="text-xs text-warm-600 font-medium mb-4">🏆 new personal best!</p>
              )}
              <button onClick={() => setMilestoneModal(null)}
                className="w-full bg-forest-600 hover:bg-forest-700 text-white py-3 rounded-2xl font-medium transition-colors active:scale-[0.98]">
                keep going 💪
              </button>
              <p className="text-xs text-sand-400 mt-3">best streak: {streakData.bestStreak} days</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Safety check-in for sustained low mood */}
      <AnimatePresence>
        {showSafetyCheckin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-forest-950/60 backdrop-blur-md p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center">
              <div className="w-16 h-16 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <span className="text-2xl">💙</span>
              </div>
              <h3 className="font-serif text-xl text-forest-900 mb-2">
                hey {profile.displayName || 'there'}.
              </h3>
              <p className="text-sand-600 leading-relaxed mb-6">
                you've been having a tough few days. how are you doing right now, honestly?
              </p>
              <div className="space-y-2">
                <button onClick={() => { setShowSafetyCheckin(false); navigateTo('chat'); }}
                  className="w-full bg-forest-50 hover:bg-forest-100 text-forest-700 py-3 rounded-xl text-sm font-medium transition-colors">
                  i'm struggling but okay
                </button>
                <button onClick={() => { setShowSafetyCheckin(false); navigateTo('chat'); }}
                  className="w-full bg-forest-600 hover:bg-forest-700 text-white py-3 rounded-xl text-sm font-medium transition-colors">
                  i need to talk
                </button>
                <button onClick={() => { setShowSafetyCheckin(false); setShowPanic(true); }}
                  className="w-full bg-clay-50 hover:bg-clay-100 text-clay-700 py-3 rounded-xl text-sm font-medium transition-colors border border-clay-200">
                  i need help now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Badge toast notification */}
      <AnimatePresence>
        {badgeToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-36 md:bottom-8 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[60] bg-forest-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 max-w-sm mx-auto"
          >
            <span className="text-xl">🏆</span>
            <div>
              <p className="text-xs text-forest-300 font-medium">Badge Unlocked!</p>
              <p className="text-sm font-semibold">{badgeToast}</p>
            </div>
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
              <div className="absolute top-0 left-1/4 w-1 h-1 bg-warm-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-warm-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
              <div className="absolute top-0 left-3/4 w-1 h-1 bg-forest-300 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
              <div className="absolute top-1 right-1/4 w-1 h-1 bg-warm-200 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
              <div className="absolute top-1 right-1/3 w-1.5 h-1.5 bg-clay-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SOS Panic Button */}
      <button onClick={() => setShowPanic(true)}
        className="fixed bottom-[5.5rem] md:bottom-6 right-4 z-40 w-14 h-14 rounded-full bg-clay-600 hover:bg-clay-700 text-white shadow-lg shadow-clay-600/30 flex flex-col items-center justify-center transition-all active:scale-90 animate-gentlePulse">
        <AlertCircle className="w-6 h-6" />
        <span className="text-[8px] font-bold leading-none mt-0.5">SOS</span>
      </button>

      {/* Panic Modal */}
      <AnimatePresence>
        {showPanic && <PanicOverlay
          panicPhase={panicPhase} setPanicPhase={setPanicPhase}
          panicCount={panicCount} setPanicCount={setPanicCount}
          onClose={(sendToChat) => {
            setShowPanic(false);
            if (sendToChat) {
              // Record panic for post-crisis check-in
              recordPanicUse();
              // Mark panic usage for badge
              const ext = loadBadgeExtras();
              ext.panicUsed = true;
              saveBadgeExtras(ext);
              setBadgeExtras(ext);
              // Switch to chat and inject a message
              setView('chat');
              const panicMsg: ChatMessage = {
                id: `user_panic_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                role: 'user',
                content: 'I just used the panic button. I was feeling overwhelmed.',
                timestamp: Date.now(),
                emotion: 'anxiety',
                riskLevel: 'high',
              };
              handleSetMessages([...messages, panicMsg]);
              // Check badges after
              setTimeout(() => runBadgeCheck(profile, ext), 500);
            }
          }}
        />}
      </AnimatePresence>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-sand-200 z-30 safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {[
            { view: 'feed' as AppView, icon: <Sparkles className="w-5 h-5" />, label: 'Today' },
            { view: 'chat' as AppView, icon: <MessageCircle className="w-5 h-5" />, label: 'Mira' },
            { view: 'breathing' as AppView, icon: <Wind className="w-5 h-5" />, label: 'Breathe' },
            { view: 'journal' as AppView, icon: <BookOpen className="w-5 h-5" />, label: 'Journal' },
            { view: 'dashboard' as AppView, icon: <BarChart3 className="w-5 h-5" />, label: 'Journey' },
          ].map((item) => {
            const isMobileActive = activePillar === item.view;
            return (
              <button key={item.view} onClick={() => navigateTo(item.view)}
                className={`flex flex-col items-center gap-0.5 min-w-[56px] px-2 py-1.5 rounded-xl transition-all duration-200 relative ${
                  isMobileActive ? 'text-forest-600' : 'text-sand-400'
                }`}>
                <span className="relative">
                  {item.icon}
                  {item.view === 'dashboard' && !moodLoggedToday && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-clay-500 rounded-full" />
                  )}
                </span>
                <span className="text-[10px] font-medium">{item.label}</span>
                {isMobileActive && <motion.div layoutId="mobileNav" className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-forest-500" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
