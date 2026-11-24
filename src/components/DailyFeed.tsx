import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Sparkles, Brain, Target, MessageCircle, BookOpen, Check, Loader2, Trophy } from 'lucide-react';

import { GROQ_API_KEY } from '../utils/constants';
const API_KEY = GROQ_API_KEY;

interface FeedCard {
  id: string;
  type: 'checkin' | 'insight' | 'challenge' | 'mood_q' | 'faith';
  title: string;
  icon: React.ReactNode;
  gradient: string;
  prompt: string;
  content: string;
  loading: boolean;
}

interface DailyFeedProps {
  userName: string;
  faithPref: string | null; // religion id or null
}

function getToday() {
  const d = new Date();
  return {
    dateKey: d.toISOString().split('T')[0],
    dayName: d.toLocaleDateString('en', { weekday: 'long' }),
    fullDate: d.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  };
}

const FAITH_NAMES: Record<string, string> = {
  islam: 'Islam', hinduism: 'Hinduism', christianity: 'Christianity',
  judaism: 'Judaism', buddhism: 'Buddhism', sikhism: 'Sikhism',
};

function buildCards(userName: string, faithPref: string | null): Omit<FeedCard, 'content' | 'loading'>[] {
  const { dayName, fullDate } = getToday();
  const name = userName || 'friend';

  const cards: Omit<FeedCard, 'content' | 'loading'>[] = [
    {
      id: 'checkin', type: 'checkin', title: "Mira's daily check-in",
      icon: <MessageCircle className="w-4 h-4" />, gradient: 'from-forest-50 to-emerald-50',
      prompt: `You are Mira. Write a warm, casual morning message for ${name} for ${fullDate} (${dayName}). Make it feel like a text from a real friend checking in. Reference the actual day (Monday morning energy, Friday excitement, Sunday anxiety etc). 2-3 sentences max. Lowercase. No AI phrases like "I hear you" or "your feelings are valid". Just be a real friend.`,
    },
    {
      id: 'insight', type: 'insight', title: "Today's mental health insight",
      icon: <Brain className="w-4 h-4" />, gradient: 'from-dusk-50 to-violet-50',
      prompt: `Give one genuinely interesting, lesser-known psychological insight or mental health fact that most people don't know. Make it feel like something you'd share with a friend over coffee. Start with a hook that makes people go "wait, really?". 3-4 sentences. Today is ${fullDate}. Don't start with "Did you know".`,
    },
    {
      id: 'challenge', type: 'challenge', title: 'Daily micro-challenge',
      icon: <Target className="w-4 h-4" />, gradient: 'from-warm-50 to-amber-50',
      prompt: `Give one small, specific, doable mental wellness challenge for today (${dayName}). Not generic like "be grateful." Something a real person can actually do in the next hour. Examples of the right vibe: text someone you haven't talked to in a month, sit outside for 10 minutes without your phone, write down one thing you're avoiding and why, compliment a stranger. Be creative, specific, and different. 2-3 sentences.`,
    },
    {
      id: 'mood_q', type: 'mood_q', title: "Today's reflection question",
      icon: <Sparkles className="w-4 h-4" />, gradient: 'from-sky-50 to-blue-50',
      prompt: `Write one deep but approachable question to make someone reflect on their emotional state today (${dayName}). Not therapy-speak. Like something a thoughtful friend would ask over dinner. Single question only. No preamble, no "here's a question for you" — just the question itself.`,
    },
  ];

  if (faithPref && FAITH_NAMES[faithPref]) {
    cards.push({
      id: 'faith', type: 'faith', title: `${FAITH_NAMES[faithPref]} reflection`,
      icon: <BookOpen className="w-4 h-4" />, gradient: 'from-emerald-50 to-green-50',
      prompt: `Share a short, genuinely comforting thought or verse from ${FAITH_NAMES[faithPref]} for ${dayName}. Include the actual source text (verse, hadith, shloka, psalm, etc) with reference. Then add a 2-sentence personal reflection. Feel real and warm, not preachy. Use appropriate honorifics.`,
    });
  }

  return cards;
}

async function generateCard(prompt: string, signal?: AbortSignal): Promise<string> {
  const models = ['qwen/qwen3.8-27b', 'allam-2-7b', 'openai/gpt-oss-20b'];
  for (const model of models) {
    if (signal?.aborted) break;
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'You are a warm, real, thoughtful wellness companion. Write casually and genuinely. Never use AI cliches. Keep it short.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.85, max_tokens: 250,
        }),
        signal,
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

// Storage key per day
function storageKey(cardId: string, dateKey: string) { return `nm_feed_${cardId}_${dateKey}`; }

// ─── WEEKLY CHALLENGE ───
interface WeeklyChallenge {
  weekKey: string; // "2025-W27"
  title: string;
  description: string;
  theme: string;
  days: { day: number; task: string }[];
  completedDays: number[];
}

function getWeekKey(): string {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

function getDayOfWeek(): number { return new Date().getDay() || 7; } // 1=Mon..7=Sun

function loadChallenge(): WeeklyChallenge | null {
  try { const r = localStorage.getItem('nm_weekly_challenge'); return r ? JSON.parse(r) : null; } catch { return null; }
}
function saveChallenge(ch: WeeklyChallenge) { localStorage.setItem('nm_weekly_challenge', JSON.stringify(ch)); }

function loadChallengeHistory(): WeeklyChallenge[] {
  try { const r = localStorage.getItem('nm_challenge_history'); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveChallengeHistory(h: WeeklyChallenge[]) { localStorage.setItem('nm_challenge_history', JSON.stringify(h.slice(-4))); }

async function generateWeeklyChallenge(): Promise<WeeklyChallenge | null> {
  const weekKey = getWeekKey();
  const startDate = new Date().toLocaleDateString('en', { month: 'long', day: 'numeric' });
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen/qwen3.8-27b',
        messages: [{ role: 'user', content: `Generate a 7-day mental wellness challenge for the week of ${startDate}.\n\nReturn ONLY valid JSON:\n{"title":"catchy title max 5 words","description":"2 sentences inspiring","days":[{"day":1,"task":"specific doable task under 20 words"},{"day":2,"task":"..."},{"day":3,"task":"..."},{"day":4,"task":"..."},{"day":5,"task":"..."},{"day":6,"task":"..."},{"day":7,"task":"..."}],"theme":"gratitude"}\n\ntheme must be one of: gratitude, connection, mindfulness, movement, creativity, kindness, rest.\nMake tasks genuinely doable for a busy person. Creative and specific.` }],
        temperature: 0.8, max_tokens: 500,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) {
        const jsonStr = text.replace(/```json\n?|```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        return { weekKey, title: parsed.title, description: parsed.description, theme: parsed.theme || 'mindfulness', days: parsed.days || [], completedDays: [] };
      }
    }
  } catch {}
  return null;
}

export default function DailyFeed({ userName, faithPref }: DailyFeedProps) {
  const { dateKey, fullDate } = getToday();
  const cardDefs = buildCards(userName, faithPref);

  const [cards, setCards] = useState<FeedCard[]>(() => {
    return cardDefs.map(def => {
      const cached = localStorage.getItem(storageKey(def.id, dateKey));
      return { ...def, content: cached || '', loading: !cached };
    });
  });

  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  // Weekly Challenge state
  const [challenge, setChallenge] = useState<WeeklyChallenge | null>(loadChallenge);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const currentWeek = getWeekKey();
  const todayDow = getDayOfWeek(); // 1-7

  // Load/generate challenge on mount
  useEffect(() => {
    if (challenge && challenge.weekKey === currentWeek) return; // current week's challenge exists
    // Archive old challenge
    if (challenge && challenge.weekKey !== currentWeek) {
      const history = loadChallengeHistory();
      history.push(challenge);
      saveChallengeHistory(history);
    }
    // Generate new
    setChallengeLoading(true);
    generateWeeklyChallenge().then(ch => {
      if (ch && mountedRef.current) {
        setChallenge(ch);
        saveChallenge(ch);
      }
      if (mountedRef.current) setChallengeLoading(false);
    });
  }, []);

  const completeToday = () => {
    if (!challenge) return;
    if (challenge.completedDays.includes(todayDow)) return;
    const updated = { ...challenge, completedDays: [...challenge.completedDays, todayDow] };
    setChallenge(updated);
    saveChallenge(updated);
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; if (abortRef.current) abortRef.current.abort(); };
  }, []);

  // Generate uncached cards on mount
  useEffect(() => {
    const uncached = cards.filter(c => !c.content && c.loading);
    if (uncached.length === 0) return;

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    (async () => {
      for (const card of uncached) {
        if (ctrl.signal.aborted || !mountedRef.current) break;
        const content = await generateCard(card.prompt, ctrl.signal);
        if (content && mountedRef.current && !ctrl.signal.aborted) {
          localStorage.setItem(storageKey(card.id, dateKey), content);
          setCards(prev => prev.map(c => c.id === card.id ? { ...c, content, loading: false } : c));
        } else if (mountedRef.current) {
          setCards(prev => prev.map(c => c.id === card.id ? { ...c, loading: false, content: c.content || 'could not load. tap refresh to try again.' } : c));
        }
      }
    })();

    return () => ctrl.abort();
  }, []);

  const refreshCard = useCallback(async (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    setCards(prev => prev.map(c => c.id === cardId ? { ...c, loading: true } : c));

    const content = await generateCard(card.prompt);
    if (mountedRef.current) {
      localStorage.setItem(storageKey(cardId, dateKey), content || '');
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, content: content || 'could not load.', loading: false } : c));
    }
  }, [cards, dateKey]);

  const refreshAll = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setCards(prev => prev.map(c => ({ ...c, loading: true, content: '' })));

    for (const card of cards) {
      if (ctrl.signal.aborted || !mountedRef.current) break;
      const content = await generateCard(card.prompt, ctrl.signal);
      if (content && mountedRef.current && !ctrl.signal.aborted) {
        localStorage.setItem(storageKey(card.id, dateKey), content);
        setCards(prev => prev.map(c => c.id === card.id ? { ...c, content, loading: false } : c));
      }
    }
  }, [cards, dateKey]);

  const anyLoading = cards.some(c => c.loading);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-serif text-2xl text-forest-900">today</h2>
            <p className="text-sand-500 text-sm">{fullDate.toLowerCase()}</p>
          </div>
          <button onClick={refreshAll} disabled={anyLoading}
            className="w-9 h-9 rounded-xl bg-sand-100 hover:bg-sand-200 flex items-center justify-center transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 text-sand-600 ${anyLoading ? 'animate-spin' : ''}`} />
          </button>
        </motion.div>

        {/* Weekly Challenge Card */}
        {(challenge || challengeLoading) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-warm-50 to-forest-50 rounded-2xl border border-warm-200 overflow-hidden mb-4">
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-warm-600" />
                <p className="text-xs font-medium text-warm-700 uppercase tracking-wider">This Week's Challenge</p>
              </div>
              {challenge && (
                <span className="text-xs text-forest-600 font-medium">
                  {challenge.completedDays.length}/7
                </span>
              )}
            </div>
            <div className="px-5 pb-4">
              {challengeLoading ? (
                <div className="flex items-center gap-2 py-3">
                  <Loader2 className="w-4 h-4 text-warm-400 animate-spin" />
                  <span className="text-sm text-sand-500">generating this week's challenge...</span>
                </div>
              ) : challenge ? (
                <>
                  <p className="font-serif text-lg text-forest-900 mb-1">{challenge.title}</p>
                  <p className="text-xs text-sand-600 mb-3">{challenge.description}</p>

                  {/* Progress dots */}
                  <div className="flex gap-1.5 mb-3">
                    {[1,2,3,4,5,6,7].map(d => (
                      <div key={d} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all ${
                        challenge.completedDays.includes(d)
                          ? 'bg-forest-500 text-white'
                          : d === todayDow
                            ? 'bg-forest-100 text-forest-700 ring-2 ring-forest-300'
                            : 'bg-sand-100 text-sand-400'
                      }`}>
                        {challenge.completedDays.includes(d) ? <Check className="w-3 h-3" /> : d}
                      </div>
                    ))}
                  </div>

                  {/* Today's task */}
                  {challenge.days[todayDow - 1] && (
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-xs text-sand-500 mb-0.5">day {todayDow}:</p>
                        <p className="text-sm text-forest-900">{challenge.days[todayDow - 1].task}</p>
                      </div>
                      {!challenge.completedDays.includes(todayDow) ? (
                        <button onClick={completeToday}
                          className="bg-forest-600 hover:bg-forest-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium flex-shrink-0 transition-colors">
                          done ✓
                        </button>
                      ) : (
                        <span className="text-xs text-forest-600 font-medium flex-shrink-0 bg-forest-50 px-2 py-1 rounded-lg">✓ done</span>
                      )}
                    </div>
                  )}

                  {/* All 7 completed */}
                  {challenge.completedDays.length >= 7 && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      className="mt-3 bg-forest-50 rounded-xl p-3 text-center border border-forest-200">
                      <p className="text-sm text-forest-700 font-medium">🏆 you did it. all 7 days. that's not nothing — that's everything.</p>
                    </motion.div>
                  )}
                </>
              ) : null}
            </div>
          </motion.div>
        )}

        {/* Cards */}
        <div className="space-y-4">
          {cards.map((card, i) => (
            <motion.div key={card.id}
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-gradient-to-br ${card.gradient} rounded-2xl border border-sand-200 overflow-hidden`}
            >
              {/* Card header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-forest-600">{card.icon}</span>
                  <p className="text-xs font-medium text-forest-800 uppercase tracking-wider">{card.title}</p>
                </div>
                <button onClick={() => refreshCard(card.id)} disabled={card.loading}
                  className="text-sand-400 hover:text-forest-600 transition-colors disabled:opacity-40">
                  <RefreshCw className={`w-3.5 h-3.5 ${card.loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Card content */}
              <div className="px-5 pb-5">
                {card.loading ? (
                  <div className="space-y-2 py-2">
                    <div className="h-3 bg-white/60 rounded-full w-full animate-pulse" />
                    <div className="h-3 bg-white/60 rounded-full w-4/5 animate-pulse" />
                    <div className="h-3 bg-white/60 rounded-full w-3/5 animate-pulse" />
                  </div>
                ) : (
                  <p className="text-forest-900 text-[14.5px] leading-[1.75] whitespace-pre-wrap">{card.content}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
