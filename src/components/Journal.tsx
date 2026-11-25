import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Sparkles, Save, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { UserProfile } from '../utils/types';

import { GROQ_API_KEY } from '../utils/constants';
import { getCuratedJournalReflection } from '../utils/miraEngine';
const API_KEY = GROQ_API_KEY;

interface JournalProps {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
}

// Extra data stored per entry (indexed by date+prompt hash)
interface EntryExtra {
  miraResponse: string;
  moodTag?: number; // 1-5
}

function getExtras(): Record<string, EntryExtra> {
  try { const r = localStorage.getItem('nm_journal_extras'); return r ? JSON.parse(r) : {}; } catch { return {}; }
}
function saveExtras(extras: Record<string, EntryExtra>) {
  localStorage.setItem('nm_journal_extras', JSON.stringify(extras));
}
function entryKey(date: string, prompt: string): string {
  return `${date}_${prompt.slice(0, 20).replace(/\s/g, '_')}`;
}

async function callAI(prompt: string): Promise<string> {
  if (!API_KEY) return '';
  const models = ['qwen/qwen3.8-27b', 'allam-2-7b', 'openai/gpt-oss-20b'];
  for (const model of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.85, max_tokens: 300 }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text.replace(/^["']|["']$/g, '').trim();
      }
    } catch { /* next */ }
  }
  return '';
}

const DEFAULT_PROMPTS = [
  "What has been quietly taking up the most room in your mind today?",
  "What is one boundary or permission you need to give yourself this week?",
  "Describe a small moment recently where you felt even a little bit at peace.",
];

const MOOD_TAGS = [
  { value: 1, emoji: '😢', label: 'Heavy' },
  { value: 2, emoji: '😔', label: 'Low' },
  { value: 3, emoji: '😌', label: 'Calm' },
  { value: 4, emoji: '🙂', label: 'Better' },
  { value: 5, emoji: '✨', label: 'Lighter' },
];

const moodDotColor = (v: number) => {
  if (v <= 1) return 'bg-clay-500';
  if (v <= 2) return 'bg-clay-300';
  if (v <= 3) return 'bg-warm-400';
  if (v <= 4) return 'bg-forest-300';
  return 'bg-forest-500';
};

export default function Journal({ profile, setProfile }: JournalProps) {
  const [journalTab, setJournalTab] = useState<'write' | 'unsent'>('write');

  if (journalTab === 'unsent') {
    return <UnsentLetters onBack={() => setJournalTab('write')} />;
  }

  return <JournalMain profile={profile} setProfile={setProfile} onSwitchToUnsent={() => setJournalTab('unsent')} />;
}

function JournalMain({ profile, setProfile, onSwitchToUnsent }: JournalProps & { onSwitchToUnsent: () => void }) {
  const [prompts, setPrompts] = useState<string[]>(DEFAULT_PROMPTS);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [entry, setEntry] = useState('');
  const [saved, setSaved] = useState(false);
  const [viewingPast, setViewingPast] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [miraResponse, setMiraResponse] = useState('');
  const [miraLoading, setMiraLoading] = useState(false);
  const [showMoodTag, setShowMoodTag] = useState(false);
  const [extras, setExtras] = useState<Record<string, EntryExtra>>(getExtras);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Generate daily prompts
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const cached = localStorage.getItem(`nm_journal_prompts_${today}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPrompts(parsed);
          return;
        }
      } catch {}
    }

    if (!API_KEY) {
      localStorage.setItem(`nm_journal_prompts_${today}`, JSON.stringify(DEFAULT_PROMPTS));
      return;
    }

    const dayName = new Date().toLocaleDateString('en', { weekday: 'long' });
    const fullDate = new Date().toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' });

    setPromptsLoading(true);
    (async () => {
      const result = await callAI(
        `Give 3 different journal prompts for today (${fullDate}, ${dayName}). Make them varied: one about today's emotions, one about relationships, one about goals or future. Each prompt should be one sentence. Number them 1, 2, 3. No explanations. No preamble.`
      );
      if (mountedRef.current) {
        if (result) {
          const lines = result.split('\n').map(l => l.replace(/^\d+[\.\)]\s*/, '').trim()).filter(l => l.length > 10);
          const final = lines.slice(0, 3);
          if (final.length > 0) {
            setPrompts(final);
            localStorage.setItem(`nm_journal_prompts_${today}`, JSON.stringify(final));
          }
        }
        setPromptsLoading(false);
      }
    })();
  }, []);

  // Journal streak
  const journalStreak = useMemo(() => {
    const entries = profile.journalEntries || [];
    if (entries.length === 0) return 0;
    let streak = 0;
    const now = Date.now();
    for (let i = 0; i < 60; i++) {
      const date = new Date(now - i * 86400000).toISOString().split('T')[0];
      if (entries.some(e => e.date === date)) { streak++; } else if (i > 0) break;
    }
    return streak;
  }, [profile.journalEntries]);

  const selectPrompt = (p: string) => {
    setSelectedPrompt(p);
    setEntry('');
    setSaved(false);
    setMiraResponse('');
    setShowMoodTag(false);
    setViewingPast(false);
  };

  const saveEntry = async () => {
    if (!entry.trim()) return;
    const today = new Date().toISOString().split('T')[0];
    const prompt = selectedPrompt || 'Free write';
    const newEntry = { date: today, content: entry.trim(), prompt };
    const updated = { ...profile, journalEntries: [...(profile.journalEntries || []), newEntry] };
    setProfile(updated);
    setSaved(true);

    // Get Mira's response
    setMiraLoading(true);
    const aiResp = await callAI(
      `You are Mira, the user's close friend. They just wrote this journal entry:\n\n"${entry.trim()}"\n\nWrite a genuine, thoughtful response as if you just read their diary and they asked what you think. Be real. Notice specific things they said. Ask one question that makes them think deeper. Do not be generic. Do not use therapy language like "valid" or "I hear you". Lowercase. 3-4 sentences max.`
    );
    const response = aiResp || getCuratedJournalReflection(entry.trim());
    if (mountedRef.current) {
      setMiraResponse(response);
      setMiraLoading(false);
      setShowMoodTag(true);

      // Save Mira's response
      const key = entryKey(today, prompt);
      const updatedExtras = { ...extras, [key]: { miraResponse: response, moodTag: undefined } };
      setExtras(updatedExtras);
      saveExtras(updatedExtras);
    }
  };

  const saveMoodTag = (mood: number) => {
    const today = new Date().toISOString().split('T')[0];
    const key = entryKey(today, selectedPrompt || 'Free write');
    const updatedExtras = { ...extras, [key]: { ...extras[key], moodTag: mood } };
    setExtras(updatedExtras);
    saveExtras(updatedExtras);
    setShowMoodTag(false);
  };

  const pastEntries = [...(profile.journalEntries || [])].reverse();

  // New entry view
  if (!viewingPast && !selectedPrompt) {
    return (
      <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-2xl mx-auto h-full overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-3xl text-forest-900 mb-1">Journal</h2>
              <div className="flex items-center gap-3">
                <p className="text-sand-500">a quiet corner for your thoughts</p>
                {journalStreak > 0 && (
                  <span className="text-xs text-warm-600 font-medium bg-warm-50 px-2 py-0.5 rounded-full">📓 {journalStreak}d streak</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={onSwitchToUnsent}
                className="text-sm text-dusk-600 hover:text-dusk-700 font-medium bg-dusk-50 hover:bg-dusk-100 px-3 py-2 rounded-xl transition-colors">
                ✉️ Unsent
              </button>
              {(profile.journalEntries?.length || 0) > 0 && (
                <button onClick={() => setViewingPast(true)}
                  className="flex items-center gap-2 text-sm text-forest-600 hover:text-forest-700 font-medium bg-forest-50 hover:bg-forest-100 px-3 py-2 rounded-xl transition-colors">
                  <BookOpen className="w-4 h-4" />
                  Past
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Prompt picker */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-warm-500" />
            <span className="text-xs font-medium text-warm-600 uppercase tracking-wider">Pick a prompt</span>
          </div>
          {promptsLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 className="w-4 h-4 text-sand-400 animate-spin" />
              <span className="text-sm text-sand-400">generating today's prompts...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {prompts.map((p, i) => (
                <motion.button key={i}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => selectPrompt(p)}
                  className="w-full text-left bg-gradient-to-r from-warm-50 to-forest-50 rounded-xl border border-sand-200 p-4 hover:shadow-sm hover:border-forest-200 transition-all active:scale-[0.98]">
                  <p className="text-sm text-forest-900 leading-relaxed">{p}</p>
                </motion.button>
              ))}
              <button onClick={() => selectPrompt('Free write')}
                className="w-full text-left text-sm text-sand-500 hover:text-forest-600 py-2 transition-colors">
                or just free write →
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Writing view
  if (!viewingPast && selectedPrompt) {
    return (
      <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-2xl mx-auto h-full overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <button onClick={() => { setSelectedPrompt(''); setSaved(false); setMiraResponse(''); setShowMoodTag(false); }}
            className="text-sm text-sand-500 hover:text-forest-600 mb-2 flex items-center gap-1 transition-colors">
            <ChevronLeft className="w-4 h-4" /> back to prompts
          </button>
          {selectedPrompt !== 'Free write' && (
            <div className="bg-gradient-to-r from-warm-50 to-forest-50 rounded-xl border border-sand-200 p-4 mb-4">
              <p className="font-serif text-lg text-forest-900 leading-relaxed">{selectedPrompt}</p>
            </div>
          )}
        </motion.div>

        {/* Writing area */}
        <div className="bg-white rounded-3xl border border-sand-200 overflow-hidden mb-4">
          <textarea
            value={entry}
            onChange={(e) => { setEntry(e.target.value); setSaved(false); }}
            placeholder="start writing... there's no wrong way to do this."
            rows={10}
            disabled={saved}
            className="w-full px-6 py-5 text-forest-900 placeholder:text-sand-400 resize-none border-none bg-transparent text-[15px] leading-relaxed note-texture focus:outline-none focus:ring-0 disabled:opacity-70"
          />
          <div className="border-t border-sand-100 px-6 py-3 flex items-center justify-between">
            <span className="text-xs text-sand-400">
              {entry.length > 0 ? `${entry.split(/\s+/).filter(Boolean).length} words` : 'blank page, full potential'}
            </span>
            {!saved ? (
              <button onClick={saveEntry} disabled={!entry.trim()}
                className="flex items-center gap-1.5 text-sm font-medium text-forest-600 hover:text-forest-700 disabled:text-sand-400 disabled:cursor-not-allowed transition-colors">
                <Save className="w-3.5 h-3.5" /> save entry
              </button>
            ) : (
              <span className="text-sm text-forest-600 font-medium">✓ saved</span>
            )}
          </div>
        </div>

        {/* Mira's response */}
        {(miraLoading || miraResponse) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-forest-50 rounded-2xl border border-forest-200 p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-forest-100 flex items-center justify-center">
                <span className="text-xs">🌿</span>
              </div>
              <span className="text-xs font-medium text-forest-700">Mira's thoughts</span>
            </div>
            {miraLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-forest-400 animate-spin" />
                <span className="text-sm text-forest-600">reading your entry...</span>
              </div>
            ) : (
              <p className="text-forest-800 text-sm leading-relaxed">{miraResponse}</p>
            )}
          </motion.div>
        )}

        {/* Mood tag after saving */}
        {showMoodTag && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            className="bg-warm-50 rounded-xl border border-warm-200 p-4 mb-4">
            <p className="text-sm text-forest-800 mb-3">how do you feel after writing?</p>
            <div className="flex justify-between">
              {MOOD_TAGS.map(m => (
                <button key={m.value} onClick={() => saveMoodTag(m.value)}
                  className="flex flex-col items-center gap-1 py-1 px-2 rounded-lg hover:bg-white/60 transition-all active:scale-95">
                  <span className="text-xl">{m.emoji}</span>
                  <span className="text-[10px] text-sand-600">{m.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  // Past entries timeline view
  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-2xl mx-auto h-full overflow-y-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl text-forest-900 mb-1">Journal Timeline</h2>
            <p className="text-sand-500 text-sm">{pastEntries.length} entries</p>
          </div>
          <button onClick={() => { setViewingPast(false); setSelectedPrompt(''); }}
            className="flex items-center gap-2 text-sm text-forest-600 hover:text-forest-700 font-medium bg-forest-50 hover:bg-forest-100 px-4 py-2 rounded-xl transition-colors">
            <Sparkles className="w-4 h-4" /> New entry
          </button>
        </div>
      </motion.div>

      {pastEntries.length === 0 ? (
        <p className="text-center text-sand-500 py-12">no entries yet. start writing today!</p>
      ) : (
        <div className="space-y-3">
          {pastEntries.map((e, i) => {
            const key = entryKey(e.date, e.prompt);
            const extra = extras[key];
            const isExpanded = expandedIdx === i;

            return (
              <motion.div key={`${e.date}_${i}`}
                initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white rounded-xl border border-sand-200 overflow-hidden">
                <button onClick={() => setExpandedIdx(isExpanded ? null : i)}
                  className="w-full text-left p-4 flex items-start gap-3 hover:bg-sand-50/50 transition-colors">
                  {/* Mood dot */}
                  <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${extra?.moodTag ? moodDotColor(extra.moodTag) : 'bg-sand-200'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs text-sand-500">
                        {new Date(e.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                      <ChevronRight className={`w-4 h-4 text-sand-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                    <p className="text-sm text-forest-900 truncate">{e.content.slice(0, 60)}{e.content.length > 60 ? '...' : ''}</p>
                    {extra?.miraResponse && !isExpanded && (
                      <p className="text-xs text-forest-600 mt-1 truncate">🌿 {extra.miraResponse.slice(0, 40)}...</p>
                    )}
                  </div>
                </button>

                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden">
                      <div className="px-4 pb-4 border-t border-sand-100 pt-3">
                        <div className="bg-sand-50 rounded-xl p-3 mb-3">
                          <p className="text-xs text-sand-500 italic mb-1">prompt: {e.prompt}</p>
                          <p className="text-sm text-forest-900 leading-relaxed whitespace-pre-wrap">{e.content}</p>
                        </div>
                        {extra?.miraResponse && (
                          <div className="bg-forest-50 rounded-xl p-3 mb-2">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="text-xs">🌿</span>
                              <span className="text-xs font-medium text-forest-700">Mira</span>
                            </div>
                            <p className="text-sm text-forest-800 leading-relaxed">{extra.miraResponse}</p>
                          </div>
                        )}
                        {extra?.moodTag && (
                          <p className="text-xs text-sand-500">after writing: {MOOD_TAGS.find(m => m.value === extra.moodTag)?.emoji} {MOOD_TAGS.find(m => m.value === extra.moodTag)?.label}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── UNSENT LETTERS ───
interface UnsentLetter {
  id: string;
  to: string; // relationship label
  content: string;
  date: string;
  miraResponse?: string;
  released?: boolean;
}

const LETTER_RECIPIENTS = [
  { id: 'hurt', emoji: '💔', label: 'Someone who hurt me' },
  { id: 'miss', emoji: '💭', label: 'Someone I miss' },
  { id: 'lost', emoji: '🕊️', label: 'Someone I\'ve lost' },
  { id: 'past', emoji: '👤', label: 'My past self' },
  { id: 'future', emoji: '✨', label: 'My future self' },
  { id: 'forgive', emoji: '🤝', label: 'Someone I need to forgive' },
  { id: 'forgiven', emoji: '🙏', label: 'Someone I need forgiveness from' },
];

function loadUnsent(): UnsentLetter[] {
  try { const r = localStorage.getItem('nm_unsent_letters'); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveUnsent(letters: UnsentLetter[]) { localStorage.setItem('nm_unsent_letters', JSON.stringify(letters)); }

function UnsentLetters({ onBack }: { onBack: () => void }) {
  const [letters, setLetters] = useState<UnsentLetter[]>(loadUnsent);
  const [phase, setPhase] = useState<'list' | 'pick' | 'write' | 'options' | 'response' | 'released'>('list');
  const [selectedTo, setSelectedTo] = useState('');
  const [content, setContent] = useState('');
  const [currentLetter, setCurrentLetter] = useState<UnsentLetter | null>(null);
  const [miraResponse, setMiraResponse] = useState('');
  const [miraLoading, setMiraLoading] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [readingLetter, setReadingLetter] = useState<UnsentLetter | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; if (autoSaveRef.current) clearInterval(autoSaveRef.current); }; }, []);

  // Auto-save while writing
  useEffect(() => {
    if (phase !== 'write') { if (autoSaveRef.current) clearInterval(autoSaveRef.current); return; }
    autoSaveRef.current = setInterval(() => {
      // Content saves via state — the actual save happens on explicit action
    }, 30000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [phase]);

  const saveLetter = () => {
    if (!content.trim()) return;
    const letter: UnsentLetter = {
      id: `ul_${Date.now()}`, to: selectedTo, content: content.trim(),
      date: new Date().toISOString().split('T')[0],
    };
    const updated = [...letters, letter];
    setLetters(updated);
    saveUnsent(updated);
    setCurrentLetter(letter);
    setPhase('options');
  };

  const getMiraResponse = async () => {
    if (!currentLetter) return;
    setMiraLoading(true);
    setPhase('response');
    const recipientLabel = LETTER_RECIPIENTS.find(r => r.id === currentLetter.to)?.label || 'someone';
    const response = await callAI(
      `The user wrote this unsent letter to "${recipientLabel}":\n\n"${currentLetter.content.slice(0, 800)}"\n\nWrite a compassionate, healing response AS IF you were that person responding with full understanding and empathy. Acknowledge specifically what they said. Show genuine remorse or love or understanding as appropriate. Not toxic positivity — genuine acknowledgment of pain. Lowercase. 4-5 sentences.`
    );
    if (mountedRef.current) {
      setMiraResponse(response || "i hear every word. and i'm sorry. you deserved better.");
      setMiraLoading(false);
      // Save response
      const updated = letters.map(l => l.id === currentLetter.id ? { ...l, miraResponse: response } : l);
      setLetters(updated);
      saveUnsent(updated);
    }
  };

  const releaseLetter = () => {
    if (!currentLetter) return;
    setReleasing(true);
    setTimeout(() => {
      const updated = letters.filter(l => l.id !== currentLetter.id);
      setLetters(updated);
      saveUnsent(updated);
      setPhase('released');
      setReleasing(false);
    }, 2000);
  };

  const resetToList = () => {
    setPhase('list');
    setContent('');
    setSelectedTo('');
    setCurrentLetter(null);
    setMiraResponse('');
    setReadingLetter(null);
  };

  // ─── LIST ───
  if (phase === 'list') {
    return (
      <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-2xl mx-auto h-full overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <button onClick={onBack} className="text-sm text-sand-500 hover:text-forest-600 mb-2 flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Journal
              </button>
              <h2 className="font-serif text-2xl text-forest-900">Unsent Letters</h2>
              <p className="text-sand-500 text-sm">words you need to say but don't need to send</p>
            </div>
          </div>
        </motion.div>

        <button onClick={() => setPhase('pick')}
          className="w-full bg-forest-600 hover:bg-forest-700 text-white py-3.5 rounded-2xl font-medium mb-5 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
          ✉️ Write an Unsent Letter
        </button>

        {letters.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sand-500 text-sm">no unsent letters yet.</p>
            <p className="text-sand-400 text-xs mt-1">sometimes the most important things are said to no one.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {[...letters].reverse().map(letter => {
              const rec = LETTER_RECIPIENTS.find(r => r.id === letter.to);
              return (
                <button key={letter.id} onClick={() => { setReadingLetter(letter); }}
                  className="w-full text-left bg-white rounded-xl border border-sand-200 p-4 hover:border-dusk-200 transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{rec?.emoji}</span>
                    <p className="text-sm font-medium text-forest-900">To: {rec?.label}</p>
                  </div>
                  <p className="text-xs text-sand-500 truncate">{letter.content.slice(0, 60)}...</p>
                  <p className="text-[10px] text-sand-400 mt-1">
                    {new Date(letter.date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    {letter.miraResponse ? ' • has response' : ''}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {/* Reading a past letter */}
        <AnimatePresence>
          {readingLetter && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-forest-950/50 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setReadingLetter(null)}>
              <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6"
                onClick={e => e.stopPropagation()}>
                <p className="text-xs text-sand-500 mb-3">
                  {LETTER_RECIPIENTS.find(r => r.id === readingLetter.to)?.emoji} to: {LETTER_RECIPIENTS.find(r => r.id === readingLetter.to)?.label}
                  {' • '}{new Date(readingLetter.date + 'T00:00:00').toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="text-forest-900 text-sm leading-relaxed whitespace-pre-wrap mb-4">{readingLetter.content}</p>
                {readingLetter.miraResponse && (
                  <div className="bg-dusk-50 rounded-xl p-4 border border-dusk-200">
                    <p className="text-xs text-dusk-600 font-medium mb-1">their response (via mira)</p>
                    <p className="text-sm text-forest-800 leading-relaxed italic">{readingLetter.miraResponse}</p>
                  </div>
                )}
                <button onClick={() => setReadingLetter(null)} className="w-full mt-4 text-sm text-sand-500 hover:text-sand-700 py-2">close</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── PICK RECIPIENT ───
  if (phase === 'pick') {
    return (
      <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-2xl mx-auto h-full overflow-y-auto">
        <button onClick={resetToList} className="text-sm text-sand-500 hover:text-forest-600 mb-4 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> back
        </button>
        <h3 className="font-serif text-xl text-forest-900 mb-1">Who is this letter to?</h3>
        <p className="text-sand-500 text-sm mb-5">this will never be sent. it's just for you.</p>
        <div className="space-y-2">
          {LETTER_RECIPIENTS.map(rec => (
            <button key={rec.id} onClick={() => { setSelectedTo(rec.id); setContent(''); setPhase('write'); }}
              className="w-full text-left bg-white rounded-xl border border-sand-200 p-4 hover:border-dusk-200 hover:bg-dusk-50/30 transition-all active:scale-[0.98] flex items-center gap-3">
              <span className="text-2xl">{rec.emoji}</span>
              <p className="text-sm font-medium text-forest-900">{rec.label}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── WRITE ───
  if (phase === 'write') {
    const rec = LETTER_RECIPIENTS.find(r => r.id === selectedTo);
    return (
      <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-2xl mx-auto h-full overflow-y-auto">
        <button onClick={resetToList} className="text-sm text-sand-500 hover:text-forest-600 mb-4 flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> back
        </button>
        <p className="text-xs text-dusk-600 mb-1">to: {rec?.emoji} {rec?.label}</p>
        <p className="text-sand-500 text-sm italic mb-4">say everything you've never been able to say.</p>
        <textarea value={content} onChange={e => setContent(e.target.value)}
          placeholder="dear..."
          autoFocus rows={15}
          className="w-full bg-white border border-sand-200 rounded-2xl px-6 py-5 text-forest-900 text-[15px] leading-relaxed placeholder:text-sand-400 resize-none focus:border-dusk-400 focus:outline-none note-texture"
        />
        <button onClick={saveLetter} disabled={!content.trim()}
          className="w-full mt-4 bg-dusk-600 hover:bg-dusk-700 disabled:bg-sand-300 text-white py-3 rounded-2xl font-medium flex items-center justify-center gap-2 transition-colors">
          <Save className="w-4 h-4" /> save letter
        </button>
      </div>
    );
  }

  // ─── OPTIONS ───
  if (phase === 'options') {
    return (
      <div className="p-6 pb-24 md:pb-8 max-w-sm mx-auto h-full flex flex-col items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center w-full">
          <p className="text-lg mb-2">✉️</p>
          <h3 className="font-serif text-xl text-forest-900 mb-2">letter saved.</h3>
          <p className="text-sand-500 text-sm mb-6 leading-relaxed">
            there's no right answer here. keep it, hear a response, or let it go. all of those are valid.
          </p>
          <div className="space-y-2">
            <button onClick={resetToList}
              className="w-full bg-white border border-sand-200 hover:border-forest-200 text-forest-700 py-3 rounded-xl text-sm font-medium transition-colors">
              🔒 keep it private
            </button>
            <button onClick={getMiraResponse}
              className="w-full bg-dusk-600 hover:bg-dusk-700 text-white py-3 rounded-xl text-sm font-medium transition-colors">
              💌 let mira respond as them
            </button>
            <button onClick={releaseLetter}
              className="w-full bg-clay-50 border border-clay-200 text-clay-700 hover:bg-clay-100 py-3 rounded-xl text-sm font-medium transition-colors">
              🔥 release it (delete forever)
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── RESPONSE ───
  if (phase === 'response') {
    return (
      <div className="p-6 pb-24 md:pb-8 max-w-lg mx-auto h-full overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs text-dusk-500 mb-4">a response from the person you wish could hear you</p>
          {miraLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-dusk-400 animate-spin" />
            </div>
          ) : (
            <div className="bg-dusk-50 rounded-2xl border border-dusk-200 p-6 mb-6">
              <p className="text-forest-900 text-[15px] leading-[1.8] whitespace-pre-wrap italic">{miraResponse}</p>
            </div>
          )}
          <button onClick={resetToList}
            className="w-full bg-forest-600 hover:bg-forest-700 text-white py-3 rounded-2xl font-medium transition-colors">
            done
          </button>
        </motion.div>
      </div>
    );
  }

  // ─── RELEASING ───
  if (phase === 'released' || releasing) {
    return (
      <div className="p-6 pb-24 md:pb-8 max-w-sm mx-auto h-full flex flex-col items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          {releasing ? (
            <>
              <motion.div animate={{ opacity: [1, 0.3, 1, 0.1, 0], scale: [1, 1.1, 0.9, 1.2, 0], y: [0, -5, 0, -10, -30] }}
                transition={{ duration: 2 }}
                className="text-5xl mb-4 inline-block">🔥</motion.div>
              <p className="text-sand-500 text-sm">releasing...</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🕊️</span>
              </div>
              <h3 className="font-serif text-xl text-forest-900 mb-2">released.</h3>
              <p className="text-sand-600 text-sm mb-6">you didn't need to carry that anymore.</p>
              <button onClick={resetToList}
                className="bg-forest-600 hover:bg-forest-700 text-white px-8 py-3 rounded-2xl font-medium transition-colors">
                back to letters
              </button>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  return null;
}
