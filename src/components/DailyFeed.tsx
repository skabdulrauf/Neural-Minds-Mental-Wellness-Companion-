import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw, Sparkles, Brain, Target, MessageCircle, BookOpen,
  Check, Trophy, Wind, Headphones, PenLine, ArrowRight, HeartHandshake,
} from 'lucide-react';
import { AppView, UserProfile } from '../utils/types';
import { GROQ_API_KEY } from '../utils/constants';
import { getCuratedDailyFeed } from '../utils/miraEngine';

const API_KEY = GROQ_API_KEY;

interface FeedCard {
  id: 'checkin' | 'insight' | 'challenge' | 'mood_q' | 'faith';
  type: 'checkin' | 'insight' | 'challenge' | 'mood_q' | 'faith';
  title: string;
  kicker: string;
  icon: React.ReactNode;
  prompt: string;
  content: string;
  loading: boolean;
}

interface DailyFeedProps {
  userName: string;
  faithPref: string | null;
  profile?: UserProfile;
  setProfile?: (p: UserProfile) => void;
  onNavigate?: (view: AppView) => void;
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
      id: 'checkin',
      type: 'checkin',
      kicker: 'Morning Note',
      title: "Mira's Daily Check-In",
      icon: <MessageCircle className="w-4 h-4" />,
      prompt: `You are Mira. Write a warm, casual morning message for ${name} for ${fullDate} (${dayName}). Make it feel like a text from a real friend checking in. 2-3 sentences max. Lowercase.`,
    },
    {
      id: 'insight',
      type: 'insight',
      kicker: 'Neuroscience & Psychology',
      title: "Today's Mindful Insight",
      icon: <Brain className="w-4 h-4" />,
      prompt: `Give one genuinely interesting psychological insight or nervous-system fact. Start with a hook. 3-4 sentences. Today is ${fullDate}.`,
    },
    {
      id: 'challenge',
      type: 'challenge',
      kicker: 'Gentle Action',
      title: 'Daily Micro-Experiment',
      icon: <Target className="w-4 h-4" />,
      prompt: `Give one small, specific, doable mental wellness micro-challenge for today (${dayName}). 2-3 sentences.`,
    },
    {
      id: 'mood_q',
      type: 'mood_q',
      kicker: 'Evening / Midday Pause',
      title: 'Question for Reflection',
      icon: <Sparkles className="w-4 h-4" />,
      prompt: `Write one deep but approachable question to make someone reflect on their emotional state today (${dayName}). Single question only.`,
    },
  ];

  if (faithPref && FAITH_NAMES[faithPref]) {
    cards.push({
      id: 'faith',
      type: 'faith',
      kicker: 'Spiritual Anchor',
      title: `${FAITH_NAMES[faithPref]} Reflection`,
      icon: <BookOpen className="w-4 h-4" />,
      prompt: `Share a short, genuinely comforting verse or thought from ${FAITH_NAMES[faithPref]} for ${dayName} with a 2-sentence reflection.`,
    });
  }

  return cards;
}

async function generateCardWithFallback(
  cardId: FeedCard['id'],
  prompt: string,
  userName: string,
  faithPref: string | null,
  offset: number = 0,
  signal?: AbortSignal
): Promise<string> {
  const fallbackBundle = getCuratedDailyFeed(userName, faithPref, offset);
  const fallbackText = fallbackBundle[cardId] || fallbackBundle.checkin;

  if (!API_KEY) {
    return fallbackText;
  }

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
          temperature: 0.85,
          max_tokens: 250,
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
  return fallbackText;
}

function storageKey(cardId: string, dateKey: string) {
  return `nm_feed_${cardId}_${dateKey}`;
}

interface WeeklyChallenge {
  weekKey: string;
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

function getDayOfWeek(): number {
  return new Date().getDay() || 7;
}

const DEFAULT_WEEKLY_CHALLENGE = (weekKey: string): WeeklyChallenge => ({
  weekKey,
  title: 'Unclutter the Nervous System',
  description: 'Seven days of micro-rituals designed to lower background cortisol and restore quiet mental bandwidth.',
  theme: 'mindfulness',
  days: [
    { day: 1, task: 'Take 6 slow physiological sighs before checking messages this morning.' },
    { day: 2, task: 'Step outside for 8 minutes without headphones and notice 3 natural sounds.' },
    { day: 3, task: 'Write down one worry you are carrying and one tiny action within your control.' },
    { day: 4, task: 'Send an unprompted appreciation text to someone who makes your life lighter.' },
    { day: 5, task: 'Leave your phone across the room 30 minutes before sleep tonight.' },
    { day: 6, task: 'Plant 3 small gratitude seeds in your Gratitude Garden.' },
    { day: 7, task: 'Spend 5 quiet minutes reflecting on one moment you handled better this week.' },
  ],
  completedDays: [],
});

function loadChallenge(): WeeklyChallenge {
  const weekKey = getWeekKey();
  try {
    const r = localStorage.getItem('nm_weekly_challenge');
    if (r) {
      const parsed = JSON.parse(r);
      if (parsed && parsed.weekKey === weekKey && Array.isArray(parsed.days) && parsed.days.length > 0) {
        return parsed;
      }
    }
  } catch {}
  const fallback = DEFAULT_WEEKLY_CHALLENGE(weekKey);
  localStorage.setItem('nm_weekly_challenge', JSON.stringify(fallback));
  return fallback;
}

function saveChallenge(ch: WeeklyChallenge) {
  localStorage.setItem('nm_weekly_challenge', JSON.stringify(ch));
}

const MOOD_CHOICES = [
  { mood: 1, emoji: '😔', label: 'Heavy', emotion: 'hopelessness' },
  { mood: 2, emoji: '😕', label: 'Low', emotion: 'sadness' },
  { mood: 3, emoji: '😐', label: 'Steady', emotion: 'neutral' },
  { mood: 4, emoji: '🙂', label: 'Calm', emotion: 'calm' },
  { mood: 5, emoji: '😊', label: 'Bright', emotion: 'joy' },
];

export default function DailyFeed({ userName, faithPref, profile, setProfile, onNavigate }: DailyFeedProps) {
  const { dateKey, fullDate } = getToday();
  const cardDefs = buildCards(userName, faithPref);
  const refreshOffsetRef = useRef(0);

  const [cards, setCards] = useState<FeedCard[]>(() => {
    const initialBundle = getCuratedDailyFeed(userName, faithPref, 0);
    return cardDefs.map(def => {
      const cached = localStorage.getItem(storageKey(def.id, dateKey));
      const validCached = cached && !cached.includes('could not load') ? cached : '';
      const initialContent = validCached || initialBundle[def.id] || initialBundle.checkin;
      if (!validCached) {
        localStorage.setItem(storageKey(def.id, dateKey), initialContent);
      }
      return { ...def, content: initialContent, loading: false };
    });
  });

  const [challenge, setChallenge] = useState<WeeklyChallenge>(loadChallenge);
  const [challengeDoneToday, setChallengeDoneToday] = useState(() =>
    localStorage.getItem(`nm_micro_challenge_${dateKey}`) === 'done'
  );

  const todayDow = getDayOfWeek();
  const todayMoodEntry = profile?.moodHistory.find(m => m.date === dateKey);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const completeWeeklyDay = () => {
    if (challenge.completedDays.includes(todayDow)) return;
    const updated = { ...challenge, completedDays: [...challenge.completedDays, todayDow] };
    setChallenge(updated);
    saveChallenge(updated);
  };

  const toggleMicroChallenge = () => {
    const next = !challengeDoneToday;
    setChallengeDoneToday(next);
    if (next) localStorage.setItem(`nm_micro_challenge_${dateKey}`, 'done');
    else localStorage.removeItem(`nm_micro_challenge_${dateKey}`);
  };

  const handleQuickMood = (choice: typeof MOOD_CHOICES[0]) => {
    if (!profile || !setProfile) return;
    const filtered = profile.moodHistory.filter(m => m.date !== dateKey);
    setProfile({
      ...profile,
      moodHistory: [...filtered, { date: dateKey, mood: choice.mood, emotion: choice.emotion }],
    });
    localStorage.setItem('neuralminds_mood_date', dateKey);
  };

  const refreshCard = useCallback(async (cardId: FeedCard['id']) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    refreshOffsetRef.current += 1;

    setCards(prev => prev.map(c => c.id === cardId ? { ...c, loading: true } : c));
    const content = await generateCardWithFallback(
      cardId,
      card.prompt,
      userName,
      faithPref,
      refreshOffsetRef.current
    );
    if (mountedRef.current) {
      localStorage.setItem(storageKey(cardId, dateKey), content);
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, content, loading: false } : c));
    }
  }, [cards, dateKey, faithPref, userName]);

  const refreshAll = useCallback(async () => {
    refreshOffsetRef.current += 1;
    setCards(prev => prev.map(c => ({ ...c, loading: true })));

    for (const card of cards) {
      const content = await generateCardWithFallback(
        card.id,
        card.prompt,
        userName,
        faithPref,
        refreshOffsetRef.current
      );
      if (mountedRef.current) {
        localStorage.setItem(storageKey(card.id, dateKey), content);
        setCards(prev => prev.map(c => c.id === card.id ? { ...c, content, loading: false } : c));
      }
    }
  }, [cards, dateKey, faithPref, userName]);

  const anyLoading = cards.some(c => c.loading);
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayUser = userName && userName !== 'Friend' ? userName : 'friend';

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5 md:p-8 pb-28 md:pb-10 max-w-5xl mx-auto space-y-6">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-sand-200/80 pb-5"
        >
          <div>
            <p className="text-xs font-medium text-forest-600 tracking-wide mb-1">
              {fullDate} · Daily Sanctuary
            </p>
            <h1 className="font-serif text-3xl md:text-4xl text-forest-950 tracking-tight">
              {timeGreeting}, {displayUser}.
            </h1>
          </div>
          <div className="flex items-center gap-2.5">
            {onNavigate && (
              <button
                onClick={() => onNavigate('chat')}
                className="inline-flex items-center gap-2 bg-forest-700 hover:bg-forest-800 text-white text-xs font-medium px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Talk with Mira
              </button>
            )}
            <button
              onClick={refreshAll}
              disabled={anyLoading}
              aria-label="Refresh daily insights"
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white border border-sand-200 hover:border-forest-300 text-forest-800 text-xs font-medium transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-forest-600 ${anyLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </motion.div>

        {/* Quick Rituals Strip + Quick Mood Check-in */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Quick Mood Check-In Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className="lg:col-span-5 bg-white rounded-2xl border border-sand-200 p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-sand-500 mb-1">
                <span>Emotional Pulse</span>
                <span className="font-mono tabular-nums">
                  {todayMoodEntry ? 'Logged today' : '1-tap check-in'}
                </span>
              </div>
              <h2 className="font-serif text-xl text-forest-900 mb-3">
                How is your nervous system feeling right now?
              </h2>
            </div>

            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {MOOD_CHOICES.map(choice => {
                const isSelected = todayMoodEntry?.mood === choice.mood;
                return (
                  <button
                    key={choice.mood}
                    onClick={() => handleQuickMood(choice)}
                    className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-forest-50 border-forest-400 text-forest-900 shadow-xs scale-[1.02]'
                        : 'bg-sand-50/70 border-transparent hover:bg-sand-100/80 text-sand-600'
                    }`}
                  >
                    <span className="text-2xl">{choice.emoji}</span>
                    <span className="text-[11px] font-medium whitespace-nowrap">{choice.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* 4 Quick Sanctuary Ritual Launchers */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            {[
              {
                view: 'breathing' as AppView,
                title: 'Breathe & Ground',
                sub: 'Box · 4-7-8 · 5-Senses',
                icon: <Wind className="w-5 h-5 text-forest-600" />,
                bg: 'bg-forest-50/70 hover:bg-forest-100/70 border-forest-200/70',
              },
              {
                view: 'journal' as AppView,
                title: 'Reflect & Garden',
                sub: 'Journal · Gratitude',
                icon: <PenLine className="w-5 h-5 text-warm-700" />,
                bg: 'bg-warm-50/80 hover:bg-warm-100/70 border-warm-200/80',
              },
              {
                view: 'sounds' as AppView,
                title: 'Sound Sanctuary',
                sub: 'Rain · Binaural · Sleep',
                icon: <Headphones className="w-5 h-5 text-dusk-600" />,
                bg: 'bg-dusk-50/70 hover:bg-dusk-100/70 border-dusk-200/70',
              },
              {
                view: 'toolkit' as AppView,
                title: 'CBT & First Aid',
                sub: 'Reframe · 7-Day Plans',
                icon: <HeartHandshake className="w-5 h-5 text-clay-600" />,
                bg: 'bg-clay-50/70 hover:bg-clay-100/70 border-clay-200/70',
              },
            ].map(item => (
              <button
                key={item.view}
                onClick={() => onNavigate?.(item.view)}
                className={`text-left rounded-2xl border p-4 flex flex-col justify-between transition-all active:scale-[0.98] group ${item.bg}`}
              >
                <div className="w-10 h-10 rounded-xl bg-white/90 border border-black/5 flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <div>
                  <p className="font-semibold text-forest-950 text-sm flex items-center justify-between gap-1">
                    <span>{item.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-50 group-hover:translate-x-0.5 group-hover:opacity-100 transition-all shrink-0" />
                  </p>
                  <p className="text-[11px] text-sand-600 mt-0.5">{item.sub}</p>
                </div>
              </button>
            ))}
          </motion.div>
        </div>

        {/* Main 2-Column Bento Grid for Daily Feed Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {cards.map((card, i) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className={`bg-white rounded-2xl border border-sand-200 p-6 flex flex-col justify-between ${
                card.id === 'checkin' ? 'md:col-span-2 bg-gradient-to-br from-white via-forest-50/30 to-warm-50/40' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 text-xs text-sand-500">
                    <span className="text-forest-600">{card.icon}</span>
                    <span className="font-medium text-forest-800">{card.title}</span>
                    <span aria-hidden="true">·</span>
                    <span>{card.kicker}</span>
                  </div>
                  <button
                    onClick={() => refreshCard(card.id)}
                    disabled={card.loading}
                    aria-label={`Refresh ${card.title}`}
                    className="text-sand-400 hover:text-forest-600 transition-colors disabled:opacity-40 p-1"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${card.loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {card.loading ? (
                  <div className="space-y-2.5 py-2">
                    <div className="h-3.5 bg-sand-100 rounded-full w-full animate-pulse" />
                    <div className="h-3.5 bg-sand-100 rounded-full w-4/5 animate-pulse" />
                  </div>
                ) : (
                  <p className={`text-forest-950 leading-relaxed whitespace-pre-wrap ${
                    card.id === 'checkin' ? 'font-serif text-lg md:text-xl' : 'text-[15px]'
                  }`}>
                    {card.content}
                  </p>
                )}
              </div>

              {card.id === 'challenge' && !card.loading && (
                <div className="mt-4 pt-3 border-t border-sand-100 flex items-center justify-between">
                  <span className="text-xs text-sand-500">
                    {challengeDoneToday ? 'Completed for today' : 'Try this in the next hour'}
                  </span>
                  <button
                    onClick={toggleMicroChallenge}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      challengeDoneToday
                        ? 'bg-forest-100 text-forest-800'
                        : 'bg-forest-600 hover:bg-forest-700 text-white'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {challengeDoneToday ? 'Done today' : 'Mark complete'}
                  </button>
                </div>
              )}

              {card.id === 'mood_q' && !card.loading && onNavigate && (
                <div className="mt-4 pt-3 border-t border-sand-100 flex items-center justify-between">
                  <span className="text-xs text-sand-500">Unpack this thought</span>
                  <button
                    onClick={() => onNavigate('journal')}
                    className="text-xs font-medium text-forest-700 hover:text-forest-900 inline-flex items-center gap-1"
                  >
                    Write in Journal <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* 7-Day Weekly Ritual Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl border border-sand-200 p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-sand-500 mb-1">
                <Trophy className="w-3.5 h-3.5 text-warm-600" />
                <span>7-Day Sanctuary Path</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{challenge.completedDays.length} of 7 days complete</span>
              </div>
              <h3 className="font-serif text-xl text-forest-950">{challenge.title}</h3>
              <p className="text-xs text-sand-600 mt-0.5">{challenge.description}</p>
            </div>

            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map(d => {
                const done = challenge.completedDays.includes(d);
                const isToday = d === todayDow;
                return (
                  <div
                    key={d}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono tabular-nums transition-all ${
                      done
                        ? 'bg-forest-600 text-white'
                        : isToday
                          ? 'bg-forest-50 text-forest-800 border border-forest-400 font-semibold'
                          : 'bg-sand-100 text-sand-500'
                    }`}
                  >
                    {done ? <Check className="w-3.5 h-3.5" /> : d}
                  </div>
                );
              })}
            </div>
          </div>

          {challenge.days[todayDow - 1] && (
            <div className="bg-sand-50/80 rounded-xl border border-sand-200/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs text-sand-500 font-mono tabular-nums mb-0.5">
                  Day {todayDow} Focus
                </p>
                <p className="text-sm font-medium text-forest-950">
                  {challenge.days[todayDow - 1].task}
                </p>
              </div>
              {!challenge.completedDays.includes(todayDow) ? (
                <button
                  onClick={completeWeeklyDay}
                  className="bg-forest-600 hover:bg-forest-700 text-white text-xs px-4 py-2 rounded-xl font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  Complete Day {todayDow}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-forest-700 font-medium whitespace-nowrap shrink-0">
                  <Check className="w-3.5 h-3.5" /> Completed today
                </span>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
