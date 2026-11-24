import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, ChevronRight } from 'lucide-react';

interface Technique {
  id: string;
  name: string;
  credit: string;
  phases: { label: string; seconds: number }[];
  totalBreaths: number;
  description: string;
}

const TECHNIQUES: Technique[] = [
  {
    id: 'box', name: 'Box Breathing', credit: 'Used by Navy SEALs for stress control',
    phases: [{ label: 'breathe in', seconds: 4 }, { label: 'hold', seconds: 4 }, { label: 'breathe out', seconds: 4 }, { label: 'hold', seconds: 4 }],
    totalBreaths: 6, description: 'Equal timing calms the autonomic nervous system.',
  },
  {
    id: '478', name: '4-7-8 Breathing', credit: "Dr. Andrew Weil's technique for acute anxiety",
    phases: [{ label: 'breathe in', seconds: 4 }, { label: 'hold', seconds: 7 }, { label: 'breathe out', seconds: 8 }],
    totalBreaths: 4, description: 'The extended exhale activates your vagus nerve.',
  },
  {
    id: 'sigh', name: 'Physiological Sigh', credit: "Stanford's fastest stress relief technique",
    phases: [{ label: 'inhale (nose)', seconds: 2 }, { label: 'inhale again', seconds: 1 }, { label: 'long exhale (mouth)', seconds: 6 }],
    totalBreaths: 3, description: 'Double inhale reinflates lung sacs, long exhale slows heart rate.',
  },
  {
    id: 'coherent', name: 'Coherent Breathing', credit: 'Balances the nervous system in 5 minutes',
    phases: [{ label: 'breathe in', seconds: 5 }, { label: 'breathe out', seconds: 5 }],
    totalBreaths: 12, description: '5.5 breaths per minute syncs heart and brain rhythms.',
  },
];

const AMBIENT_OPTIONS = [
  { id: 'silent', label: 'Silent', emoji: '🔇' },
  { id: 'rain', label: 'Rain', emoji: '🌧️', url: 'https://www.soundjay.com/nature/rain-01.mp3' },
  { id: 'bowl', label: 'Bowl', emoji: '🧘', url: 'https://www.soundjay.com/human/sounds/bell-ringing-05.mp3' },
  { id: 'nature', label: 'Forest', emoji: '🌲', url: 'https://www.soundjay.com/nature/birds-in-forest-1.mp3' },
];

export default function BreathingExercise() {
  const [techIdx, setTechIdx] = useState(0);
  const [state, setState] = useState<'pick' | 'active' | 'done'>('pick');
  const [playing, setPlaying] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [counter, setCounter] = useState(0);
  const [breathCount, setBreathCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [ambient, setAmbient] = useState('silent');
  const [beforeMood, setBeforeMood] = useState<number | null>(null);
  const [afterMood, setAfterMood] = useState<number | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const phaseRef = useRef(0);
  const countRef = useRef(0);
  const breathRef = useRef(0);
  const elapsedRef = useRef(0);
  const mountedRef = useRef(true);

  const tech = TECHNIQUES[techIdx];

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      stopAmbient();
    };
  }, []);

  const stopAmbient = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
  }, []);

  const startAmbient = useCallback((id: string) => {
    stopAmbient();
    const opt = AMBIENT_OPTIONS.find(o => o.id === id);
    if (!opt?.url) return;
    try {
      const audio = new Audio(opt.url);
      audio.loop = true;
      audio.volume = 0.3;
      audio.play().catch(() => {});
      audioRef.current = audio;
    } catch {}
  }, [stopAmbient]);

  const startSession = () => {
    if (beforeMood === null) return;
    setState('active');
    phaseRef.current = 0;
    countRef.current = tech.phases[0].seconds;
    breathRef.current = 1;
    elapsedRef.current = 0;
    setPhaseIdx(0);
    setCounter(tech.phases[0].seconds);
    setBreathCount(1);
    setElapsed(0);
    setPlaying(true);
    if (ambient !== 'silent') startAmbient(ambient);

    intervalRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      elapsedRef.current++;
      setElapsed(elapsedRef.current);
      countRef.current--;
      setCounter(countRef.current);

      if (countRef.current <= 0) {
        // Next phase
        let nextPhase = phaseRef.current + 1;
        if (nextPhase >= tech.phases.length) {
          // Completed one breath cycle
          nextPhase = 0;
          breathRef.current++;
          setBreathCount(breathRef.current);
          if (breathRef.current > tech.totalBreaths) {
            // Session complete
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            setPlaying(false);
            setState('done');
            stopAmbient();
            return;
          }
        }
        phaseRef.current = nextPhase;
        countRef.current = tech.phases[nextPhase].seconds;
        setPhaseIdx(nextPhase);
        setCounter(countRef.current);
      }
    }, 1000);
  };

  const togglePause = () => {
    if (playing) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      setPlaying(false);
      if (audioRef.current) audioRef.current.pause();
    } else {
      setPlaying(true);
      if (audioRef.current) audioRef.current.play().catch(() => {});
      intervalRef.current = setInterval(() => {
        if (!mountedRef.current) return;
        elapsedRef.current++;
        setElapsed(elapsedRef.current);
        countRef.current--;
        setCounter(countRef.current);
        if (countRef.current <= 0) {
          let nextPhase = phaseRef.current + 1;
          if (nextPhase >= tech.phases.length) {
            nextPhase = 0;
            breathRef.current++;
            setBreathCount(breathRef.current);
            if (breathRef.current > tech.totalBreaths) {
              if (intervalRef.current) clearInterval(intervalRef.current);
              setPlaying(false);
              setState('done');
              stopAmbient();
              return;
            }
          }
          phaseRef.current = nextPhase;
          countRef.current = tech.phases[nextPhase].seconds;
          setPhaseIdx(nextPhase);
          setCounter(countRef.current);
        }
      }, 1000);
    }
  };

  const reset = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    stopAmbient();
    setPlaying(false);
    setState('pick');
    setBeforeMood(null);
    setAfterMood(null);
    setBreathCount(0);
    setElapsed(0);
  };

  // Circle animation
  const currentPhase = state === 'active' ? tech.phases[phaseIdx] : null;
  const isInhale = currentPhase?.label.includes('in') || false;
  const isExhale = currentPhase?.label.includes('out') || currentPhase?.label.includes('exhale') || false;
  const scale = isInhale ? 1.4 : isExhale ? 1 : (state === 'active' ? 1.4 : 1);
  const dur = currentPhase ? currentPhase.seconds : 0.5;

  const MOODS = [{ v: 1, e: '😣' }, { v: 2, e: '😔' }, { v: 3, e: '😐' }, { v: 4, e: '🙂' }, { v: 5, e: '😌' }];

  // ─── TECHNIQUE PICKER ───
  if (state === 'pick') {
    return (
      <div className="h-full overflow-y-auto p-5 pb-24 md:pb-8 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <h2 className="font-serif text-2xl text-forest-900 mb-1">Breathing</h2>
          <p className="text-sand-500 text-sm">choose a technique that fits right now</p>
        </motion.div>

        <div className="space-y-3 mb-6">
          {TECHNIQUES.map((t, i) => (
            <motion.button key={t.id}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => setTechIdx(i)}
              className={`w-full text-left p-4 rounded-2xl border transition-all active:scale-[0.98] ${
                techIdx === i ? 'bg-forest-50 border-forest-300 shadow-sm' : 'bg-white border-sand-200 hover:border-forest-200'
              }`}>
              <p className="font-medium text-forest-900 text-sm">{t.name}</p>
              <p className="text-xs text-sand-500 mt-0.5">{t.credit}</p>
              <p className="text-xs text-forest-600 mt-1">{t.phases.map(p => `${p.label} ${p.seconds}s`).join(' → ')}</p>
            </motion.button>
          ))}
        </div>

        {/* Ambient sound picker */}
        <div className="mb-6">
          <p className="text-xs text-sand-500 font-medium mb-2">background sound</p>
          <div className="flex gap-2">
            {AMBIENT_OPTIONS.map(o => (
              <button key={o.id} onClick={() => setAmbient(o.id)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                  ambient === o.id ? 'bg-forest-100 text-forest-700 border border-forest-300' : 'bg-sand-50 text-sand-600 border border-sand-200'
                }`}>
                {o.emoji} {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Before mood */}
        <div className="bg-warm-50 rounded-2xl border border-warm-200 p-4 mb-4">
          <p className="text-sm text-forest-800 mb-3">how are you feeling right now?</p>
          <div className="flex justify-between">
            {MOODS.map(m => (
              <button key={m.v} onClick={() => setBeforeMood(m.v)}
                className={`text-2xl py-1 px-3 rounded-xl transition-all ${beforeMood === m.v ? 'bg-white shadow-sm scale-110' : 'opacity-60 hover:opacity-100'}`}>
                {m.e}
              </button>
            ))}
          </div>
        </div>

        <button onClick={startSession} disabled={beforeMood === null}
          className="w-full bg-forest-600 hover:bg-forest-700 disabled:bg-sand-300 text-white py-3.5 rounded-2xl font-medium transition-all active:scale-[0.98] flex items-center justify-center gap-2">
          <Play className="w-5 h-5" /> Begin {tech.name}
        </button>
      </div>
    );
  }

  // ─── ACTIVE SESSION ───
  if (state === 'active') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 pb-24 md:pb-6 max-w-sm mx-auto">
        <p className="text-xs text-sand-500 mb-2">{tech.name}</p>
        <p className="text-xs text-forest-600 font-medium mb-8">breath {Math.min(breathCount, tech.totalBreaths)} of {tech.totalBreaths}</p>

        {/* Breathing circle */}
        <div className="relative mb-8">
          <motion.div
            animate={{ scale }}
            transition={{ duration: dur, ease: 'easeInOut' }}
            className="w-48 h-48 rounded-full bg-gradient-to-br from-forest-200 to-forest-300 flex items-center justify-center shadow-2xl shadow-forest-300/30"
          >
            <motion.div
              animate={{ scale }}
              transition={{ duration: dur, ease: 'easeInOut' }}
              className="w-36 h-36 rounded-full bg-gradient-to-br from-forest-100 to-forest-200 flex items-center justify-center"
            >
              <div className="text-center">
                <AnimatePresence mode="wait">
                  <motion.p key={phaseIdx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="font-handwritten text-xl text-forest-800">
                    {currentPhase?.label}
                  </motion.p>
                </AnimatePresence>
                <p className="font-serif text-4xl text-forest-700 mt-1">{counter}</p>
              </div>
            </motion.div>
          </motion.div>
          <div className="absolute inset-0 rounded-full border-2 border-forest-200/50 animate-breathe pointer-events-none"
            style={{ top: '-8px', left: '-8px', width: 'calc(100% + 16px)', height: 'calc(100% + 16px)' }} />
        </div>

        {/* Timer */}
        <p className="text-xs text-sand-400 mb-6">{Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}</p>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button onClick={togglePause}
            className="w-14 h-14 rounded-full bg-forest-600 hover:bg-forest-700 text-white flex items-center justify-center shadow-lg transition-all active:scale-95">
            {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
          <button onClick={reset}
            className="w-10 h-10 rounded-full bg-sand-100 hover:bg-sand-200 text-sand-600 flex items-center justify-center">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─── COMPLETION ───
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 pb-24 md:pb-6 max-w-sm mx-auto">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center w-full">
        <div className="w-20 h-20 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-5 animate-breathe">
          <span className="text-3xl">🌿</span>
        </div>
        <h3 className="font-serif text-2xl text-forest-900 mb-1">session complete</h3>
        <p className="text-sand-500 text-sm mb-2">{tech.name} • {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}</p>
        <p className="text-xs text-forest-600 mb-6">{tech.description}</p>

        {/* After mood */}
        {afterMood === null ? (
          <div className="bg-warm-50 rounded-2xl border border-warm-200 p-4 mb-6">
            <p className="text-sm text-forest-800 mb-3">how do you feel now?</p>
            <div className="flex justify-between">
              {MOODS.map(m => (
                <button key={m.v} onClick={() => setAfterMood(m.v)}
                  className="text-2xl py-1 px-3 rounded-xl opacity-60 hover:opacity-100 hover:scale-110 transition-all">
                  {m.e}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-forest-50 rounded-2xl border border-forest-200 p-4 mb-6">
            <p className="text-sm text-forest-800">
              before: {MOODS.find(m => m.v === beforeMood)?.e} → after: {MOODS.find(m => m.v === afterMood)?.e}
              {afterMood! > beforeMood! ? ' — nice improvement ✨' : afterMood === beforeMood ? ' — staying steady' : ' — that\'s okay. some sessions take time 💙'}
            </p>
          </div>
        )}

        <button onClick={reset}
          className="w-full bg-forest-600 hover:bg-forest-700 text-white py-3 rounded-2xl font-medium transition-colors flex items-center justify-center gap-2">
          <ChevronRight className="w-4 h-4" /> try another technique
        </button>
      </motion.div>
    </div>
  );
}
