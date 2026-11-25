import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Mic, MicOff, Volume2, VolumeX, Brain, Pin, Trash2, Plus, X, Cloud } from 'lucide-react';
import { ChatMessage, UserProfile, LocationData, MiraFactCategory } from '../utils/types';
import { sanitizeHTML, validateMessage } from '../utils/sanitize';
import { detectEmotion, classifyRisk, getEmotionEmoji, inferAge, inferGender } from '../utils/emotions';
import { detectCrisis, isDistressedEmotion, getCrisisInlineText, shouldShowPostCrisisCheckin, markPostCrisisCheckinSent } from '../utils/crisis';
import { sendToGroq } from '../services/groq';
import {
  extractAndStoreFacts,
  loadMiraMemory,
  saveMiraMemory,
  addManualMiraFact,
  removeMiraFact,
  togglePinMiraFact,
  MiraFact,
} from '../utils/engagement';
import { logCrisisEvent } from '../services/firebase';
import CrisisModal from './CrisisModal';
import PHQ9Modal from './PHQ9Modal';

interface ChatViewProps {
  messages: ChatMessage[];
  setMessages: (msgs: ChatMessage[]) => void;
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  location: LocationData | null;
  uid: string | null;
  lang?: string;
}

export default function ChatView({ messages, setMessages, profile, setProfile, location, uid, lang = 'en' }: ChatViewProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showCrisis, setShowCrisis] = useState(false);
  const [showPHQ9, setShowPHQ9] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [moodLogged, setMoodLogged] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return localStorage.getItem('neuralminds_mood_date') === today;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const sendingRef = useRef(false);
  const mountedRef = useRef(true);
  const autoSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSendRef = useRef<() => void>(() => {});
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [ventMode, setVentMode] = useState(() => localStorage.getItem('nm_vent_mode') === 'true');
  const ventMsgCountRef = useRef(0);
  const [showMemoryVault, setShowMemoryVault] = useState(false);
  const [memoryFacts, setMemoryFacts] = useState<MiraFact[]>(() => {
    const local = loadMiraMemory();
    if (local.length === 0 && Array.isArray(profile.miraMemory) && profile.miraMemory.length > 0) {
      return saveMiraMemory(profile.miraMemory);
    }
    return local;
  });
  const [newFactText, setNewFactText] = useState('');
  const [newFactCategory, setNewFactCategory] = useState<MiraFactCategory>('goal');

  // Sync incoming profile.miraMemory from Cloud Firestore if richer than local
  useEffect(() => {
    if (Array.isArray(profile.miraMemory) && profile.miraMemory.length > memoryFacts.length) {
      const merged = saveMiraMemory([...memoryFacts, ...profile.miraMemory]);
      setMemoryFacts(merged);
    }
  }, [profile.miraMemory]);

  const syncMemoryToProfile = useCallback((facts: MiraFact[]) => {
    setMemoryFacts(facts);
    setProfile({
      ...profileRef.current,
      miraMemory: facts,
    });
  }, [setProfile]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Stop any speech on unmount
      try { window.speechSynthesis.cancel(); } catch {}
    };
  }, []);

  // Chrome keepalive for long TTS
  useEffect(() => {
    if (!speakingMsgId) return;
    const keepAlive = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
    return () => clearInterval(keepAlive);
  }, [speakingMsgId]);

  const stopSpeaking = useCallback(() => {
    try { window.speechSynthesis.cancel(); } catch {}
    setSpeakingMsgId(null);
  }, []);

  const speakMessage = useCallback((msgId: string, text: string) => {
    if (!window.speechSynthesis) return;

    // Stop mic if listening — prevent TTS being picked up by mic
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
      setIsListening(false);
    }

    // If same message clicked, toggle off
    if (speakingMsgId === msgId) {
      stopSpeaking();
      return;
    }

    // Stop any current speech first
    stopSpeaking();

    // Small delay to let cancel() finish
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.volume = 0.9;

      // Find best female voice
      const voices = speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        v.lang.startsWith('en') && (
          v.name.toLowerCase().includes('samantha') ||
          v.name.toLowerCase().includes('karen') ||
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('zira') ||
          v.name.toLowerCase().includes('google us english')
        )
      ) || voices.find(v => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;

      utterance.onend = () => { if (mountedRef.current) setSpeakingMsgId(null); };
      utterance.onerror = () => { if (mountedRef.current) setSpeakingMsgId(null); };

      speechSynthesis.speak(utterance);
      setSpeakingMsgId(msgId);
    }, 50);
  }, [speakingMsgId, stopSpeaking]);

  // Voice recognition setup
  const toggleVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    // Stop TTS if speaking — prevent conflict
    if (speakingMsgId) stopSpeaking();

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    // NOT continuous — each utterance is a single recognition session.
    // User clicks mic, speaks, mic auto-stops when they pause.
    // This avoids the duplicate/accumulation bug entirely.
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      // Build transcript from all results, separating final from interim
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }
      setInput(finalText + interimText);
    };

    recognition.onerror = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      // Auto-send after 1.5s of silence if there's transcribed text
      autoSendTimerRef.current = setTimeout(() => {
        if (inputRef.current && inputRef.current.value.trim() && !sendingRef.current) {
          handleSendRef.current();
        }
      }, 1500);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }, [isListening]);

  const hasSpeechAPI = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // Quick mood logger
  const logQuickMood = (mood: number, _emoji: string) => {
    const today = new Date().toISOString().split('T')[0];
    const emotionMap: Record<number, string> = { 1: 'hopelessness', 2: 'sadness', 3: 'neutral', 4: 'calm', 5: 'joy' };
    const updated: UserProfile = {
      ...profile,
      moodHistory: [...profile.moodHistory, { date: today, mood, emotion: emotionMap[mood] || 'neutral' }],
    };
    setProfile(updated);
    setMoodLogged(true);
    localStorage.setItem('neuralminds_mood_date', today);
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingText]);

  // Post-crisis check-in: after 10 minutes, Mira checks on user
  useEffect(() => {
    const checkPostCrisis = () => {
      if (shouldShowPostCrisisCheckin()) {
        markPostCrisisCheckinSent();
        const checkInMsg: ChatMessage = {
          id: mkId('postcris'),
          role: 'assistant',
          content: "hey checking in — how are you feeling now? you okay?",
          timestamp: Date.now(),
        };
        setMessages([...messagesRef.current, checkInMsg]);
      }
    };
    // Check on mount
    checkPostCrisis();
    // Check on tab focus (user coming back)
    const onFocus = () => checkPostCrisis();
    window.addEventListener('focus', onFocus);
    // Check every 2 minutes while on chat
    const interval = setInterval(checkPostCrisis, 120000);
    return () => { window.removeEventListener('focus', onFocus); clearInterval(interval); };
  }, []);

  // Focus input on mount + cleanup voice on unmount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => {
      clearTimeout(timer);
      // Stop voice recognition on unmount
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  // Reset textarea height
  const resetTextarea = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  }, []);

  const simulateTyping = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!mountedRef.current) { resolve(); return; }
      setIsTyping(true);
      const words = text.split(' ');
      let i = 0;
      
      const typeWord = () => {
        if (!mountedRef.current) { resolve(); return; }
        if (i < words.length) {
          setTypingText(words.slice(0, i + 1).join(' '));
          i++;
          setTimeout(typeWord, 25 + Math.random() * 35);
        } else {
          if (mountedRef.current) {
            setIsTyping(false);
            setTypingText('');
          }
          resolve();
        }
      };
      
      setTimeout(typeWord, 150);
    });
  }, []);

  // Unique ID generator to avoid collisions
  const mkId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const handleSend = async () => {
    // Clear any pending auto-send timer
    if (autoSendTimerRef.current) { clearTimeout(autoSendTimerRef.current); autoSendTimerRef.current = null; }
    // Guard against double-send from rapid key presses
    if (sendingRef.current) return;

    const trimmed = input.trim();
    const validation = validateMessage(trimmed);
    
    if (!validation.valid) {
      if (validation.error) {
        addAssistantMessage(validation.error);
      }
      return;
    }

    const sanitized = sanitizeHTML(trimmed);
    setInput('');
    resetTextarea();

    // Stop voice if active
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      setIsListening(false);
    }

    const emotion = detectEmotion(sanitized);
    const risk = classifyRisk(sanitized, emotion);

    const now = Date.now();
    const userMsg: ChatMessage = {
      id: mkId('user'),
      role: 'user',
      content: sanitized,
      timestamp: now,
      emotion,
      riskLevel: risk,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    // Crisis check AFTER adding user message — show inline resources in chat
    if (detectCrisis(sanitized)) {
      if (uid) logCrisisEvent(uid, sanitized);
      
      const crisisMsg: ChatMessage = {
        id: mkId('crisis'),
        role: 'assistant',
        content: getCrisisInlineText(),
        timestamp: Date.now(),
      };
      setMessages([...newMessages, crisisMsg]);
      setShowCrisis(true); // also show modal for immediate access
      return;
    }

    // Update profile with inferences
    const allUserMessages = newMessages.filter(m => m.role === 'user').map(m => m.content);
    const newAge = inferAge(allUserMessages);
    const newGender = inferGender(allUserMessages);
    const newDistressCount = isDistressedEmotion(emotion) ? profile.distressedCount + 1 : profile.distressedCount;
    const newMsgCount = profile.messageCount + 1;

    const today = new Date().toISOString().split('T')[0];
    const moodValue = emotion === 'joy' ? 5 : emotion === 'calm' || emotion === 'gratitude' ? 4 : emotion === 'neutral' ? 3 : emotion === 'sadness' || emotion === 'loneliness' ? 2 : emotion === 'hopelessness' ? 1 : 3;

    const updatedProfile: UserProfile = {
      ...profile,
      inferredAge: newAge || profile.inferredAge,
      inferredGender: newGender !== 'unknown' ? newGender : profile.inferredGender,
      menstrualAware: newGender === 'female' || profile.menstrualAware,
      distressedCount: newDistressCount,
      messageCount: newMsgCount,
      moodHistory: [...profile.moodHistory, { date: today, mood: moodValue, emotion }],
      lastVisit: Date.now(),
      lastActiveDate: today,
    };

    setProfile(updatedProfile);

    // Trigger PHQ-9 after 5 distressed messages (only once)
    if (newDistressCount >= 5 && profile.phq9Scores.length === 0 && !showPHQ9) {
      setTimeout(() => setShowPHQ9(true), 3000);
    }

    setSending(true);
    sendingRef.current = true;
    
    try {
      // Pass newMessages (includes current user msg) so AI has full context
      // Track vent mode message count
      if (ventMode) ventMsgCountRef.current++;
      
      // After 10 vent messages, Mira offers to switch
      const ventTransition = ventMode && ventMsgCountRef.current === 10;
      
      const response = await sendToGroq(
        newMessages, sanitized, updatedProfile, emotion, lang,
        ventTransition ? false : ventMode // disable vent for the transition question
      );
      await simulateTyping(response);

      // Set sending=false BEFORE adding message to avoid dots flicker
      setSending(false);
      sendingRef.current = false;

      let aiContent = response;
      // After 10 vent messages, append transition question
      if (ventTransition) {
        aiContent += '\n\ndo you want me to just keep listening, or are you ready to think about this together?';
      }

      const aiMsg: ChatMessage = {
        id: mkId('ai'),
        role: 'assistant',
        content: aiContent,
        timestamp: Date.now(),
      };

      const finalMessages = [...newMessages, aiMsg];
      setMessages(finalMessages);

      // Extract facts for Mira's deep memory & sync to Cloud profile
      extractAndStoreFacts(finalMessages)
        .then((updatedFacts) => {
          if (mountedRef.current) {
            setMemoryFacts(updatedFacts);
            setProfile({
              ...updatedProfile,
              miraMemory: updatedFacts,
            });
          }
        })
        .catch(() => {});
    } catch {
      const fallback = "sorry, something glitched on my end. try sending that again?";
      await simulateTyping(fallback);
      
      // Set sending=false BEFORE adding message
      setSending(false);
      sendingRef.current = false;

      const aiMsg: ChatMessage = {
        id: mkId('err'),
        role: 'assistant',
        content: fallback,
        timestamp: Date.now(),
      };
      setMessages([...newMessages, aiMsg]);
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Keep ref in sync for auto-send timer
  handleSendRef.current = handleSend;

  const addAssistantMessage = (content: string) => {
    const msg: ChatMessage = {
      id: mkId('sys'),
      role: 'assistant',
      content,
      timestamp: Date.now(),
    };
    setMessages([...messagesRef.current, msg]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sending && input.trim()) handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    const target = e.target;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      <AnimatePresence>
        {showCrisis && <CrisisModal onClose={() => setShowCrisis(false)} location={location} />}
        {showPHQ9 && (
          <PHQ9Modal
            onClose={() => setShowPHQ9(false)}
            onComplete={(score: number) => {
              // Use ref to get latest profile (avoids stale closure)
              const latest = profileRef.current;
              const updated = { ...latest, phq9Scores: [...(latest.phq9Scores || []), score] };
              setProfile(updated);
              setShowPHQ9(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Speaking header bar */}
      <AnimatePresence>
        {speakingMsgId && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="px-4 md:px-8 py-2 bg-dusk-50 border-b border-dusk-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-0.5 bg-dusk-500 rounded-full animate-bounce" style={{ animationDelay: `${i*120}ms`, animationDuration: '0.6s', height: `${8+(i%3)*4}px` }} />
                ))}
              </div>
              <span className="text-xs text-dusk-600 font-medium">Mira is speaking...</span>
            </div>
            <button onClick={stopSpeaking} className="text-xs text-dusk-500 hover:text-dusk-700 font-medium transition-colors">
              Stop
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top toolbar: Vent Mode toggle + Mira's Deep Memory Vault button */}
      <div className={`px-4 md:px-8 pt-2.5 pb-1.5 flex items-center justify-between gap-2 border-b ${ventMode ? 'bg-dusk-50 border-dusk-200' : 'bg-white/60 border-sand-100'}`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !ventMode;
              setVentMode(next);
              localStorage.setItem('nm_vent_mode', String(next));
              if (next) ventMsgCountRef.current = 0;
            }}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
              ventMode
                ? 'bg-dusk-600 text-white shadow-md shadow-dusk-600/30'
                : 'bg-sand-100 text-sand-600 hover:bg-sand-200'
            }`}
          >
            💭 Vent Mode
          </button>

          <button
            type="button"
            onClick={() => setShowMemoryVault(true)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-forest-50 text-forest-700 hover:bg-forest-100 border border-forest-200/80 transition-all"
            title="Inspect or edit everything Mira remembers about you"
          >
            <Brain className="w-3.5 h-3.5 text-forest-600" />
            <span>Memory Vault ({memoryFacts.length}/100)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {ventMode ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-dusk-500 italic">
              mira is just listening — no advice 🤫
            </motion.p>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-sand-400">
              <Cloud className="w-3 h-3 text-forest-500" />
              {uid ? 'Cloud Memory Active' : 'Deep Memory Active'}
            </span>
          )}
        </div>
      </div>

      {/* Mira's Deep Memory Vault Drawer */}
      <AnimatePresence>
        {showMemoryVault && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-forest-950/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowMemoryVault(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl border border-sand-200 max-w-lg w-full max-h-[82vh] flex flex-col overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-sand-100 flex items-center justify-between bg-gradient-to-r from-forest-50/70 to-warm-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-forest-600 text-white flex items-center justify-center shadow-sm">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-forest-900 leading-tight">Mira&apos;s Deep Memory Vault</h3>
                    <p className="text-xs text-sand-500">
                      {memoryFacts.length}/100 long-term personal facts • Synced with Cloud Storage
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMemoryVault(false)}
                  className="w-8 h-8 rounded-full bg-white hover:bg-sand-100 flex items-center justify-center border border-sand-200"
                >
                  <X className="w-4 h-4 text-sand-600" />
                </button>
              </div>

              {/* Add new personal fact */}
              <div className="p-4 border-b border-sand-100 bg-sand-50/50 space-y-2.5">
                <p className="text-xs font-medium text-forest-800">
                  Teach Mira something important about your life, goals, people, or triggers:
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={newFactCategory}
                    onChange={e => setNewFactCategory(e.target.value as MiraFactCategory)}
                    className="px-3 py-2 rounded-xl border border-sand-200 bg-white text-xs text-forest-800 font-medium"
                  >
                    <option value="goal">🎯 Goal</option>
                    <option value="problem">🌧️ Stressor / Problem</option>
                    <option value="person">👥 Important Person</option>
                    <option value="trigger">⚡ Trigger</option>
                    <option value="win">🏆 Recent Win</option>
                    <option value="event">📅 Upcoming Event</option>
                    <option value="preference">🌿 Preference / Identity</option>
                  </select>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={newFactText}
                      onChange={e => setNewFactText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newFactText.trim()) {
                          const updated = addManualMiraFact(newFactCategory, newFactText, true);
                          syncMemoryToProfile(updated);
                          setNewFactText('');
                        }
                      }}
                      placeholder="e.g., Preparing for software engineering interviews in May"
                      className="flex-1 px-3 py-2 rounded-xl border border-sand-200 bg-white text-xs text-forest-900 placeholder:text-sand-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newFactText.trim()) return;
                        const updated = addManualMiraFact(newFactCategory, newFactText, true);
                        syncMemoryToProfile(updated);
                        setNewFactText('');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-forest-600 hover:bg-forest-700 text-white text-xs font-medium flex items-center gap-1 flex-shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Save
                    </button>
                  </div>
                </div>
              </div>

              {/* Memory list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {memoryFacts.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <Brain className="w-8 h-8 text-sand-300 mx-auto mb-2" />
                    <p className="text-sm text-forest-800 font-medium">Your Memory Vault is ready</p>
                    <p className="text-xs text-sand-500 mt-1 max-w-xs mx-auto">
                      As you chat with Mira, she automatically remembers key details about your goals, stressors, people, and wins — or you can pin facts above.
                    </p>
                  </div>
                ) : (
                  memoryFacts.map((fact, idx) => {
                    const key = fact.id || `${fact.text}_${idx}`;
                    const badgeLabels: Record<string, string> = {
                      problem: '🌧️ Stressor',
                      person: '👥 Person',
                      goal: '🎯 Goal',
                      event: '📅 Event',
                      mood: '💭 Mood',
                      trigger: '⚡ Trigger',
                      win: '🏆 Win',
                      preference: '🌿 Preference',
                      detail: '📌 Note',
                    };
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                          fact.pinned
                            ? 'bg-forest-50/70 border-forest-200'
                            : 'bg-white border-sand-200 hover:border-sand-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md bg-sand-100 text-forest-800">
                              {badgeLabels[fact.type] || '📌 Fact'}
                            </span>
                            <span className="text-[10px] text-sand-400">{fact.date}</span>
                            {fact.pinned && (
                              <span className="text-[10px] text-forest-600 font-medium">★ Pinned</span>
                            )}
                          </div>
                          <p className="text-xs text-forest-900 font-medium break-words">{fact.text}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = togglePinMiraFact(fact.id || fact.text);
                              syncMemoryToProfile(updated);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              fact.pinned ? 'text-forest-600 bg-forest-100' : 'text-sand-400 hover:bg-sand-100'
                            }`}
                            title={fact.pinned ? 'Unpin memory' : 'Pin memory'}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = removeMiraFact(fact.id || fact.text);
                              syncMemoryToProfile(updated);
                            }}
                            className="p-1.5 rounded-lg text-sand-400 hover:text-clay-600 hover:bg-clay-50 transition-colors"
                            title="Remove memory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="px-5 py-3 border-t border-sand-100 bg-sand-50/70 flex items-center justify-between text-[11px] text-sand-500">
                <span>Mira uses these facts to personalize every conversation</span>
                {memoryFacts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      saveMiraMemory([]);
                      syncMemoryToProfile([]);
                    }}
                    className="text-clay-600 hover:underline font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily mood check-in — only show after user has sent at least one message */}
      {!moodLogged && messages.some(m => m.role === 'user') && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 md:px-8 pt-3 pb-1"
        >
          <div className="max-w-md mx-auto bg-gradient-to-r from-warm-50 to-forest-50 rounded-xl border border-sand-200 px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-forest-800">how are you today?</p>
            <div className="flex gap-1">
              {[
                { mood: 1, emoji: '😢' },
                { mood: 2, emoji: '😔' },
                { mood: 3, emoji: '😐' },
                { mood: 4, emoji: '🙂' },
                { mood: 5, emoji: '😊' },
              ].map(m => (
                <button
                  key={m.mood}
                  onClick={() => logQuickMood(m.mood, m.emoji)}
                  className="w-9 h-9 rounded-lg hover:bg-white/70 flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95"
                >
                  {m.emoji}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-1">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 bg-forest-100 rounded-2xl flex items-center justify-center mx-auto animate-breathe">
                <span className="text-2xl">🍃</span>
              </div>
              <p className="text-sand-500 font-handwritten text-xl">
                Take a breath. This is your space.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-4`}
          >
            <div className={`max-w-[85%] md:max-w-[70%] ${msg.role === 'user' ? '' : 'flex gap-3'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-forest-100 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-sm">🌿</span>
                </div>
              )}
              <div>
                <div className={`px-4 py-3 ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
                  <p className={`text-[15px] leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'text-white' : 'text-forest-900'}`}>
                    {msg.content}
                  </p>
                </div>
                <div className={`flex items-center gap-2 mt-1 px-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-[11px] text-sand-400">{formatTime(msg.timestamp)}</span>
                  {msg.emotion && msg.emotion !== 'neutral' && msg.role === 'user' && (
                    <span className="text-[11px] text-sand-400 flex items-center gap-1">
                      {getEmotionEmoji(msg.emotion)} {msg.emotion}
                    </span>
                  )}
                  {msg.role === 'assistant' && typeof window !== 'undefined' && window.speechSynthesis && (
                    <button
                      onClick={() => speakMessage(msg.id, msg.content)}
                      className="text-sand-300 hover:text-forest-500 transition-colors ml-1"
                      title={speakingMsgId === msg.id ? 'Stop speaking' : 'Read aloud'}
                    >
                      {speakingMsgId === msg.id ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Typing indicator */}
        {(isTyping || sending) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start mb-4"
          >
            <div className="flex gap-3 max-w-[85%] md:max-w-[70%]">
              <div className="w-8 h-8 rounded-full bg-forest-100 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-sm">🌿</span>
              </div>
              <div className="chat-bubble-ai px-4 py-3">
                {typingText ? (
                  <p className="text-[15px] leading-relaxed text-forest-900 whitespace-pre-wrap">
                    {typingText}<span className="animate-pulse ml-0.5">|</span>
                  </p>
                ) : (
                  <div className="flex items-center gap-1.5 py-1">
                    <div className="w-2 h-2 bg-forest-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-forest-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-forest-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-sand-200 bg-white/90 backdrop-blur-xl px-4 md:px-8 py-4 pb-20 md:pb-4">
        <div className="max-w-3xl mx-auto">
          {/* Quick Conversation Starters when starting a chat */}
          {messages.length <= 2 && !sending && (
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                "I've been feeling overwhelmed with work lately",
                "Explain the neuroscience of how 4-7-8 breathing calms the amygdala",
                "What do you remember about me in my Memory Vault?",
                "Help me reframe an anxious thought or plan a focused study block",
              ].map((promptText) => (
                <button
                  key={promptText}
                  type="button"
                  onClick={() => setInput(promptText)}
                  className="text-xs bg-sand-50 hover:bg-forest-50 text-forest-800 border border-sand-200 hover:border-forest-300 px-3 py-1.5 rounded-xl transition-all"
                >
                  {promptText}
                </button>
              ))}
            </div>
          )}

          {/* Listening indicator */}
          <AnimatePresence>
            {isListening && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                className="flex items-center gap-2 mb-2 ml-1">
                <span className="w-2 h-2 bg-clay-500 rounded-full animate-pulse" />
                <span className="text-xs text-clay-600 font-medium">🎤 Listening...</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Share what's on your mind..."
                rows={1}
                maxLength={2000}
                disabled={sending}
                className="w-full px-4 py-3 bg-white border border-sand-200 rounded-2xl text-forest-900 placeholder:text-sand-400 resize-none transition-all duration-200 text-[15px] leading-relaxed focus:border-forest-400 focus:shadow-[0_0_0_3px_rgba(93,163,132,0.1)] disabled:opacity-60"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
              {input.length > 1800 && (
                <span className="absolute bottom-2 right-3 text-[10px] text-clay-500">
                  {2000 - input.length}
                </span>
              )}
            </div>
            {/* Mic button */}
            {hasSpeechAPI && (
              <button
                onClick={toggleVoice}
                disabled={sending}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                  isListening
                    ? 'bg-clay-500 text-white shadow-lg shadow-clay-500/30 animate-pulse'
                    : 'bg-sand-100 text-sand-500 hover:bg-sand-200 hover:text-forest-600'
                }`}
                title={isListening ? 'Stop listening' : 'Voice input'}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            )}
            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                input.trim() && !sending
                  ? 'bg-forest-600 hover:bg-forest-700 text-white shadow-lg shadow-forest-600/20 hover:shadow-xl active:scale-95'
                  : 'bg-sand-100 text-sand-400 cursor-not-allowed'
              }`}
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-sand-400 mt-2 text-center">
            Mira listens without judgment. For emergencies, tap Help for crisis resources.
          </p>
        </div>
      </div>
    </div>
  );
}
