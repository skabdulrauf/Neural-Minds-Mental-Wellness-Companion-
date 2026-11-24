import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Unlock, ArrowLeft, Loader2 } from 'lucide-react';

import { GROQ_API_KEY } from '../utils/constants';
const API_KEY = GROQ_API_KEY;

interface Letter {
  id: string;
  content: string;       // base64 encoded
  writtenDate: string;   // ISO date
  unlockDate: string;    // ISO date
  mood: number;          // 1-5
  score?: number;        // mental health score at time of writing
  miraResponse?: string; // generated when opened
  opened: boolean;
  afterMood?: number;    // how they felt reading it
}

function loadLetters(): Letter[] {
  try { const r = localStorage.getItem('nm_letters'); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveLetters(letters: Letter[]) { localStorage.setItem('nm_letters', JSON.stringify(letters)); }
function encode(text: string): string { try { return btoa(unescape(encodeURIComponent(text))); } catch { return btoa(text); } }
function decode(b64: string): string { try { return decodeURIComponent(escape(atob(b64))); } catch { try { return atob(b64); } catch { return b64; } } }

const MOODS = [
  { v: 1, e: '😢', l: 'struggling' },
  { v: 2, e: '😔', l: 'low' },
  { v: 3, e: '😐', l: 'okay' },
  { v: 4, e: '🙂', l: 'good' },
  { v: 5, e: '✨', l: 'great' },
];

const QUICK_DATES = [
  { label: '1 week', days: 7 },
  { label: '1 month', days: 30 },
  { label: '3 months', days: 90 },
  { label: '6 months', days: 180 },
  { label: '1 year', days: 365 },
];

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00').getTime();
  const now = new Date().setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target - now) / 86400000));
}

function daysAgo(dateStr: string): number {
  const written = new Date(dateStr + 'T00:00:00').getTime();
  const now = new Date().setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((now - written) / 86400000));
}

async function callAI(prompt: string): Promise<string> {
  const models = ['qwen/qwen3.8-27b', 'allam-2-7b', 'openai/gpt-oss-20b'];
  for (const model of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.8, max_tokens: 200 }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text.replace(/^["']|["']$/g, '').trim();
      }
    } catch {}
  }
  return '';
}

type View = 'list' | 'write' | 'read';

export default function FutureLetters() {
  const [letters, setLetters] = useState<Letter[]>(loadLetters);
  const [view, setView] = useState<View>('list');
  const [readingLetter, setReadingLetter] = useState<Letter | null>(null);

  // Write state
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(3);
  const [unlockDays, setUnlockDays] = useState(30);
  const [sealing, setSealing] = useState(false);
  const [sealed, setSealed] = useState(false);

  // Read state
  const [miraResponse, setMiraResponse] = useState('');
  const [miraLoading, setMiraLoading] = useState(false);
  const [afterMood, setAfterMood] = useState<number | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Check for newly unlocked letters on mount
  const newlyUnlocked = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return letters.filter(l => !l.opened && l.unlockDate <= today);
  }, [letters]);

  const sealLetter = () => {
    if (!content.trim()) return;
    setSealing(true);

    setTimeout(() => {
      const today = new Date().toISOString().split('T')[0];
      const unlock = new Date(Date.now() + unlockDays * 86400000).toISOString().split('T')[0];
      const letter: Letter = {
        id: `letter_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        content: encode(content.trim()),
        writtenDate: today,
        unlockDate: unlock,
        mood,
        opened: false,
      };
      const updated = [...letters, letter];
      setLetters(updated);
      saveLetters(updated);
      setSealed(true);
      setSealing(false);
    }, 1500);
  };

  const openLetter = async (letter: Letter) => {
    // Mark as opened
    const updated = letters.map(l => l.id === letter.id ? { ...l, opened: true } : l);
    setLetters(updated);
    saveLetters(updated);

    const opened = { ...letter, opened: true };
    setReadingLetter(opened);
    setView('read');
    setAfterMood(null);

    // Generate Mira's response
    setMiraLoading(true);
    const days = daysAgo(letter.writtenDate);
    const moodLabel = MOODS.find(m => m.v === letter.mood)?.l || 'unknown';
    const decoded = decode(letter.content);
    const response = await callAI(
      `The user wrote this letter to their future self ${days} days ago when they were feeling "${moodLabel}". Now they're reading it. The letter says:\n\n"${decoded.slice(0, 500)}"\n\nAs Mira (a caring friend), write a warm 2-3 sentence reflection about what they wrote and how far they may have come. Genuine, lowercase, not therapy-speak.`
    );
    if (mountedRef.current) {
      setMiraResponse(response || "you wrote this. and you're still here reading it. that says everything.");
      setMiraLoading(false);

      // Save Mira response
      const withResponse = letters.map(l => l.id === letter.id ? { ...l, opened: true, miraResponse: response } : l);
      setLetters(withResponse);
      saveLetters(withResponse);
    }
  };

  const saveAfterMood = (m: number) => {
    setAfterMood(m);
    if (readingLetter) {
      const updated = letters.map(l => l.id === readingLetter.id ? { ...l, afterMood: m } : l);
      setLetters(updated);
      saveLetters(updated);
    }
  };

  const resetWrite = () => {
    setContent('');
    setMood(3);
    setUnlockDays(30);
    setSealed(false);
    setSealing(false);
    setView('list');
  };

  // ─── LIST VIEW ───
  if (view === 'list') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-serif text-2xl text-forest-900">Letters to Future You</h2>
              <p className="text-sand-500 text-sm">write now, read later</p>
            </div>
            <button onClick={() => setView('write')}
              className="bg-forest-600 hover:bg-forest-700 text-white text-sm px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-1.5">
              <Mail className="w-4 h-4" /> Write
            </button>
          </motion.div>

          {/* Newly unlocked notification */}
          {newlyUnlocked.length > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-warm-50 border border-warm-200 rounded-2xl p-4 mb-5 text-center">
              <p className="text-lg mb-1">📬</p>
              <p className="text-sm text-forest-900 font-medium">
                {newlyUnlocked.length === 1 ? 'A letter from past you just arrived!' : `${newlyUnlocked.length} letters from past you just arrived!`}
              </p>
              <button onClick={() => openLetter(newlyUnlocked[0])}
                className="mt-2 text-sm text-forest-600 font-medium hover:text-forest-700 transition-colors">
                open it →
              </button>
            </motion.div>
          )}

          {/* Letter cards */}
          {letters.length === 0 ? (
            <div className="text-center py-16">
              <Mail className="w-10 h-10 text-sand-300 mx-auto mb-3" />
              <p className="text-sand-500 text-sm">no letters yet. write one to your future self.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...letters].reverse().map((letter, i) => {
                const isUnlocked = letter.unlockDate <= new Date().toISOString().split('T')[0];
                const days = daysUntil(letter.unlockDate);
                const moodInfo = MOODS.find(m => m.v === letter.mood);

                return (
                  <motion.div key={letter.id}
                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`rounded-2xl border p-4 transition-all ${
                      isUnlocked && !letter.opened
                        ? 'bg-warm-50 border-warm-300 shadow-sm cursor-pointer hover:shadow-md'
                        : letter.opened
                          ? 'bg-white border-sand-200'
                          : 'bg-sand-50 border-sand-200'
                    }`}
                    onClick={() => {
                      if (isUnlocked && !letter.opened) openLetter(letter);
                      else if (letter.opened) { setReadingLetter(letter); setMiraResponse(letter.miraResponse || ''); setAfterMood(letter.afterMood || null); setView('read'); }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isUnlocked ? (
                          <Unlock className="w-4 h-4 text-warm-500" />
                        ) : (
                          <Lock className="w-4 h-4 text-sand-400" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-forest-900">
                            {letter.opened ? 'Opened' : isUnlocked ? '📬 Ready to open!' : `Opens in ${days} day${days !== 1 ? 's' : ''}`}
                          </p>
                          <p className="text-[11px] text-sand-500">
                            written {new Date(letter.writtenDate + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <span className="text-lg">{moodInfo?.e}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── WRITE VIEW ───
  if (view === 'write') {
    if (sealed) {
      return (
        <div className="h-full flex items-center justify-center p-6 pb-24 md:pb-6">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-sm">
            <motion.div initial={{ rotateY: 0 }} animate={{ rotateY: 360 }} transition={{ duration: 1 }}
              className="text-6xl mb-6 inline-block">✉️</motion.div>
            <h3 className="font-serif text-2xl text-forest-900 mb-2">letter sealed</h3>
            <p className="text-sand-500 text-sm mb-6">
              it'll be waiting for you in {unlockDays} day{unlockDays !== 1 ? 's' : ''}. future you is going to love this.
            </p>
            <button onClick={resetWrite}
              className="bg-forest-600 hover:bg-forest-700 text-white px-6 py-3 rounded-2xl font-medium transition-colors">
              done
            </button>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="h-full overflow-y-auto">
        <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
          <button onClick={() => setView('list')} className="text-sm text-sand-500 hover:text-forest-600 mb-4 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> back
          </button>

          <h3 className="font-serif text-xl text-forest-900 mb-1">Dear future me...</h3>
          <p className="text-sand-500 text-sm mb-4">write something your future self needs to hear</p>

          <textarea value={content} onChange={e => setContent(e.target.value)}
            placeholder="write from the heart. this is just for you..."
            rows={10}
            className="w-full bg-white border border-sand-200 rounded-2xl px-5 py-4 text-forest-900 text-[15px] leading-relaxed placeholder:text-sand-400 resize-none focus:border-forest-400 focus:outline-none mb-4 note-texture"
          />

          {/* Mood */}
          <div className="bg-warm-50 rounded-xl border border-warm-200 p-4 mb-4">
            <p className="text-sm text-forest-800 mb-2">i'm feeling...</p>
            <div className="flex justify-between">
              {MOODS.map(m => (
                <button key={m.v} onClick={() => setMood(m.v)}
                  className={`text-2xl px-2 py-1 rounded-xl transition-all ${mood === m.v ? 'bg-white shadow-sm scale-110' : 'opacity-50 hover:opacity-80'}`}>
                  {m.e}
                </button>
              ))}
            </div>
          </div>

          {/* Unlock date */}
          <div className="mb-6">
            <p className="text-sm text-forest-800 mb-2">open this letter in:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_DATES.map(d => (
                <button key={d.days} onClick={() => setUnlockDays(d.days)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    unlockDays === d.days ? 'bg-forest-600 text-white' : 'bg-sand-100 text-sand-600 hover:bg-sand-200'
                  }`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={sealLetter} disabled={!content.trim() || sealing}
            className="w-full bg-forest-600 hover:bg-forest-700 disabled:bg-sand-300 text-white py-3.5 rounded-2xl font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-2">
            {sealing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> sealing...</>
            ) : (
              <>🔏 Seal Letter</>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ─── READ VIEW ───
  if (view === 'read' && readingLetter) {
    const decoded = decode(readingLetter.content);
    const days = daysAgo(readingLetter.writtenDate);
    const moodInfo = MOODS.find(m => m.v === readingLetter.mood);

    return (
      <div className="h-full overflow-y-auto">
        <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
          <button onClick={() => { setView('list'); setReadingLetter(null); }}
            className="text-sm text-sand-500 hover:text-forest-600 mb-4 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> back to letters
          </button>

          {/* Letter header */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6">
            <motion.div initial={{ scale: 0, rotateZ: -10 }} animate={{ scale: 1, rotateZ: 0 }}
              transition={{ type: 'spring', damping: 10 }}
              className="text-5xl mb-3 inline-block">📬</motion.div>
            <p className="text-sm text-sand-500">
              you wrote this {days} day{days !== 1 ? 's' : ''} ago • feeling {moodInfo?.e} {moodInfo?.l}
            </p>
          </motion.div>

          {/* The letter */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-gradient-to-b from-warm-50 to-white rounded-2xl border border-warm-200 p-6 mb-5">
            <p className="text-xs text-sand-400 mb-3">
              {new Date(readingLetter.writtenDate + 'T00:00:00').toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <p className="text-forest-900 text-[15px] leading-[1.8] whitespace-pre-wrap italic">{decoded}</p>
          </motion.div>

          {/* Mira's response */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="bg-forest-50 rounded-2xl border border-forest-200 p-5 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🌿</span>
              <span className="text-xs font-medium text-forest-700">Mira</span>
            </div>
            {miraLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-forest-400 animate-spin" />
                <span className="text-sm text-forest-600">reflecting on your words...</span>
              </div>
            ) : (
              <p className="text-sm text-forest-800 leading-relaxed">{miraResponse}</p>
            )}
          </motion.div>

          {/* After mood */}
          {afterMood === null ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
              className="bg-dusk-50 rounded-xl border border-dusk-200 p-4 mb-5">
              <p className="text-sm text-forest-800 mb-3">how do you feel reading this now?</p>
              <div className="flex justify-between">
                {MOODS.map(m => (
                  <button key={m.v} onClick={() => saveAfterMood(m.v)}
                    className="text-2xl px-2 py-1 rounded-xl opacity-60 hover:opacity-100 hover:scale-110 transition-all">
                    {m.e}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="bg-forest-50 rounded-xl border border-forest-200 p-3 mb-5 text-center">
              <p className="text-sm text-forest-700">
                then: {moodInfo?.e} → now: {MOODS.find(m => m.v === afterMood)?.e}
                {afterMood! > readingLetter.mood ? ' — you\'ve grown ✨' : ''}
              </p>
            </div>
          )}

          {/* Write another */}
          <button onClick={() => { setView('write'); setReadingLetter(null); setContent(''); setSealed(false); }}
            className="w-full bg-white border border-sand-200 hover:border-forest-200 text-forest-700 py-3 rounded-2xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
            <Mail className="w-4 h-4" /> write a letter back
          </button>
        </div>
      </div>
    );
  }

  return null;
}
