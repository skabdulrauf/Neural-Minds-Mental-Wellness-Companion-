import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Play, Check, RotateCcw } from 'lucide-react';

interface MomentDef {
  id: string;
  emoji: string;
  title: string;
  duration: number; // seconds
  instruction: string;
  hasInput?: boolean;
  inputPrompt?: string;
  hasTimer?: boolean;
  hasBreathing?: boolean;
  hasBodyScan?: boolean;
  completionMsg: string;
}

const MOMENTS: MomentDef[] = [
  {
    id: 'breath3', emoji: '🫁', title: 'The 3 Breath Reset', duration: 60,
    instruction: 'take 3 slow deep breaths right now.\nthat\'s it. that\'s the whole exercise.',
    hasBreathing: true,
    completionMsg: '3 breaths. your nervous system just thanked you.',
  },
  {
    id: 'observe', emoji: '👁️', title: 'The 60 Second Observation', duration: 60,
    instruction: 'look around. find something beautiful you\'ve never really noticed before.\nstare at it for 60 seconds.',
    hasTimer: true,
    completionMsg: 'did you see something new? beauty is everywhere when you slow down.',
  },
  {
    id: 'onesentence', emoji: '✍️', title: 'The One Sentence Journal', duration: 120,
    instruction: 'finish this sentence:',
    inputPrompt: 'right now i feel ___ because ___',
    hasInput: true,
    completionMsg: 'one sentence. that\'s all it takes to check in with yourself.',
  },
  {
    id: 'micrograt', emoji: '🙏', title: 'The Micro Gratitude', duration: 60,
    instruction: 'name one tiny good thing from the last 24 hours.\ndoesn\'t have to be big.',
    inputPrompt: 'i\'m grateful for...',
    hasInput: true,
    completionMsg: 'that tiny thing? it matters more than you think.',
  },
  {
    id: 'bodyscan', emoji: '💪', title: 'The Body Check', duration: 120,
    instruction: 'scan your body right now.\nwhere are you holding tension?\nshoulders? jaw? chest?\ntake a breath and consciously release it.',
    hasBodyScan: true,
    completionMsg: 'tension noticed is tension halfway released.',
  },
  {
    id: 'detox', emoji: '📱', title: 'The Digital Detox Moment', duration: 180,
    instruction: 'put your phone face down for 3 minutes.\ncome back when the timer ends.',
    hasTimer: true,
    completionMsg: 'welcome back. how did that feel?',
  },
];

interface MomentLog {
  date: string;
  momentId: string;
  timestamp: number;
}

interface MomentsData {
  logs: MomentLog[];
  streak: number;
  lastDate: string;
}

function loadData(): MomentsData {
  try { const r = localStorage.getItem('nm_moments'); return r ? JSON.parse(r) : { logs: [], streak: 0, lastDate: '' }; } catch { return { logs: [], streak: 0, lastDate: '' }; }
}
function saveData(data: MomentsData) { localStorage.setItem('nm_moments', JSON.stringify(data)); }

function getCurrentMoment(): MomentDef {
  // Rotate based on 4-hour blocks
  const block = Math.floor(Date.now() / (4 * 3600000));
  return MOMENTS[block % MOMENTS.length];
}

export default function MindfulMoments() {
  const [data, setData] = useState<MomentsData>(loadData);
  const [phase, setPhase] = useState<'home' | 'active' | 'done'>('home');
  const [activeMoment, setActiveMoment] = useState<MomentDef>(getCurrentMoment);
  const [timeLeft, setTimeLeft] = useState(0);
  const [_running, setRunning] = useState(false);
  const [inputText, setInputText] = useState('');
  const [breathPhase, setBreathPhase] = useState<'in' | 'out'>('in');
  const [breathCount, setBreathCount] = useState(0);
  const [tappedAreas, setTappedAreas] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breathRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); if (breathRef.current) clearInterval(breathRef.current); }; }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayDone = data.logs.some(l => l.date === today && l.momentId === activeMoment.id);
  const totalMinutes = Math.round(data.logs.length * 1.5); // avg ~1.5 min per moment

  // Constellation data — map logs to star positions
  const stars = useMemo(() => {
    return data.logs.slice(-50).map((_, i) => ({
      x: 10 + (i * 37 + i * i * 7) % 80,
      y: 10 + (i * 23 + i * i * 11) % 80,
    }));
  }, [data.logs]);

  const startMoment = () => {
    setPhase('active');
    setInputText('');
    setTappedAreas([]);
    setBreathCount(0);
    setBreathPhase('in');

    if (activeMoment.hasTimer || activeMoment.id === 'detox') {
      setTimeLeft(activeMoment.duration);
      setRunning(true);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setRunning(false);
            completeMoment();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    if (activeMoment.hasBreathing) {
      setBreathPhase('in');
      let count = 0;
      let phase: 'in' | 'out' = 'in';
      breathRef.current = setInterval(() => {
        phase = phase === 'in' ? 'out' : 'in';
        setBreathPhase(phase);
        if (phase === 'in') {
          count++;
          setBreathCount(count);
          if (count >= 3) {
            if (breathRef.current) clearInterval(breathRef.current);
            setTimeout(() => completeMoment(), 1500);
          }
        }
      }, 4000); // 4 seconds per phase
    }
  };

  const completeMoment = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (breathRef.current) { clearInterval(breathRef.current); breathRef.current = null; }
    setRunning(false);
    setPhase('done');

    // Save log
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let streak = data.streak;
    if (data.lastDate === today) { /* already counted */ }
    else if (data.lastDate === yesterday) streak++;
    else if (data.lastDate !== today) streak = 1;

    const updated: MomentsData = {
      logs: [...data.logs, { date: today, momentId: activeMoment.id, timestamp: Date.now() }].slice(-200),
      streak, lastDate: today,
    };
    setData(updated);
    saveData(updated);
  };

  const submitInput = () => {
    if (!inputText.trim()) return;
    completeMoment();
  };

  const reset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (breathRef.current) clearInterval(breathRef.current);
    setPhase('home');
    setRunning(false);
    setActiveMoment(getCurrentMoment());
  };

  const BODY_AREAS = ['head', 'shoulders', 'chest', 'stomach', 'hands', 'legs'];

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ─── HOME ───
  if (phase === 'home') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-5">
            <h2 className="font-serif text-2xl text-forest-900 mb-1">Mindful Moments</h2>
            <p className="text-sand-500 text-sm">
              {data.logs.length > 0
                ? `${data.logs.length} moments completed • ${totalMinutes} min invested in yourself`
                : 'under 3 minutes. that\'s all it takes.'}
            </p>
            {data.streak > 1 && <p className="text-xs text-warm-600 font-medium mt-1">⚡ {data.streak} day streak</p>}
          </motion.div>

          {/* Constellation */}
          {stars.length > 0 && (
            <div className="bg-gradient-to-b from-forest-950 to-forest-800 rounded-2xl p-4 mb-5 relative overflow-hidden" style={{ height: 160 }}>
              {stars.map((star, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 0.8, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="absolute w-1.5 h-1.5 bg-warm-300 rounded-full"
                  style={{ left: `${star.x}%`, top: `${star.y}%`, boxShadow: '0 0 4px 1px rgba(237,201,142,0.4)' }}
                />
              ))}
              {/* Connect nearby stars with faint lines */}
              <svg className="absolute inset-0 w-full h-full">
                {stars.slice(0, -1).map((star, i) => {
                  const next = stars[i + 1];
                  if (!next) return null;
                  const dx = Math.abs(star.x - next.x);
                  const dy = Math.abs(star.y - next.y);
                  if (dx + dy > 30) return null;
                  return <line key={i} x1={`${star.x}%`} y1={`${star.y}%`} x2={`${next.x}%`} y2={`${next.y}%`} stroke="rgba(237,201,142,0.15)" strokeWidth="1" />;
                })}
              </svg>
              <p className="absolute bottom-2 right-3 text-[10px] text-forest-400">your constellation</p>
            </div>
          )}

          {/* Current moment card */}
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-sand-200 p-6 text-center mb-4">
            <span className="text-4xl mb-3 block">{activeMoment.emoji}</span>
            <h3 className="font-serif text-xl text-forest-900 mb-1">{activeMoment.title}</h3>
            <p className="text-xs text-sand-500 mb-4">{Math.ceil(activeMoment.duration / 60)} minute{activeMoment.duration > 60 ? 's' : ''}</p>
            
            {todayDone ? (
              <div className="flex items-center justify-center gap-2 text-forest-600 text-sm font-medium">
                <Check className="w-4 h-4" /> done today ✨
              </div>
            ) : (
              <button onClick={startMoment}
                className="bg-forest-600 hover:bg-forest-700 text-white px-8 py-3 rounded-2xl font-medium flex items-center gap-2 mx-auto transition-all active:scale-95">
                <Play className="w-5 h-5" /> start moment
              </button>
            )}
          </motion.div>

          {/* All moments preview */}
          <p className="text-[10px] text-sand-500 font-medium uppercase tracking-wider mb-2">all moments</p>
          <div className="grid grid-cols-3 gap-2">
            {MOMENTS.map(m => {
              const done = data.logs.some(l => l.date === today && l.momentId === m.id);
              return (
                <button key={m.id} onClick={() => { setActiveMoment(m); if (!done) setPhase('home'); }}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    done ? 'bg-forest-50 border-forest-200' : 'bg-white border-sand-200 hover:border-forest-200'
                  } ${activeMoment.id === m.id ? 'ring-2 ring-forest-300' : ''}`}>
                  <span className="text-xl block mb-1">{m.emoji}</span>
                  <p className="text-[10px] text-forest-900 leading-tight">{m.title.split(' ').slice(1).join(' ')}</p>
                  {done && <Check className="w-3 h-3 text-forest-500 mx-auto mt-1" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ─── ACTIVE ───
  if (phase === 'active') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 pb-24 md:pb-6 max-w-sm mx-auto">
        <span className="text-4xl mb-4">{activeMoment.emoji}</span>
        <p className="text-xs text-sand-500 mb-6">{activeMoment.title}</p>

        {/* Instruction */}
        <p className="text-forest-900 text-center leading-relaxed mb-6 whitespace-pre-wrap">{activeMoment.instruction}</p>

        {/* Breathing circle */}
        {activeMoment.hasBreathing && (
          <div className="mb-6">
            <motion.div
              animate={{ scale: breathPhase === 'in' ? 1.3 : 1 }}
              transition={{ duration: 4, ease: 'easeInOut' }}
              className="w-32 h-32 rounded-full bg-gradient-to-br from-forest-200 to-forest-300 flex items-center justify-center mx-auto shadow-lg">
              <div className="text-center">
                <p className="text-forest-800 font-handwritten text-lg">{breathPhase === 'in' ? 'breathe in' : 'breathe out'}</p>
                <p className="text-forest-700 text-xs mt-1">{breathCount}/3</p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Timer */}
        {activeMoment.hasTimer && (
          <div className="mb-6 text-center">
            <p className="font-serif text-5xl text-forest-900">{fmtTime(timeLeft)}</p>
            <p className="text-xs text-sand-500 mt-1">stay present</p>
          </div>
        )}

        {/* Input */}
        {activeMoment.hasInput && (
          <div className="w-full mb-6">
            <p className="text-sm text-sand-500 italic mb-2">{activeMoment.inputPrompt}</p>
            <div className="flex gap-2">
              <input value={inputText} onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && inputText.trim()) submitInput(); }}
                autoFocus placeholder="..."
                className="flex-1 px-4 py-3 bg-white border border-sand-200 rounded-xl text-sm text-forest-900 placeholder:text-sand-400 focus:border-forest-400" />
              <button onClick={submitInput} disabled={!inputText.trim()}
                className="bg-forest-600 hover:bg-forest-700 disabled:bg-sand-300 text-white px-4 rounded-xl transition-colors">
                <Check className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Body scan */}
        {activeMoment.hasBodyScan && (
          <div className="w-full mb-6">
            <p className="text-sm text-sand-500 mb-3 text-center">tap where you feel tension:</p>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {BODY_AREAS.map(area => (
                <button key={area} onClick={() => {
                  setTappedAreas(prev => prev.includes(area) ? prev : [...prev, area]);
                }}
                  className={`px-3 py-2 rounded-full text-xs font-medium transition-all ${
                    tappedAreas.includes(area) ? 'bg-clay-500 text-white' : 'bg-sand-100 text-sand-600 hover:bg-sand-200'
                  }`}>
                  {area}
                </button>
              ))}
            </div>
            {tappedAreas.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="text-sm text-forest-800 text-center mb-3">
                  breathe into your {tappedAreas.join(' and ')}. let go.
                </p>
                <button onClick={completeMoment}
                  className="w-full bg-forest-600 hover:bg-forest-700 text-white py-3 rounded-xl font-medium">
                  i released it
                </button>
              </motion.div>
            )}
          </div>
        )}

        {/* Cancel */}
        {!activeMoment.hasInput && !activeMoment.hasBodyScan && !activeMoment.hasBreathing && !activeMoment.hasTimer && (
          <button onClick={completeMoment}
            className="bg-forest-600 hover:bg-forest-700 text-white px-8 py-3 rounded-2xl font-medium">
            done
          </button>
        )}
      </div>
    );
  }

  // ─── DONE ───
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 pb-24 md:pb-6 max-w-sm mx-auto">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 10 }}
          className="w-16 h-16 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-forest-600" />
        </motion.div>
        <h3 className="font-serif text-xl text-forest-900 mb-2">moment complete</h3>
        <p className="text-sand-600 text-sm leading-relaxed mb-6">{activeMoment.completionMsg}</p>
        <p className="text-xs text-forest-600 font-medium mb-6">
          +1 star added to your constellation ✨
        </p>
        <button onClick={reset}
          className="bg-forest-600 hover:bg-forest-700 text-white px-8 py-3 rounded-2xl font-medium flex items-center gap-2 mx-auto transition-all">
          <RotateCcw className="w-4 h-4" /> back to moments
        </button>
      </motion.div>
    </div>
  );
}
