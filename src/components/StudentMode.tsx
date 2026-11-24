import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Play, Pause, RotateCcw, ArrowLeft, Loader2, Clock } from 'lucide-react';

import { GROQ_API_KEY } from '../utils/constants';
const API_KEY = GROQ_API_KEY;

// ─── TYPES ───
interface Exam {
  id: string;
  subject: string;
  date: string; // ISO
  stress: number; // 1-5
}

interface StudySession {
  date: string;
  minutes: number;
}

interface StudentData {
  exams: Exam[];
  studySessions: StudySession[];
  totalPomodorosToday: number;
  lastPomodoroDate: string;
}

function load(): StudentData {
  try {
    const r = localStorage.getItem('nm_student');
    const d = r ? JSON.parse(r) : {};
    return {
      exams: d.exams || [],
      studySessions: d.studySessions || [],
      totalPomodorosToday: d.lastPomodoroDate === new Date().toISOString().split('T')[0] ? (d.totalPomodorosToday || 0) : 0,
      lastPomodoroDate: new Date().toISOString().split('T')[0],
    };
  } catch { return { exams: [], studySessions: [], totalPomodorosToday: 0, lastPomodoroDate: new Date().toISOString().split('T')[0] }; }
}
function save(data: StudentData) { localStorage.setItem('nm_student', JSON.stringify(data)); }

const BREAK_ACTIVITIES = [
  '🫁 try a 2-minute breathing exercise',
  '💧 drink some water and stretch your arms',
  '🌟 name 3 things going well today',
  '👀 look out a window for 30 seconds',
  '🤸 stand up and roll your shoulders 10 times',
  '📱 put your phone face-down for the next session',
  '🎵 listen to one song you love',
];

async function callAI(prompt: string): Promise<string> {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'qwen/qwen3.8-27b', messages: [{ role: 'user', content: prompt }], temperature: 0.8, max_tokens: 200 }),
    });
    if (res.ok) { const d = await res.json(); return d.choices?.[0]?.message?.content?.replace(/^["']|["']$/g, '').trim() || ''; }
  } catch {}
  return '';
}

type View = 'home' | 'pomodoro' | 'anxiety';

export default function StudentMode() {
  const [data, setData] = useState<StudentData>(load);
  const [view, setView] = useState<View>('home');
  const [newSubject, setNewSubject] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newStress, setNewStress] = useState(3);

  // Pomodoro state
  const [pomRunning, setPomRunning] = useState(false);
  const [pomPhase, setPomPhase] = useState<'study' | 'break'>('study');
  const [pomTime, setPomTime] = useState(25 * 60); // seconds
  const [breakActivity, setBreakActivity] = useState('');
  const pomRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pomTimeRef = useRef(pomTime);

  // Anxiety protocol state
  const [anxietyStep, setAnxietyStep] = useState(0);
  const [anxietyFear, setAnxietyFear] = useState('');
  const [anxietyResponse, setAnxietyResponse] = useState('');
  const [anxietyLoading, setAnxietyLoading] = useState(false);
  const [anxietyExam, setAnxietyExam] = useState<Exam | null>(null);

  const update = (partial: Partial<StudentData>) => {
    const updated = { ...data, ...partial };
    setData(updated);
    save(updated);
  };

  const addExam = () => {
    if (!newSubject.trim() || !newDate) return;
    const exam: Exam = { id: `ex_${Date.now()}`, subject: newSubject.trim(), date: newDate, stress: newStress };
    update({ exams: [...data.exams, exam] });
    setNewSubject('');
    setNewDate('');
    setNewStress(3);
  };

  const removeExam = (id: string) => update({ exams: data.exams.filter(e => e.id !== id) });

  const daysUntil = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00').getTime() - new Date().setHours(0, 0, 0, 0);
    return Math.ceil(d / 86400000);
  };

  // ─── POMODORO ───
  const clearPom = useCallback(() => {
    if (pomRef.current) { clearInterval(pomRef.current); pomRef.current = null; }
  }, []);

  useEffect(() => { return clearPom; }, [clearPom]);

  const startPomodoro = () => {
    clearPom();
    const duration = pomPhase === 'study' ? 25 * 60 : 5 * 60;
    pomTimeRef.current = duration;
    setPomTime(duration);
    setPomRunning(true);

    pomRef.current = setInterval(() => {
      pomTimeRef.current--;
      setPomTime(pomTimeRef.current);
      if (pomTimeRef.current <= 0) {
        clearPom();
        setPomRunning(false);
        if (pomPhase === 'study') {
          // Study done → start break
          setPomPhase('break');
          setBreakActivity(BREAK_ACTIVITIES[Math.floor(Math.random() * BREAK_ACTIVITIES.length)]);
          const today = new Date().toISOString().split('T')[0];
          const sessions = [...data.studySessions];
          const todaySession = sessions.find(s => s.date === today);
          if (todaySession) todaySession.minutes += 25;
          else sessions.push({ date: today, minutes: 25 });
          update({ studySessions: sessions, totalPomodorosToday: data.totalPomodorosToday + 1, lastPomodoroDate: today });
        } else {
          // Break done → ready for study
          setPomPhase('study');
          setBreakActivity('');
        }
      }
    }, 1000);
  };

  const togglePomodoro = () => {
    if (pomRunning) {
      clearPom();
      setPomRunning(false);
    } else {
      startPomodoro();
    }
  };

  const resetPomodoro = () => {
    clearPom();
    setPomRunning(false);
    setPomPhase('study');
    setPomTime(25 * 60);
    setBreakActivity('');
  };

  // ─── ANXIETY PROTOCOL ───
  const startAnxiety = (exam: Exam) => {
    setAnxietyExam(exam);
    setAnxietyStep(0);
    setAnxietyFear('');
    setAnxietyResponse('');
    setView('anxiety');
  };

  const processAnxietyFear = async () => {
    if (!anxietyFear.trim()) return;
    setAnxietyLoading(true);
    const response = await callAI(
      `A student has their ${anxietyExam?.subject} exam tomorrow. They're scared of: "${anxietyFear.trim()}". As Mira (caring friend), give a rational, grounding response to this specific fear. Don't minimize. Don't say "you'll be fine." Acknowledge the fear is real, then gently offer perspective. 2-3 sentences. Lowercase.`
    );
    setAnxietyResponse(response || "that fear makes sense. but remember — you've prepared more than your anxiety wants you to believe.");
    setAnxietyLoading(false);
    setAnxietyStep(2);
  };

  // Study hours this week
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const weekStudyMins = data.studySessions.filter(s => s.date >= weekAgo).reduce((sum, s) => sum + s.minutes, 0);
  const weekStudyHrs = Math.round(weekStudyMins / 60 * 10) / 10;

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ─── ANXIETY PROTOCOL VIEW ───
  if (view === 'anxiety' && anxietyExam) {
    const steps = [
      // Step 0: Ask the fear
      () => (
        <div className="space-y-4">
          <p className="text-forest-900 leading-relaxed">
            your {anxietyExam.subject} exam is tomorrow. tell me — what specifically are you scared of?
          </p>
          <textarea value={anxietyFear} onChange={e => setAnxietyFear(e.target.value)}
            placeholder="i'm scared that..." rows={3}
            className="w-full px-4 py-3 bg-white border border-sand-200 rounded-xl text-sm placeholder:text-sand-400 resize-none focus:border-forest-400" />
          <button onClick={processAnxietyFear} disabled={!anxietyFear.trim() || anxietyLoading}
            className="w-full bg-forest-600 hover:bg-forest-700 disabled:bg-sand-300 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2">
            {anxietyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'tell mira'}
          </button>
        </div>
      ),
      // (step 1 is skipped — processAnxietyFear goes to step 2)
      () => null,
      // Step 2: Show rational response
      () => (
        <div className="space-y-4">
          <div className="bg-forest-50 rounded-xl border border-forest-200 p-4">
            <p className="text-sm text-forest-800 leading-relaxed">{anxietyResponse}</p>
          </div>
          <button onClick={() => setAnxietyStep(3)}
            className="w-full bg-forest-600 hover:bg-forest-700 text-white py-3 rounded-xl font-medium">
            okay... what now?
          </button>
        </div>
      ),
      // Step 3: Breathing
      () => (
        <div className="space-y-4 text-center">
          <p className="text-forest-900">let's do some 4-7-8 breathing. just 3 rounds.</p>
          <p className="text-sand-500 text-sm">go to the Breathe section and try the 4-7-8 technique</p>
          <button onClick={() => setAnxietyStep(4)}
            className="w-full bg-forest-600 hover:bg-forest-700 text-white py-3 rounded-xl font-medium">
            done, what's next?
          </button>
        </div>
      ),
      // Step 4: Close books
      () => (
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-2 animate-breathe">
            <span className="text-2xl">🌙</span>
          </div>
          <p className="font-serif text-xl text-forest-900">now close the books.</p>
          <p className="text-forest-800 leading-relaxed">
            your brain needs rest more than more studying right now. you've done the work. trust it. go to the Sleep section for a sleep story if you need help winding down.
          </p>
          <button onClick={() => setView('home')}
            className="w-full bg-forest-600 hover:bg-forest-700 text-white py-3 rounded-xl font-medium">
            goodnight mira 💚
          </button>
        </div>
      ),
    ];

    return (
      <div className="h-full overflow-y-auto">
        <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
          <button onClick={() => setView('home')} className="text-sm text-sand-500 hover:text-forest-600 mb-4 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> back
          </button>
          <h3 className="font-serif text-xl text-forest-900 mb-1">Pre-Exam Protocol</h3>
          <p className="text-sand-500 text-sm mb-6">{anxietyExam.subject} • tomorrow</p>
          <div className="flex gap-1.5 mb-6">
            {[0,2,3,4].map(s => (
              <div key={s} className={`flex-1 h-1 rounded-full ${anxietyStep >= s ? 'bg-forest-500' : 'bg-sand-200'}`} />
            ))}
          </div>
          {steps[anxietyStep]?.()}
        </div>
      </div>
    );
  }

  // ─── POMODORO VIEW ───
  if (view === 'pomodoro') {
    const progress = pomPhase === 'study' ? 1 - pomTime / (25 * 60) : 1 - pomTime / (5 * 60);
    const circumference = 2 * Math.PI * 52;
    const strokeDash = progress * circumference;

    return (
      <div className="h-full flex flex-col items-center justify-center p-6 pb-24 md:pb-6 max-w-sm mx-auto">
        <button onClick={() => { clearPom(); setPomRunning(false); setView('home'); }} className="self-start text-sm text-sand-500 hover:text-forest-600 mb-6 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> back
        </button>

        <p className="text-xs text-sand-500 mb-1">{pomPhase === 'study' ? '📚 Study Time' : '☕ Break Time'}</p>
        <p className="text-xs text-forest-600 font-medium mb-6">pomodoro #{data.totalPomodorosToday + 1} today</p>

        {/* Timer ring */}
        <div className="relative w-48 h-48 mb-6">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#e5ded0" strokeWidth="5" />
            <circle cx="60" cy="60" r="52" fill="none"
              stroke={pomPhase === 'study' ? '#3d8768' : '#e4ad5e'} strokeWidth="5" strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${circumference}`} className="transition-all duration-1000" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-serif text-4xl text-forest-900">{fmtTime(pomTime)}</p>
            <p className="text-xs text-sand-500">{pomPhase === 'study' ? 'focus' : 'rest'}</p>
          </div>
        </div>

        {/* Break activity */}
        {pomPhase === 'break' && breakActivity && !pomRunning && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            className="bg-warm-50 rounded-xl border border-warm-200 p-4 mb-4 text-center w-full">
            <p className="text-sm text-forest-800">{breakActivity}</p>
          </motion.div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button onClick={togglePomodoro}
            className="w-14 h-14 rounded-full bg-forest-600 hover:bg-forest-700 text-white flex items-center justify-center shadow-lg active:scale-95">
            {pomRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
          <button onClick={resetPomodoro}
            className="w-10 h-10 rounded-full bg-sand-100 hover:bg-sand-200 text-sand-600 flex items-center justify-center">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─── HOME VIEW ───
  const sortedExams = [...data.exams].sort((a, b) => a.date.localeCompare(b.date));
  const upcomingExams = sortedExams.filter(e => daysUntil(e.date) >= 0);
  const tomorrowExams = upcomingExams.filter(e => daysUntil(e.date) === 1);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <h2 className="font-serif text-2xl text-forest-900 mb-1">Student Mode</h2>
          <p className="text-sand-500 text-sm">exams, study, and your wellbeing</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-white rounded-xl border border-sand-200 p-3 text-center">
            <p className="font-serif text-xl text-forest-900">{upcomingExams.length}</p>
            <p className="text-[10px] text-sand-500">exams</p>
          </div>
          <div className="bg-white rounded-xl border border-sand-200 p-3 text-center">
            <p className="font-serif text-xl text-forest-900">{data.totalPomodorosToday}</p>
            <p className="text-[10px] text-sand-500">pomodoros today</p>
          </div>
          <div className="bg-white rounded-xl border border-sand-200 p-3 text-center">
            <p className="font-serif text-xl text-forest-900">{weekStudyHrs}h</p>
            <p className="text-[10px] text-sand-500">study this week</p>
          </div>
        </div>

        {/* Pomodoro button */}
        <button onClick={() => setView('pomodoro')}
          className="w-full bg-gradient-to-r from-forest-600 to-forest-700 text-white py-3.5 rounded-2xl font-medium mb-5 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
          <Clock className="w-5 h-5" /> Start Study Session (Pomodoro)
        </button>

        {/* Tomorrow exam alert */}
        {tomorrowExams.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-clay-50 border border-clay-200 rounded-2xl p-4 mb-5">
            <p className="text-sm text-clay-700 font-medium mb-2">⚠️ exam tomorrow!</p>
            {tomorrowExams.map(exam => (
              <div key={exam.id} className="flex items-center justify-between">
                <p className="text-sm text-forest-900">{exam.subject}</p>
                <button onClick={() => startAnxiety(exam)}
                  className="text-xs bg-forest-600 text-white px-3 py-1.5 rounded-lg font-medium">
                  pre-exam protocol
                </button>
              </div>
            ))}
          </motion.div>
        )}

        {/* Exams */}
        <div className="mb-5">
          <p className="text-[10px] font-bold text-forest-700 uppercase tracking-wider mb-3">My Exams</p>
          {upcomingExams.length === 0 && (
            <p className="text-sm text-sand-500 mb-3">no exams added yet</p>
          )}
          <div className="space-y-2 mb-3">
            {upcomingExams.map(exam => {
              const days = daysUntil(exam.date);
              return (
                <div key={exam.id} className="bg-white rounded-xl border border-sand-200 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-forest-900">{exam.subject}</p>
                    <p className="text-xs text-sand-500">
                      {days === 0 ? '📌 today!' : days === 1 ? '⚡ tomorrow' : `${days} days away`}
                      {' • stress: '}{'😰'.repeat(Math.min(exam.stress, 3))}{exam.stress <= 2 ? '😌' : ''}
                    </p>
                  </div>
                  <button onClick={() => removeExam(exam.id)} className="text-sand-300 hover:text-clay-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              );
            })}
          </div>

          {/* Add exam */}
          <div className="bg-sand-50 rounded-xl border border-sand-200 p-3 space-y-2">
            <div className="flex gap-2">
              <input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="subject"
                className="flex-1 px-3 py-2 bg-white border border-sand-200 rounded-lg text-sm placeholder:text-sand-400 focus:border-forest-400" />
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                className="px-3 py-2 bg-white border border-sand-200 rounded-lg text-sm focus:border-forest-400" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-xs text-sand-500">stress:</span>
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setNewStress(s)}
                    className={`w-6 h-6 rounded-full text-xs transition-all ${newStress >= s ? 'bg-clay-500 text-white' : 'bg-sand-100 text-sand-500'}`}>
                    {s}
                  </button>
                ))}
              </div>
              <button onClick={addExam} disabled={!newSubject.trim() || !newDate}
                className="bg-forest-600 hover:bg-forest-700 disabled:bg-sand-300 text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
