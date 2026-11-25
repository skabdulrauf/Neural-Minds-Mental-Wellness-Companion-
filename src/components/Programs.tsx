import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Check, Lock, Wind, Grip, BookOpen, Trophy, Sparkles } from 'lucide-react';

import { GROQ_API_KEY } from '../utils/constants';
import { getCuratedProgramLesson } from '../utils/miraEngine';
const API_KEY = GROQ_API_KEY;

// ─── PROGRAM DEFINITIONS ───
interface ProgramDef {
  id: string;
  title: string;
  emoji: string;
  color: string;
  description: string;
  days: { title: string; prompt: string; exercise: 'breathing' | 'grounding'; journalPrompt: string }[];
}

const PROGRAMS: ProgramDef[] = [
  {
    id: 'anxiety', title: '7-Day Anxiety Reset', emoji: '🌊', color: 'from-blue-50 to-cyan-100',
    description: 'Understand your anxiety, learn to manage it, and build lasting calm — one day at a time.',
    days: [
      { title: 'Understanding Your Anxiety', prompt: 'Write a warm, simple 150-word lesson about what anxiety actually is — the fight-or-flight response, why our body does it, and why it\'s not our fault. Make it feel like a friend explaining, not a textbook. End with one comforting insight.', exercise: 'breathing', journalPrompt: 'When do you notice your anxiety the most? Describe what it feels like in your body.' },
      { title: 'Your Anxiety Triggers', prompt: 'Write a 150-word lesson about identifying anxiety triggers — situations, people, thoughts, or environments that activate anxiety. Give 3 common examples. Remind the reader that triggers aren\'t weaknesses. Warm and practical.', exercise: 'grounding', journalPrompt: 'List 3 things that tend to trigger your anxiety. No judgment — just notice them.' },
      { title: 'The Breath Reset', prompt: 'Write a 150-word lesson about how breathing directly calms the nervous system — explain the vagus nerve in simple terms. Explain why 4-7-8 breathing works. Make it practical and empowering.', exercise: 'breathing', journalPrompt: 'After trying the breathing exercise, how does your body feel different? Describe the before and after.' },
      { title: 'Challenging Anxious Thoughts', prompt: 'Write a 150-word lesson about cognitive distortions — catastrophizing, mind-reading, black-and-white thinking. Explain how to catch a thought and ask "is this actually true?" Give one example. Warm tone.', exercise: 'grounding', journalPrompt: 'Write down one anxious thought you had today. Now write a more balanced version of the same thought.' },
      { title: 'Building Your Safety Net', prompt: 'Write a 150-word lesson about creating a personal anxiety toolkit — grounding techniques, safe people to call, comfort items, and go-to activities. Encourage the reader to build their own list.', exercise: 'breathing', journalPrompt: 'Create your personal anxiety toolkit: list 3 things you can do, 2 people you can call, and 1 place that feels safe.' },
      { title: 'Anxiety and Sleep', prompt: 'Write a 150-word lesson about the anxiety-sleep cycle — how anxiety disrupts sleep and poor sleep increases anxiety. Give 3 simple bedtime habits that help. Warm and non-preachy.', exercise: 'grounding', journalPrompt: 'How has your sleep been this week? What\'s one small change you could try tonight?' },
      { title: 'Your New Calm', prompt: 'Write a warm, celebratory 150-word lesson for someone who just completed a 7-day anxiety program. Acknowledge their courage. Remind them that progress isn\'t linear. Give 3 things to remember going forward. End with genuine encouragement.', exercise: 'breathing', journalPrompt: 'Write a letter to your future self about what you learned this week. What do you want to remember?' },
    ],
  },
  {
    id: 'confidence', title: '7-Day Confidence Builder', emoji: '💪', color: 'from-amber-50 to-orange-100',
    description: 'Rebuild your self-belief from the inside out — no fake motivation, just real inner work.',
    days: [
      { title: 'Where Confidence Lives', prompt: 'Write a 150-word lesson about what real confidence actually is — not arrogance, not faking it, but genuine self-trust. Explain that confidence is built through small actions, not born. Warm and relatable.', exercise: 'grounding', journalPrompt: 'Describe a moment when you felt genuinely confident. What made that moment different?' },
      { title: 'The Inner Critic', prompt: 'Write a 150-word lesson about the inner critic — that voice that says "you\'re not good enough." Explain that everyone has one and it\'s often a protection mechanism. Give one technique to respond to it. Warm.', exercise: 'breathing', journalPrompt: 'What does your inner critic say most often? Write it down, then write what a kind friend would say instead.' },
      { title: 'Small Wins Matter', prompt: 'Write a 150-word lesson about the power of small wins — how tiny accomplishments build momentum and rewire the brain. Give 3 examples of small wins. Encouraging.', exercise: 'grounding', journalPrompt: 'List 3 small things you accomplished today — even tiny ones like getting out of bed or drinking water.' },
      { title: 'Body Language of Confidence', prompt: 'Write a 150-word lesson about how body language affects our internal state — power poses, eye contact, taking up space. Explain the body-mind connection. Practical and fun.', exercise: 'breathing', journalPrompt: 'Try standing tall with your shoulders back for 2 minutes. How did it make you feel inside?' },
      { title: 'Saying No Without Guilt', prompt: 'Write a 150-word lesson about setting boundaries and saying no as acts of self-respect. Explain that people-pleasing erodes confidence. Give a gentle script for saying no. Warm.', exercise: 'grounding', journalPrompt: 'Is there something in your life right now where you want to say no but haven\'t? Write about why.' },
      { title: 'Embracing Imperfection', prompt: 'Write a 150-word lesson about perfectionism as a confidence killer. Explain "good enough" vs "perfect." Share the concept of growth mindset briefly. Encouraging.', exercise: 'breathing', journalPrompt: 'What\'s one thing you\'ve been avoiding because you\'re afraid of not doing it perfectly?' },
      { title: 'The Confident You', prompt: 'Write a warm, celebratory 150-word lesson for someone completing a 7-day confidence program. Acknowledge their growth. Remind them confidence is a practice not a destination. End with genuine belief in them.', exercise: 'grounding', journalPrompt: 'Describe the person you\'re becoming. What would the confident version of you do differently?' },
    ],
  },
  {
    id: 'sleep', title: '7-Day Sleep Repair', emoji: '🌙', color: 'from-indigo-50 to-violet-100',
    description: 'Fix your sleep from the root — no pills, just science-backed habits and real rest.',
    days: [
      { title: 'Why You Can\'t Sleep', prompt: 'Write a 150-word lesson about common reasons for poor sleep — screens, caffeine timing, irregular schedule, racing thoughts. Be understanding, not lecturing. Explain the sleep-wake cycle simply.', exercise: 'breathing', journalPrompt: 'What does your typical evening look like? Write out your last 2 hours before bed honestly.' },
      { title: 'Your Sleep Environment', prompt: 'Write a 150-word lesson about optimizing the bedroom for sleep — temperature, darkness, noise, phone placement. Give 3 simple changes anyone can make tonight. Practical.', exercise: 'grounding', journalPrompt: 'Look at your bedroom right now. What\'s one thing you could change to make it more sleep-friendly?' },
      { title: 'The Wind-Down Ritual', prompt: 'Write a 150-word lesson about creating a bedtime routine — the brain needs transition time. Suggest a simple 30-minute wind-down: dim lights, warm drink, gentle stretching, no screens. Warm tone.', exercise: 'breathing', journalPrompt: 'Design your ideal wind-down routine. What 3 calming activities would you include?' },
      { title: 'Racing Thoughts at Night', prompt: 'Write a 150-word lesson about the "brain dump" technique — writing down worries before bed so your mind can let go. Explain why the brain races at night. Give the worry journal technique.', exercise: 'grounding', journalPrompt: 'Do a brain dump right now: write everything that\'s on your mind. Let the paper hold it for you.' },
      { title: 'Naps and Caffeine Truth', prompt: 'Write a 150-word lesson about caffeine timing (none after 2pm), nap rules (20 min max, before 3pm), and alcohol\'s effect on sleep quality. Practical, not preachy.', exercise: 'breathing', journalPrompt: 'Track your caffeine intake today. When was your last cup? How might it affect tonight\'s sleep?' },
      { title: 'Movement and Sleep', prompt: 'Write a 150-word lesson about how movement during the day improves sleep at night — even a 20-minute walk helps. Explain the body temperature drop effect. Give simple suggestions.', exercise: 'grounding', journalPrompt: 'How much did you move today? Plan one simple way to add 15 minutes of movement tomorrow.' },
      { title: 'Your Sleep Reset Complete', prompt: 'Write a warm, celebratory 150-word lesson for someone completing a 7-day sleep program. Acknowledge that sleep takes time to fix. Remind them of the key habits. End with genuine encouragement for better nights ahead.', exercise: 'breathing', journalPrompt: 'Compare how you felt on Day 1 vs now. What\'s the most helpful thing you learned this week?' },
    ],
  },
];

// ─── STORAGE ───
interface ProgramState {
  programId: string;
  startDate: string;
  currentDay: number; // 1-7
  completedDays: number[];
}

function loadProgramState(): ProgramState | null {
  try {
    const raw = localStorage.getItem('nm_program');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveProgramState(state: ProgramState | null) {
  if (state) localStorage.setItem('nm_program', JSON.stringify(state));
  else localStorage.removeItem('nm_program');
}

// ─── AI CONTENT LOADER ───
async function loadLesson(prompt: string, fallbackText: string, signal?: AbortSignal): Promise<string> {
  if (!API_KEY) return fallbackText;
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
            { role: 'system', content: 'You are a warm, knowledgeable wellness coach writing short daily lessons. Keep it to around 150 words. Be warm, practical, and never preachy. Write like a caring friend who knows their stuff.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7, max_tokens: 300,
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

// ─── MAIN COMPONENT ───
export default function Programs() {
  const [progState, setProgState] = useState<ProgramState | null>(loadProgramState);
  const [viewingDay, setViewingDay] = useState<number | null>(null);
  const [lesson, setLesson] = useState('');
  const [lessonLoading, setLessonLoading] = useState(false);
  const [showCert, setShowCert] = useState(false);
  const [certMessage, setCertMessage] = useState('');
  const [certLoading, setCertLoading] = useState(false);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; if (abortRef.current) abortRef.current.abort(); };
  }, []);

  const activeProg = progState ? PROGRAMS.find(p => p.id === progState.programId) : null;

  const startProgram = (progId: string) => {
    const state: ProgramState = {
      programId: progId,
      startDate: new Date().toISOString().split('T')[0],
      currentDay: 1,
      completedDays: [],
    };
    setProgState(state);
    saveProgramState(state);
    setViewingDay(null);
    setShowCert(false);
  };

  const quitProgram = () => {
    setProgState(null);
    saveProgramState(null);
    setViewingDay(null);
    setShowCert(false);
  };

  const openDay = async (day: number) => {
    if (!activeProg || !progState) return;
    if (day > progState.currentDay) return;

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setViewingDay(day);
    setLesson('');
    setLessonLoading(true);

    const dayDef = activeProg.days[day - 1];
    const fallbackLesson = getCuratedProgramLesson(activeProg.id, day);
    const text = await loadLesson(dayDef.prompt, fallbackLesson, ctrl.signal);
    if (mountedRef.current && !ctrl.signal.aborted) {
      setLesson(text);
      setLessonLoading(false);
    }
  };

  const completeDay = async () => {
    if (!progState || viewingDay === null) return;
    const completed = [...new Set([...progState.completedDays, viewingDay])];
    const nextDay = Math.min(viewingDay + 1, 7);
    const updated: ProgramState = { ...progState, completedDays: completed, currentDay: Math.max(progState.currentDay, nextDay) };
    setProgState(updated);
    saveProgramState(updated);

    if (completed.length >= 7) {
      setViewingDay(null);
      setShowCert(true);
      setCertLoading(true);
      const fallbackCert = `you showed up for all seven days of ${activeProg?.title || 'your program'}. that consistency — even on the days when your energy was low — is how real change happens. keep carrying these small habits with you. — Mira`;
      const certText = await loadLesson(
        `Write a warm, celebratory congratulations message for someone who just completed the "${activeProg?.title}" program. 100 words. End with "— Mira"`,
        fallbackCert
      );
      if (mountedRef.current) { setCertMessage(certText); setCertLoading(false); }
    } else {
      setViewingDay(null);
    }
  };

  // ─── PROGRAM SELECTION ───
  if (!progState) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
            <Trophy className="w-10 h-10 text-warm-500 mx-auto mb-3" />
            <h2 className="font-serif text-2xl text-forest-900 mb-1">Wellness Programs</h2>
            <p className="text-sand-500 text-sm">structured 7-day journeys to feel better</p>
          </motion.div>

          <div className="space-y-4">
            {PROGRAMS.map((prog, i) => (
              <motion.div key={prog.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`bg-gradient-to-br ${prog.color} rounded-2xl border border-sand-200 p-5`}>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{prog.emoji}</span>
                  <span className="text-[10px] font-bold text-forest-700 bg-white/60 px-2 py-0.5 rounded-full">7 Days</span>
                </div>
                <h3 className="font-serif text-lg text-forest-900 mb-1">{prog.title}</h3>
                <p className="text-sm text-sand-600 mb-4 leading-relaxed">{prog.description}</p>
                <button onClick={() => startProgram(prog.id)}
                  className="w-full bg-forest-600 hover:bg-forest-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors active:scale-[0.98]">
                  Start Program
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── CERTIFICATE ───
  if (showCert && activeProg) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-5 pb-24 md:pb-8 max-w-md mx-auto flex flex-col items-center justify-center min-h-[60vh]">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center w-full">
            <div className="w-20 h-20 bg-warm-100 rounded-full flex items-center justify-center mx-auto mb-5 animate-breathe">
              <Trophy className="w-10 h-10 text-warm-600" />
            </div>
            <h2 className="font-serif text-2xl text-forest-900 mb-1">🎉 Program Complete!</h2>
            <p className="text-sand-500 text-sm mb-6">{activeProg.title}</p>

            <div className="bg-gradient-to-br from-warm-50 to-forest-50 rounded-2xl border border-warm-200 p-6 mb-6 text-left">
              {certLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-forest-400 animate-spin" />
                </div>
              ) : (
                <p className="text-forest-900 text-sm leading-[1.8] whitespace-pre-wrap italic">{certMessage}</p>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setShowCert(false); setProgState(null); saveProgramState(null); }}
                className="flex-1 bg-forest-600 hover:bg-forest-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
                Choose New Program
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── ACTIVE PROGRAM — DAY VIEW ───
  if (viewingDay !== null && activeProg) {
    const dayDef = activeProg.days[viewingDay - 1];
    const isCompleted = progState.completedDays.includes(viewingDay);

    return (
      <div className="h-full flex flex-col">
        <div className="flex-shrink-0 px-4 pt-3 pb-2 border-b border-sand-200 flex items-center gap-3">
          <button onClick={() => setViewingDay(null)}
            className="w-8 h-8 rounded-lg bg-sand-100 hover:bg-sand-200 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-sand-600" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-serif text-lg text-forest-900 truncate">Day {viewingDay}: {dayDef.title}</p>
            <p className="text-[10px] text-sand-500">{activeProg.title}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-8">
          <div className="max-w-lg mx-auto space-y-4">
            {/* Lesson */}
            <div className="bg-white rounded-2xl border border-sand-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-warm-500" />
                <span className="text-xs font-medium text-warm-600 uppercase tracking-wider">Today's Lesson</span>
              </div>
              {lessonLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-forest-400 animate-spin" />
                </div>
              ) : (
                <p className="text-forest-900 text-[14.5px] leading-[1.8] whitespace-pre-wrap">{lesson}</p>
              )}
            </div>

            {/* Exercise card */}
            <div className="bg-forest-50 rounded-2xl border border-forest-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-forest-100 flex items-center justify-center text-forest-600">
                  {dayDef.exercise === 'breathing' ? <Wind className="w-5 h-5" /> : <Grip className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium text-forest-900 text-sm">
                    {dayDef.exercise === 'breathing' ? 'Breathing Exercise' : '5-4-3-2-1 Grounding'}
                  </p>
                  <p className="text-xs text-forest-600">tap to practice in the {dayDef.exercise === 'breathing' ? 'Breathe' : 'Ground'} section</p>
                </div>
              </div>
            </div>

            {/* Journal prompt */}
            <div className="bg-warm-50 rounded-2xl border border-warm-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-warm-600" />
                <span className="text-xs font-medium text-warm-700 uppercase tracking-wider">Journal Prompt</span>
              </div>
              <p className="text-forest-900 text-sm leading-relaxed italic">{dayDef.journalPrompt}</p>
            </div>

            {/* Complete button */}
            {!isCompleted ? (
              <button onClick={completeDay} disabled={lessonLoading}
                className="w-full bg-forest-600 hover:bg-forest-700 disabled:bg-sand-300 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 active:scale-[0.98]">
                <Check className="w-4 h-4" /> Complete Day {viewingDay}
              </button>
            ) : (
              <div className="text-center py-2">
                <span className="text-sm text-forest-600 font-medium flex items-center justify-center gap-1">
                  <Check className="w-4 h-4" /> Day {viewingDay} Completed ✓
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── ACTIVE PROGRAM — DAY LIST ───
  if (activeProg) {
    const progressPct = (progState.completedDays.length / 7) * 100;

    return (
      <div className="h-full overflow-y-auto">
        <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{activeProg.emoji}</span>
                <h2 className="font-serif text-xl text-forest-900">{activeProg.title}</h2>
              </div>
              <button onClick={quitProgram} className="text-xs text-sand-400 hover:text-clay-500 transition-colors">quit</button>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-3 mb-1">
              <div className="flex-1 bg-sand-100 rounded-full h-2">
                <motion.div className="bg-forest-500 h-2 rounded-full" initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }} transition={{ duration: 0.5 }} />
              </div>
              <span className="text-xs text-sand-500 font-medium whitespace-nowrap">
                Day {progState.currentDay} of 7
              </span>
            </div>
            <p className="text-xs text-sand-400">{progState.completedDays.length}/7 days completed</p>
          </motion.div>

          {/* Day cards */}
          <div className="space-y-2">
            {activeProg.days.map((day, i) => {
              const dayNum = i + 1;
              const isCompleted = progState.completedDays.includes(dayNum);
              const isCurrent = dayNum === progState.currentDay;
              const isLocked = dayNum > progState.currentDay;

              return (
                <motion.button key={dayNum}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => !isLocked && openDay(dayNum)}
                  disabled={isLocked}
                  className={`w-full text-left flex items-center gap-3 p-4 rounded-xl border transition-all ${
                    isCompleted
                      ? 'bg-forest-50 border-forest-200'
                      : isCurrent
                        ? 'bg-white border-forest-300 shadow-sm'
                        : isLocked
                          ? 'bg-sand-50 border-sand-100 opacity-50 cursor-not-allowed'
                          : 'bg-white border-sand-200 hover:border-forest-200'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                    isCompleted
                      ? 'bg-forest-500 text-white'
                      : isCurrent
                        ? 'bg-forest-100 text-forest-700 ring-2 ring-forest-300'
                        : 'bg-sand-100 text-sand-400'
                  }`}>
                    {isCompleted ? <Check className="w-4 h-4" /> : isLocked ? <Lock className="w-3.5 h-3.5" /> : dayNum}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isLocked ? 'text-sand-400' : 'text-forest-900'}`}>
                      Day {dayNum}: {day.title}
                    </p>
                    {isCurrent && !isCompleted && (
                      <p className="text-[10px] text-forest-600 font-medium mt-0.5">← start here</p>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
