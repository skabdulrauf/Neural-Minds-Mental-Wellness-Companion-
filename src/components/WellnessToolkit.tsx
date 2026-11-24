import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Timer, Brain, CheckSquare, Sparkles, Moon,
  Play, Pause, RotateCcw, Plus, Trash2, Check, ChevronRight, RefreshCw,
} from 'lucide-react';

// ────────────────────────────────────────
// TYPES & STORAGE
// ────────────────────────────────────────
interface ThoughtRecord {
  id: string;
  date: string;
  situation: string;
  thought: string;
  distortion: string;
  reframe: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

interface SleepEntry {
  date: string;
  hours: number;
  quality: number; // 1-5
}

const DISTORTIONS = [
  { id: 'catastrophizing', label: 'Catastrophizing', desc: 'imagining the worst outcome' },
  { id: 'blackwhite', label: 'Black & White', desc: 'no middle ground, all or nothing' },
  { id: 'mindreading', label: 'Mind Reading', desc: 'assuming what others think' },
  { id: 'overgeneralizing', label: 'Overgeneralizing', desc: '"always" or "never" thinking' },
  { id: 'personalization', label: 'Personalization', desc: 'blaming yourself for everything' },
  { id: 'filtering', label: 'Mental Filter', desc: 'focusing only on the negative' },
  { id: 'shoulding', label: '"Should" Statements', desc: 'rigid rules about how things must be' },
  { id: 'labeling', label: 'Labeling', desc: 'defining yourself by one thing' },
];

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: '1', text: 'Drink water', done: false },
  { id: '2', text: 'Take a walk outside', done: false },
  { id: '3', text: 'Eat a real meal', done: false },
  { id: '4', text: 'Talk to someone', done: false },
  { id: '5', text: 'Screen break (10 min)', done: false },
  { id: '6', text: 'Do one thing I keep postponing', done: false },
];

function loadFromLS<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function saveToLS(key: string, val: any) { localStorage.setItem(key, JSON.stringify(val)); }

type ToolTab = 'meditate' | 'cbt' | 'checklist' | 'affirm' | 'sleep';

const TABS: { id: ToolTab; icon: React.ReactNode; label: string }[] = [
  { id: 'meditate', icon: <Timer className="w-4 h-4" />, label: 'Meditate' },
  { id: 'cbt', icon: <Brain className="w-4 h-4" />, label: 'CBT' },
  { id: 'checklist', icon: <CheckSquare className="w-4 h-4" />, label: 'Goals' },
  { id: 'affirm', icon: <Sparkles className="w-4 h-4" />, label: 'Affirm' },
  { id: 'sleep', icon: <Moon className="w-4 h-4" />, label: 'Sleep' },
];

// ────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────
export default function WellnessToolkit() {
  const [tab, setTab] = useState<ToolTab>('meditate');

  return (
    <div className="h-full flex flex-col">
      {/* Tab bar */}
      <div className="flex-shrink-0 px-3 pt-3 pb-1">
        <div className="flex gap-1 bg-sand-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                tab === t.id ? 'bg-white text-forest-700 shadow-sm' : 'text-sand-600 hover:text-forest-600'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }} className="h-full">
            {tab === 'meditate' && <MeditationTimer />}
            {tab === 'cbt' && <CBTThoughtRecord />}
            {tab === 'checklist' && <DailyChecklist />}
            {tab === 'affirm' && <Affirmations />}
            {tab === 'sleep' && <SleepTracker />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// 1. MEDITATION TIMER
// ────────────────────────────────────────
function MeditationTimer() {
  const [duration, setDuration] = useState(5); // minutes
  const [timeLeft, setTimeLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [bellInterval, setBellInterval] = useState(0); // 0 = no bell
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playBell = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 528;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 2);
      setTimeout(() => ctx.close(), 2500);
    } catch {}
  }, []);

  const start = () => {
    setTimeLeft(duration * 60);
    setRunning(true);
    playBell();
  };

  const stopTimer = useCallback(() => {
    setRunning(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const reset = () => {
    stopTimer();
    setTimeLeft(0);
  };

  // Timer tick — uses refs to avoid calling state setters inside updater
  const bellIntervalRef = useRef(bellInterval);
  bellIntervalRef.current = bellInterval;

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Schedule stop outside the updater
          setTimeout(() => { stopTimer(); playBell(); }, 0);
          return 0;
        }
        // Interval bell
        const bi = bellIntervalRef.current;
        if (bi > 0 && (prev - 1) % (bi * 60) === 0 && prev > 1) {
          playBell();
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, playBell, stopTimer]);

  // Cleanup on unmount
  useEffect(() => { return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, []);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const progress = duration > 0 ? 1 - timeLeft / (duration * 60) : 0;

  return (
    <div className="h-full overflow-y-auto p-5 pb-24 md:pb-8 flex flex-col items-center justify-center max-w-sm mx-auto">
      <h3 className="font-serif text-2xl text-forest-900 mb-1">Meditation</h3>
      <p className="text-sand-500 text-sm mb-8">sit with yourself for a moment</p>

      {/* Circle timer */}
      <div className="relative w-48 h-48 mb-8">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#e5ded0" strokeWidth="3" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="#3d8768" strokeWidth="3"
            strokeDasharray={`${progress * 283} 283`} strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {running || timeLeft > 0 ? (
            <p className="font-serif text-4xl text-forest-900">{mins}:{secs.toString().padStart(2, '0')}</p>
          ) : (
            <p className="font-serif text-4xl text-forest-900">{duration}:00</p>
          )}
          <p className="text-xs text-sand-500 mt-1">{running ? 'breathe...' : 'minutes'}</p>
        </div>
      </div>

      {/* Duration selector */}
      {!running && timeLeft === 0 && (
        <div className="flex gap-2 mb-4">
          {[3, 5, 10, 15, 20].map(m => (
            <button key={m} onClick={() => setDuration(m)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                duration === m ? 'bg-forest-600 text-white' : 'bg-sand-100 text-sand-600 hover:bg-sand-200'
              }`}>{m}m</button>
          ))}
        </div>
      )}

      {/* Bell interval */}
      {!running && timeLeft === 0 && (
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs text-sand-500">bell every:</span>
          {[0, 1, 2, 5].map(m => (
            <button key={m} onClick={() => setBellInterval(m)}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                bellInterval === m ? 'bg-warm-100 text-warm-700' : 'bg-sand-50 text-sand-500'
              }`}>{m === 0 ? 'off' : `${m}m`}</button>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button onClick={running ? stopTimer : (timeLeft > 0 ? () => setRunning(true) : start)}
          className="w-14 h-14 rounded-full bg-forest-600 hover:bg-forest-700 text-white flex items-center justify-center shadow-lg transition-all active:scale-95">
          {running ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
        </button>
        {(running || timeLeft > 0) && (
          <button onClick={reset} className="w-10 h-10 rounded-full bg-sand-100 hover:bg-sand-200 text-sand-600 flex items-center justify-center">
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// 2. CBT THOUGHT RECORD
// ────────────────────────────────────────
function CBTThoughtRecord() {
  const [records, setRecords] = useState<ThoughtRecord[]>(() => loadFromLS('nm_cbt', []));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ situation: '', thought: '', distortion: '', reframe: '' });
  const [step, setStep] = useState(0);

  const save = () => {
    const record: ThoughtRecord = {
      id: `cbt_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      ...draft,
    };
    const updated = [record, ...records].slice(0, 50);
    setRecords(updated);
    saveToLS('nm_cbt', updated);
    setEditing(false);
    setDraft({ situation: '', thought: '', distortion: '', reframe: '' });
    setStep(0);
  };

  const del = (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    saveToLS('nm_cbt', updated);
  };

  const steps = [
    { key: 'situation', label: 'What happened?', placeholder: 'Describe the situation briefly...', emoji: '📍' },
    { key: 'thought', label: 'What went through your mind?', placeholder: 'The automatic thought you had...', emoji: '💭' },
    { key: 'distortion', label: 'What thinking pattern is this?', placeholder: '', emoji: '🔍' },
    { key: 'reframe', label: 'A more balanced thought?', placeholder: 'How else could you see this...', emoji: '🌱' },
  ];

  return (
    <div className="h-full overflow-y-auto p-5 pb-24 md:pb-8 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-serif text-xl text-forest-900">Thought Record</h3>
          <p className="text-xs text-sand-500">catch → challenge → reframe</p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1 bg-forest-600 hover:bg-forest-700 text-white text-sm px-3 py-2 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> New
          </button>
        )}
      </div>

      {editing && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-sand-200 p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            {steps.map((_s, i) => (
              <div key={i} className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-forest-500' : 'bg-sand-200'} transition-colors`} />
            ))}
          </div>

          <p className="text-lg mb-1">{steps[step].emoji} {steps[step].label}</p>

          {step === 2 ? (
            <div className="grid grid-cols-2 gap-2 mt-3">
              {DISTORTIONS.map(d => (
                <button key={d.id} onClick={() => setDraft(p => ({ ...p, distortion: d.label }))}
                  className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                    draft.distortion === d.label ? 'bg-forest-50 border-forest-300 font-medium' : 'border-sand-200 hover:border-forest-200'
                  }`}>
                  <p className="font-medium text-forest-900">{d.label}</p>
                  <p className="text-sand-500 mt-0.5">{d.desc}</p>
                </button>
              ))}
            </div>
          ) : (
            <textarea value={(draft as any)[steps[step].key]} onChange={e => setDraft(p => ({ ...p, [steps[step].key]: e.target.value }))}
              placeholder={steps[step].placeholder} rows={3}
              className="w-full mt-3 px-3 py-2.5 bg-sand-50 border border-sand-200 rounded-xl text-sm text-forest-900 placeholder:text-sand-400 resize-none focus:border-forest-400" />
          )}

          <div className="flex items-center gap-2 mt-4">
            {step > 0 && <button onClick={() => setStep(step - 1)} className="px-3 py-2 text-sm text-sand-500">← Back</button>}
            <div className="flex-1" />
            {step < 3 ? (
              <button onClick={() => setStep(step + 1)} disabled={!(draft as any)[steps[step].key]}
                className="flex items-center gap-1 bg-forest-600 hover:bg-forest-700 disabled:bg-sand-300 text-white text-sm px-4 py-2 rounded-xl transition-colors">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={save} disabled={!draft.reframe}
                className="flex items-center gap-1 bg-forest-600 hover:bg-forest-700 disabled:bg-sand-300 text-white text-sm px-4 py-2 rounded-xl transition-colors">
                <Check className="w-4 h-4" /> Save
              </button>
            )}
          </div>
          <button onClick={() => { setEditing(false); setStep(0); setDraft({ situation: '', thought: '', distortion: '', reframe: '' }); }}
            className="w-full text-xs text-sand-500 mt-2 hover:text-sand-700">Cancel</button>
        </motion.div>
      )}

      {/* Past records */}
      {records.length === 0 && !editing && (
        <div className="text-center py-12">
          <Brain className="w-10 h-10 text-sand-300 mx-auto mb-3" />
          <p className="text-sand-500 text-sm">no records yet. tap "new" to challenge a thought.</p>
        </div>
      )}
      {records.map(r => (
        <div key={r.id} className="bg-white rounded-xl border border-sand-200 p-4 mb-2">
          <div className="flex justify-between items-start">
            <p className="text-xs text-sand-400">{r.date}</p>
            <button onClick={() => del(r.id)} className="text-sand-300 hover:text-clay-500"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
          <p className="text-sm text-forest-900 mt-1"><span className="text-sand-500">situation:</span> {r.situation}</p>
          <p className="text-sm text-clay-700 mt-1"><span className="text-sand-500">thought:</span> {r.thought}</p>
          <p className="text-xs text-dusk-600 bg-dusk-50 px-2 py-1 rounded-lg inline-block mt-1">{r.distortion}</p>
          <p className="text-sm text-forest-600 mt-1"><span className="text-sand-500">reframe:</span> {r.reframe}</p>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────
// 3. DAILY CHECKLIST
// ────────────────────────────────────────
function DailyChecklist() {
  const getToday = () => new Date().toISOString().split('T')[0];
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    const today = getToday();
    const saved = loadFromLS<{ date: string; items: ChecklistItem[] }>('nm_checklist', { date: '', items: [] });
    return saved.date === today ? saved.items : DEFAULT_CHECKLIST.map(i => ({ ...i, done: false }));
  });
  const [newTask, setNewTask] = useState('');

  const persist = (updated: ChecklistItem[]) => { setItems(updated); saveToLS('nm_checklist', { date: getToday(), items: updated }); };
  const toggle = (id: string) => persist(items.map(i => i.id === id ? { ...i, done: !i.done } : i));
  const remove = (id: string) => persist(items.filter(i => i.id !== id));
  const add = () => {
    if (!newTask.trim()) return;
    persist([...items, { id: `task_${Date.now()}`, text: newTask.trim(), done: false }]);
    setNewTask('');
  };

  const done = items.filter(i => i.done).length;
  const total = items.length;

  return (
    <div className="h-full overflow-y-auto p-5 pb-24 md:pb-8 max-w-md mx-auto">
      <h3 className="font-serif text-xl text-forest-900 mb-1">Daily Goals</h3>
      <p className="text-xs text-sand-500 mb-4">{done}/{total} completed today</p>

      {/* Progress */}
      <div className="w-full bg-sand-100 rounded-full h-2 mb-5">
        <div className="bg-forest-500 h-2 rounded-full transition-all duration-500" style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }} />
      </div>

      {done === total && total > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-forest-50 border border-forest-200 rounded-xl p-3 mb-4 text-center">
          <p className="text-forest-700 font-medium text-sm">🎉 all done! you showed up for yourself today.</p>
        </motion.div>
      )}

      {/* Items */}
      <div className="space-y-2 mb-4">
        {items.map(item => (
          <motion.div key={item.id} layout className="flex items-center gap-3 bg-white rounded-xl border border-sand-200 px-4 py-3 group">
            <button onClick={() => toggle(item.id)}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                item.done ? 'bg-forest-500 border-forest-500' : 'border-sand-300 hover:border-forest-400'
              }`}>
              {item.done && <Check className="w-3 h-3 text-white" />}
            </button>
            <span className={`flex-1 text-sm ${item.done ? 'line-through text-sand-400' : 'text-forest-900'}`}>{item.text}</span>
            <button onClick={() => remove(item.id)} className="text-sand-300 hover:text-clay-500 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Add new */}
      <div className="flex gap-2">
        <input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add(); }}
          placeholder="add a goal..." className="flex-1 px-3 py-2.5 bg-sand-50 border border-sand-200 rounded-xl text-sm text-forest-900 placeholder:text-sand-400 focus:border-forest-400" />
        <button onClick={add} disabled={!newTask.trim()}
          className="px-3 py-2.5 bg-forest-600 hover:bg-forest-700 disabled:bg-sand-300 text-white rounded-xl transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// 4. AFFIRMATIONS
// ────────────────────────────────────────
const AFFIRMATIONS = [
  "i am enough, exactly as i am right now",
  "my feelings are valid, even the uncomfortable ones",
  "i don't have to have it all figured out today",
  "i'm allowed to take up space and set boundaries",
  "progress isn't always visible — i'm still growing",
  "i deserve rest, not just when i've earned it",
  "my worth isn't measured by my productivity",
  "it's okay to ask for help — that's strength, not weakness",
  "i'm doing the best i can with what i have",
  "this moment of difficulty will pass — i've survived before",
  "i am more than my anxious thoughts",
  "i choose to let go of what i can't control",
  "my past doesn't define my future",
  "i trust myself to handle whatever comes",
  "i am worthy of love and connection",
  "today i choose peace over perfection",
  "i give myself permission to feel without judgment",
  "my sensitivity is a gift, not a flaw",
  "i don't owe anyone an explanation for taking care of myself",
  "even on hard days, i'm still worth showing up for",
];

function Affirmations() {
  const today = new Date().toISOString().split('T')[0];
  const [index, setIndex] = useState(() => {
    const saved = loadFromLS<{ date: string; idx: number }>('nm_affirm', { date: '', idx: 0 });
    return saved.date === today ? saved.idx : Math.floor(Math.random() * AFFIRMATIONS.length);
  });
  const [savedList, setSavedList] = useState<number[]>(() => loadFromLS('nm_affirm_saved', []));
  const liked = savedList.includes(index);

  useEffect(() => {
    saveToLS('nm_affirm', { date: today, idx: index });
  }, [index, today]);

  const toggleLike = () => {
    const updated = liked ? savedList.filter(i => i !== index) : [...savedList, index];
    setSavedList(updated);
    saveToLS('nm_affirm_saved', updated);
  };

  const next = () => {
    setIndex((index + 1) % AFFIRMATIONS.length);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 pb-24 md:pb-8 max-w-sm mx-auto">
      <Sparkles className="w-8 h-8 text-warm-400 mb-6" />

      <AnimatePresence mode="wait">
        <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          className="text-center mb-8">
          <p className="font-serif text-2xl text-forest-900 leading-relaxed italic">
            "{AFFIRMATIONS[index]}"
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center gap-3">
        <button onClick={toggleLike}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            liked ? 'bg-warm-100 text-warm-700' : 'bg-sand-100 text-sand-600 hover:bg-sand-200'
          }`}>
          {liked ? '💛 saved' : '🤍 save'}
        </button>
        <button onClick={next}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-forest-50 text-forest-700 hover:bg-forest-100 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> next
        </button>
      </div>

      <p className="text-xs text-sand-400 mt-8">a new affirmation every day</p>
    </div>
  );
}

// ────────────────────────────────────────
// 5. SLEEP TRACKER
// ────────────────────────────────────────
function SleepTracker() {
  const [entries, setEntries] = useState<SleepEntry[]>(() => loadFromLS('nm_sleep', []));
  const [hours, setHours] = useState(7);
  const [quality, setQuality] = useState(3);
  const today = new Date().toISOString().split('T')[0];
  const loggedToday = entries.some(e => e.date === today);

  const logSleep = () => {
    const updated = [{ date: today, hours, quality }, ...entries.filter(e => e.date !== today)].slice(0, 60);
    setEntries(updated);
    saveToLS('nm_sleep', updated);
  };

  const last7 = entries.slice(0, 7).reverse();
  const avgHours = last7.length > 0 ? (last7.reduce((s, e) => s + e.hours, 0) / last7.length).toFixed(1) : '—';
  const avgQuality = last7.length > 0 ? (last7.reduce((s, e) => s + e.quality, 0) / last7.length).toFixed(1) : '—';
  const qualityEmojis = ['', '😫', '😴', '😐', '😊', '🌟'];

  return (
    <div className="h-full overflow-y-auto p-5 pb-24 md:pb-8 max-w-md mx-auto">
      <h3 className="font-serif text-xl text-forest-900 mb-1">Sleep Log</h3>
      <p className="text-xs text-sand-500 mb-5">track your rest, spot patterns</p>

      {/* Log form */}
      <div className="bg-white rounded-2xl border border-sand-200 p-5 mb-5">
        <p className="text-sm font-medium text-forest-900 mb-3">{loggedToday ? '✓ logged today' : "last night\u2019s sleep"}</p>
        
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-sand-500">hours</span>
            <span className="text-sm font-medium text-forest-900">{hours}h</span>
          </div>
          <input type="range" min="1" max="12" step="0.5" value={hours} onChange={e => setHours(parseFloat(e.target.value))}
            className="w-full h-1.5 accent-forest-600 cursor-pointer" />
        </div>

        <div className="mb-4">
          <span className="text-xs text-sand-500">quality</span>
          <div className="flex gap-2 mt-2">
            {[1, 2, 3, 4, 5].map(q => (
              <button key={q} onClick={() => setQuality(q)}
                className={`flex-1 py-2 rounded-lg text-lg transition-all ${
                  quality === q ? 'bg-forest-50 ring-2 ring-forest-300 scale-110' : 'bg-sand-50 hover:bg-sand-100'
                }`}>
                {qualityEmojis[q]}
              </button>
            ))}
          </div>
        </div>

        <button onClick={logSleep}
          className="w-full bg-forest-600 hover:bg-forest-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
          {loggedToday ? 'update' : 'log sleep'}
        </button>
      </div>

      {/* Stats */}
      {last7.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-dusk-50 rounded-xl p-3 text-center">
            <p className="font-serif text-2xl text-forest-900">{avgHours}h</p>
            <p className="text-xs text-sand-500">avg (7 days)</p>
          </div>
          <div className="bg-warm-50 rounded-xl p-3 text-center">
            <p className="font-serif text-2xl text-forest-900">{avgQuality}/5</p>
            <p className="text-xs text-sand-500">avg quality</p>
          </div>
        </div>
      )}

      {/* History */}
      {last7.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-sand-500 font-medium">recent nights</p>
          {last7.map(e => {
            const d = new Date(e.date + 'T00:00:00');
            const label = d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
            return (
              <div key={e.date} className="flex items-center justify-between bg-white rounded-lg border border-sand-100 px-3 py-2">
                <span className="text-xs text-sand-500">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-forest-900 font-medium">{e.hours}h</span>
                  <span className="text-sm">{qualityEmojis[e.quality]}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {entries.length === 0 && (
        <div className="text-center py-8">
          <Moon className="w-8 h-8 text-sand-300 mx-auto mb-2" />
          <p className="text-sand-500 text-sm">no sleep data yet. log your first night above.</p>
        </div>
      )}
    </div>
  );
}
