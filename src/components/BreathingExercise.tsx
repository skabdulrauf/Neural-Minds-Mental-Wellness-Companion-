import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, ChevronRight, Volume2, VolumeX, Sparkles } from 'lucide-react';

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
    id: '478',
    name: '4-7-8 Breathing',
    credit: "Dr. Andrew Weil's technique for acute anxiety & vagus nerve activation",
    phases: [
      { label: 'breathe in', seconds: 4 },
      { label: 'hold', seconds: 7 },
      { label: 'breathe out', seconds: 8 },
    ],
    totalBreaths: 4,
    description: 'The 4s inhale, 7s retention, and 8s extended exhale stimulate your vagus nerve and lower heart rate within 60 seconds.',
  },
  {
    id: 'box',
    name: 'Box Breathing',
    credit: 'Used by Navy SEALs for rapid autonomic stress control',
    phases: [
      { label: 'breathe in', seconds: 4 },
      { label: 'hold', seconds: 4 },
      { label: 'breathe out', seconds: 4 },
      { label: 'hold', seconds: 4 },
    ],
    totalBreaths: 6,
    description: 'Equal 4-second timing stabilizes CO2 levels and calms the sympathetic nervous system.',
  },
  {
    id: 'sigh',
    name: 'Physiological Sigh',
    credit: "Stanford Huberman Lab's fastest real-time stress relief",
    phases: [
      { label: 'inhale (nose)', seconds: 2 },
      { label: 'inhale again', seconds: 1 },
      { label: 'long exhale (mouth)', seconds: 6 },
    ],
    totalBreaths: 4,
    description: 'Double inhale reinflates collapsed lung alveoli; long exhale offloads carbon dioxide rapidly.',
  },
  {
    id: 'coherent',
    name: 'Coherent Resonance',
    credit: 'Heart-rate variability (HRV) synchronization in 5.5s cycles',
    phases: [
      { label: 'breathe in', seconds: 5 },
      { label: 'breathe out', seconds: 5 },
    ],
    totalBreaths: 10,
    description: '6 breaths per minute synchronizes baroreceptors, heart rhythm, and prefrontal cortex.',
  },
];

const AMBIENT_OPTIONS = [
  { id: 'silent', label: 'Silent', emoji: '🔇' },
  { id: 'rain', label: 'Soft Rain', emoji: '🌧️' },
  { id: 'bowl', label: 'Singing Bowl', emoji: '🧘' },
  { id: 'nature', label: 'Forest Wind', emoji: '🌲' },
];

// Synthesize reliable Web Audio backing drone for breathing sessions (zero network failure)
function createBreathingAmbientAudio(id: string): { stop: () => void; setPaused: (p: boolean) => void } | null {
  if (id === 'silent') return null;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new AudioCtx();
    const master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);

    const sources: (AudioBufferSourceNode | OscillatorNode)[] = [];

    if (id === 'bowl') {
      [174, 261.63, 392].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.value = 0.25 / (i + 1);
        osc.connect(g);
        g.connect(master);
        osc.start();
        sources.push(osc);
      });
    } else {
      const bufSize = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < bufSize; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.03 * w) / 1.03;
        data[i] = last * 2.5;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = id === 'rain' ? 'bandpass' : 'lowpass';
      filter.frequency.value = id === 'rain' ? 950 : 480;
      src.connect(filter);
      filter.connect(master);
      src.start();
      sources.push(src);
    }

    return {
      stop: () => {
        sources.forEach(s => { try { s.stop(); } catch {} });
        if (ctx.state !== 'closed') { try { ctx.close(); } catch {} }
      },
      setPaused: (paused: boolean) => {
        if (ctx.state === 'Closed' as any) return;
        if (paused && ctx.state === 'running') ctx.suspend().catch(() => {});
        if (!paused && ctx.state === 'suspended') ctx.resume().catch(() => {});
      },
    };
  } catch {
    return null;
  }
}

export default function BreathingExercise() {
  // Default to index 0 ('478' — 4-7-8 Breathing) so the 4-7-8 SVG visual guide is immediately highlighted
  const [techIdx, setTechIdx] = useState(0);
  const [state, setState] = useState<'pick' | 'active' | 'done'>('pick');
  const [playing, setPlaying] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [counter, setCounter] = useState(0);
  const [breathCount, setBreathCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [ambient, setAmbient] = useState('silent');
  const [beforeMood, setBeforeMood] = useState<number | null>(3);
  const [afterMood, setAfterMood] = useState<number | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ambientSynthRef = useRef<{ stop: () => void; setPaused: (p: boolean) => void } | null>(null);
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
      if (ambientSynthRef.current) ambientSynthRef.current.stop();
    };
  }, []);

  const stopAmbient = useCallback(() => {
    if (ambientSynthRef.current) {
      ambientSynthRef.current.stop();
      ambientSynthRef.current = null;
    }
  }, []);

  const startAmbient = useCallback((id: string) => {
    stopAmbient();
    ambientSynthRef.current = createBreathingAmbientAudio(id);
  }, [stopAmbient]);

  const tickSecond = useCallback(() => {
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
  }, [tech, stopAmbient]);

  const startSession = (overrideTechIdx?: number) => {
    const activeTech = overrideTechIdx !== undefined ? TECHNIQUES[overrideTechIdx] : tech;
    if (overrideTechIdx !== undefined) setTechIdx(overrideTechIdx);
    if (beforeMood === null) setBeforeMood(3);
    if (intervalRef.current) clearInterval(intervalRef.current);

    setState('active');
    phaseRef.current = 0;
    countRef.current = activeTech.phases[0].seconds;
    breathRef.current = 1;
    elapsedRef.current = 0;
    setPhaseIdx(0);
    setCounter(activeTech.phases[0].seconds);
    setBreathCount(1);
    setElapsed(0);
    setPlaying(true);
    if (ambient !== 'silent') startAmbient(ambient);

    intervalRef.current = setInterval(tickSecond, 1000);
  };

  // Manual phase jump when user clicks an SVG phase arc or pill
  const jumpToPhase = (targetPhaseIdx: number) => {
    if (state !== 'active') return;
    phaseRef.current = targetPhaseIdx;
    countRef.current = tech.phases[targetPhaseIdx].seconds;
    setPhaseIdx(targetPhaseIdx);
    setCounter(countRef.current);
  };

  const togglePause = () => {
    if (playing) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      setPlaying(false);
      ambientSynthRef.current?.setPaused(true);
    } else {
      setPlaying(true);
      ambientSynthRef.current?.setPaused(false);
      intervalRef.current = setInterval(tickSecond, 1000);
    }
  };

  const reset = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    stopAmbient();
    setPlaying(false);
    setState('pick');
    setAfterMood(null);
    setBreathCount(0);
    setElapsed(0);
  };

  // Animation parameters synchronized with current phase
  const currentPhase = state === 'active' ? tech.phases[phaseIdx] : tech.phases[0];
  const labelLower = currentPhase?.label.toLowerCase() || '';
  const isInhale = labelLower.includes('in');
  const isExhale = labelLower.includes('out') || labelLower.includes('exhale');
  const isHold = labelLower.includes('hold');

  // Target scale for the interactive SVG lotus & lungs geometry
  const targetScale = state !== 'active' ? 1 : isInhale ? 1.38 : isExhale ? 0.78 : 1.38;
  const phaseDuration = currentPhase ? currentPhase.seconds : 4;
  const phaseProgress = currentPhase
    ? Math.max(0, Math.min(1, (currentPhase.seconds - counter) / Math.max(1, currentPhase.seconds)))
    : 0;

  // SVG Ring geometry
  const RING_RADIUS = 114;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const totalCycleSeconds = tech.phases.reduce((acc, p) => acc + p.seconds, 0);

  // Compute elapsed seconds inside the current breath cycle for the master SVG ring progress
  const previousPhasesSeconds = tech.phases
    .slice(0, phaseIdx)
    .reduce((acc, p) => acc + p.seconds, 0);
  const currentPhaseElapsed = currentPhase ? currentPhase.seconds - counter : 0;
  const cycleFraction = Math.min(
    1,
    Math.max(0, (previousPhasesSeconds + currentPhaseElapsed) / Math.max(1, totalCycleSeconds))
  );

  const MOODS = [{ v: 1, e: '😣' }, { v: 2, e: '😔' }, { v: 3, e: '😐' }, { v: 4, e: '🙂' }, { v: 5, e: '😌' }];

  // ─── TECHNIQUE PICKER WITH INTERACTIVE SVG PREVIEW ───
  if (state === 'pick') {
    return (
      <div className="h-full overflow-y-auto p-5 pb-24 md:pb-8 max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-forest-700 bg-forest-50 border border-forest-200 px-3 py-1 rounded-full mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Interactive SVG Somatic Pacer
          </span>
          <h2 className="font-serif text-2xl md:text-3xl text-forest-900 mb-1">Somatic Breathing Guide</h2>
          <p className="text-sand-500 text-sm">
            Synchronize your breath with the expanding &amp; contracting lotus geometry
          </p>
        </motion.div>

        {/* Quick-launch 4-7-8 Interactive SVG Visual Banner */}
        <div className="bg-gradient-to-br from-forest-900 via-forest-800 to-forest-950 text-white rounded-3xl p-5 mb-6 shadow-xl border border-forest-700/60 flex flex-col sm:flex-row items-center gap-5">
          <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <defs>
                <radialGradient id="previewLotusGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.9" />
                  <stop offset="70%" stopColor="#34d399" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.1" />
                </radialGradient>
              </defs>
              <circle cx="100" cy="100" r="86" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="4" strokeDasharray="6 6" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
                <ellipse
                  key={deg}
                  cx="100"
                  cy="68"
                  rx="20"
                  ry="38"
                  fill="url(#previewLotusGrad)"
                  transform={`rotate(${deg} 100 100)`}
                />
              ))}
              <circle cx="100" cy="100" r="26" fill="#ecfdf5" fillOpacity="0.9" />
              <text x="100" y="104" textAnchor="middle" className="fill-forest-900 font-serif text-sm font-bold">
                4-7-8
              </text>
            </svg>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-forest-300">Featured Visual Guide</span>
              <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full">19s cycle</span>
            </div>
            <h3 className="font-serif text-xl text-white mb-1">4-7-8 Vagus Nerve Reset</h3>
            <p className="text-xs text-forest-200 leading-relaxed mb-3">
              Inhale 4s • Hold 7s • Exhale 8s. Watch the multi-petal SVG lotus expand, lock in resonance during retention, and contract smoothly on your exhale.
            </p>
            <button
              type="button"
              onClick={() => startSession(0)}
              className="inline-flex items-center gap-2 bg-white text-forest-900 hover:bg-forest-50 px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-forest-900" /> Launch 4-7-8 SVG Guide Now
            </button>
          </div>
        </div>

        {/* All Techniques */}
        <div className="space-y-2.5 mb-6">
          {TECHNIQUES.map((t, i) => (
            <motion.button
              key={t.id}
              type="button"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setTechIdx(i)}
              className={`w-full text-left p-4 rounded-2xl border transition-all active:scale-[0.99] ${
                techIdx === i
                  ? 'bg-forest-50/90 border-forest-400 shadow-sm ring-2 ring-forest-500/15'
                  : 'bg-white border-sand-200 hover:border-forest-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-forest-900 text-sm">{t.name}</p>
                <span className="text-[11px] font-medium text-forest-700 bg-forest-100/80 px-2.5 py-0.5 rounded-full">
                  {t.totalBreaths} cycles
                </span>
              </div>
              <p className="text-xs text-sand-500 mt-0.5">{t.credit}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {t.phases.map((p, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] bg-white border border-forest-200/80 text-forest-800 px-2.5 py-0.5 rounded-lg font-medium"
                  >
                    {p.label}: <strong>{p.seconds}s</strong>
                  </span>
                ))}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Synthesized Ambient Sound Backing */}
        <div className="mb-5">
          <p className="text-xs text-sand-600 font-medium mb-2">Acoustic Backing Sound (Web Audio Synth)</p>
          <div className="grid grid-cols-4 gap-2">
            {AMBIENT_OPTIONS.map(o => (
              <button
                key={o.id}
                type="button"
                onClick={() => setAmbient(o.id)}
                className={`py-2.5 px-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                  ambient === o.id
                    ? 'bg-forest-600 text-white shadow-xs'
                    : 'bg-white text-sand-700 border border-sand-200 hover:border-forest-200'
                }`}
              >
                <span>{o.emoji}</span>
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Before mood check-in */}
        <div className="bg-warm-50/80 rounded-2xl border border-warm-200 p-4 mb-5">
          <p className="text-xs font-medium text-forest-800 mb-2.5">How does your nervous system feel right now?</p>
          <div className="flex justify-between">
            {MOODS.map(m => (
              <button
                key={m.v}
                type="button"
                onClick={() => setBeforeMood(m.v)}
                className={`text-2xl py-1.5 px-3.5 rounded-xl transition-all ${
                  beforeMood === m.v ? 'bg-white shadow-sm scale-110 ring-2 ring-forest-400/40' : 'opacity-60 hover:opacity-100'
                }`}
              >
                {m.e}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => startSession()}
          className="w-full bg-forest-600 hover:bg-forest-700 text-white py-3.5 rounded-2xl font-semibold transition-all shadow-lg shadow-forest-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" /> Begin {tech.name} Guide
        </button>
      </div>
    );
  }

  // ─── ACTIVE INTERACTIVE SVG BREATHING GUIDE ───
  if (state === 'active') {
    const phaseTheme = isInhale
      ? {
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          stroke: '#10b981',
          glow: 'rgba(16, 185, 129, 0.28)',
          subtext: 'Expand your ribs & belly slowly through your nose',
        }
      : isHold
        ? {
            badge: 'bg-amber-100 text-amber-800 border-amber-300',
            stroke: '#f59e0b',
            glow: 'rgba(245, 158, 11, 0.25)',
            subtext: 'Hold gently — let oxygen saturate and soften your shoulders',
          }
        : {
            badge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
            stroke: '#6366f1',
            glow: 'rgba(99, 102, 241, 0.25)',
            subtext: 'Release a long, slow stream of air through pursed lips',
          };

    return (
      <div className="h-full overflow-y-auto flex flex-col items-center justify-between p-4 md:p-6 pb-24 md:pb-6 max-w-lg mx-auto">
        {/* Top status header */}
        <div className="w-full flex items-center justify-between gap-2">
          <div>
            <h3 className="font-serif text-lg text-forest-900">{tech.name}</h3>
            <p className="text-xs text-sand-500">
              Cycle <strong className="text-forest-700">{Math.min(breathCount, tech.totalBreaths)}</strong> of {tech.totalBreaths} •{' '}
              {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')} elapsed
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {TECHNIQUES.map((t, idx) => (
              <button
                key={t.id}
                type="button"
                onClick={() => startSession(idx)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  techIdx === idx
                    ? 'bg-forest-600 text-white'
                    : 'bg-sand-100 text-sand-600 hover:bg-sand-200'
                }`}
              >
                {t.id === '478' ? '4-7-8' : t.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Phase Pills (click any phase to sync/test immediately) */}
        <div className="flex items-center justify-center gap-2 my-2 flex-wrap">
          {tech.phases.map((p, idx) => {
            const active = idx === phaseIdx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => jumpToPhase(idx)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  active
                    ? `${phaseTheme.badge} shadow-xs scale-105`
                    : 'bg-white border-sand-200 text-sand-500 hover:border-forest-200'
                }`}
              >
                {p.label} ({p.seconds}s)
              </button>
            );
          })}
        </div>

        {/* ─── INTERACTIVE SVG VISUAL BREATHING GUIDE ─── */}
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center my-1 select-none">
          <svg
            viewBox="0 0 280 280"
            className="w-full h-full overflow-visible"
            role="img"
            aria-label={`${tech.name} interactive breathing guide — ${currentPhase?.label} ${counter} seconds remaining`}
          >
            <defs>
              <radialGradient id="breathCoreGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={isInhale ? '#d1fae5' : isHold ? '#fef3c7' : '#e0e7ff'} stopOpacity="0.95" />
                <stop offset="65%" stopColor={phaseTheme.stroke} stopOpacity="0.35" />
                <stop offset="100%" stopColor={phaseTheme.stroke} stopOpacity="0.05" />
              </radialGradient>

              <linearGradient id="petalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={isInhale ? '#34d399' : isHold ? '#fbbf24' : '#818cf8'} stopOpacity="0.55" />
                <stop offset="100%" stopColor="#255644" stopOpacity="0.2" />
              </linearGradient>

              <filter id="softGlow" x="-25%" y="-25%" width="150%" height="150%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Outer ambient aura ring */}
            <motion.circle
              cx="140"
              cy="140"
              r="126"
              fill="none"
              stroke={phaseTheme.stroke}
              strokeOpacity="0.18"
              strokeWidth="1.5"
              strokeDasharray="4 8"
              animate={{
                scale: isInhale ? 1.08 : isExhale ? 0.94 : 1.05,
                rotate: isHold ? 45 : isInhale ? 20 : -20,
              }}
              transition={{ duration: phaseDuration, ease: 'easeInOut' }}
              style={{ transformOrigin: '140px 140px' }}
            />

            {/* Background track circle for 4-7-8 / cycle progress */}
            <circle
              cx="140"
              cy="140"
              r={RING_RADIUS}
              fill="none"
              stroke="#e7e2d8"
              strokeWidth="7"
            />

            {/* Phase segment markers around the 360° perimeter */}
            {(() => {
              let accum = 0;
              return tech.phases.map((p, i) => {
                const angle = (accum / totalCycleSeconds) * 360 - 90;
                accum += p.seconds;
                const rad = (angle * Math.PI) / 180;
                const x = 140 + RING_RADIUS * Math.cos(rad);
                const y = 140 + RING_RADIUS * Math.sin(rad);
                return (
                  <g key={i}>
                    <circle
                      cx={x}
                      cy={y}
                      r="5"
                      fill={i === phaseIdx ? phaseTheme.stroke : '#ffffff'}
                      stroke="#255644"
                      strokeWidth="2"
                    />
                  </g>
                );
              });
            })()}

            {/* Animated SVG Cycle Progress Arc */}
            <motion.circle
              cx="140"
              cy="140"
              r={RING_RADIUS}
              fill="none"
              stroke={phaseTheme.stroke}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              animate={{
                strokeDashoffset: RING_CIRCUMFERENCE * (1 - cycleFraction),
              }}
              transition={{ duration: 0.85, ease: 'linear' }}
              transform="rotate(-90 140 140)"
              filter="url(#softGlow)"
            />

            {/* Expanding & Contracting 8-Petal Sacred Lotus + Diaphragm Geometry */}
            <motion.g
              animate={{
                scale: targetScale,
                rotate: isInhale ? 15 : isHold ? 15 : 0,
              }}
              transition={{
                duration: phaseDuration,
                ease: isHold ? 'linear' : 'easeInOut',
              }}
              style={{ transformOrigin: '140px 140px' }}
            >
              {/* Soft expanding halo */}
              <circle cx="140" cy="140" r="68" fill="url(#breathCoreGrad)" />

              {/* 8 Sacred Lotus Petals that open on Inhale, hold on Retention, fold gently on Exhale */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <g key={angle} transform={`rotate(${angle} 140 140)`}>
                  <path
                    d="M 140 140 C 122 108, 124 76, 140 60 C 156 76, 158 108, 140 140 Z"
                    fill="url(#petalGrad)"
                    stroke={phaseTheme.stroke}
                    strokeWidth="1.2"
                    strokeOpacity="0.65"
                  />
                </g>
              ))}

              {/* Secondary inner 8 petals offset by 22.5 deg */}
              {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle) => (
                <g key={angle} transform={`rotate(${angle} 140 140)`}>
                  <path
                    d="M 140 140 C 128 116, 130 90, 140 76 C 150 90, 152 116, 140 140 Z"
                    fill={phaseTheme.stroke}
                    fillOpacity="0.18"
                    stroke="#ffffff"
                    strokeWidth="0.9"
                    strokeOpacity="0.7"
                  />
                </g>
              ))}

              {/* Inner diaphragm resonance ring */}
              <circle
                cx="140"
                cy="140"
                r="46"
                fill="#ffffff"
                fillOpacity="0.88"
                stroke={phaseTheme.stroke}
                strokeWidth="2.5"
              />
            </motion.g>

            {/* Center readout (remains crisp and legible while lotus expands/contracts around it) */}
            <g>
              <text
                x="140"
                y="122"
                textAnchor="middle"
                className="fill-forest-800 text-[13px] font-semibold uppercase tracking-widest"
              >
                {currentPhase?.label}
              </text>
              <text
                x="140"
                y="158"
                textAnchor="middle"
                className="fill-forest-950 font-serif text-4xl font-bold"
              >
                {counter}s
              </text>
              <text
                x="140"
                y="175"
                textAnchor="middle"
                className="fill-sand-500 text-[10px] font-medium"
              >
                {Math.round(phaseProgress * 100)}% of phase
              </text>
            </g>
          </svg>
        </div>

        {/* Somatic guidance instruction */}
        <p className="text-xs text-forest-800 text-center max-w-xs font-medium bg-white/80 border border-sand-200 px-4 py-2 rounded-xl shadow-2xs my-2">
          {phaseTheme.subtext}
        </p>

        {/* Playback & Audio Controls */}
        <div className="flex items-center gap-4 mt-1">
          <button
            type="button"
            onClick={() => {
              const next = ambient === 'silent' ? 'rain' : 'silent';
              setAmbient(next);
              if (next === 'silent') stopAmbient();
              else if (playing) startAmbient(next);
            }}
            className="w-11 h-11 rounded-full bg-white border border-sand-200 hover:border-forest-300 text-forest-700 flex items-center justify-center shadow-xs transition-all"
            title={ambient === 'silent' ? 'Enable ambient rain sound' : 'Mute ambient sound'}
          >
            {ambient === 'silent' ? <VolumeX className="w-4 h-4 text-sand-400" /> : <Volume2 className="w-4 h-4 text-forest-600" />}
          </button>

          <button
            type="button"
            onClick={togglePause}
            className="w-16 h-16 rounded-full bg-forest-600 hover:bg-forest-700 text-white flex items-center justify-center shadow-xl shadow-forest-600/25 transition-all active:scale-95"
            aria-label={playing ? 'Pause breathing guide' : 'Resume breathing guide'}
          >
            {playing ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={reset}
            className="w-11 h-11 rounded-full bg-white border border-sand-200 hover:border-forest-300 text-sand-600 flex items-center justify-center shadow-xs transition-all"
            title="Reset session"
          >
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
        <h3 className="font-serif text-2xl text-forest-900 mb-1">Session Complete</h3>
        <p className="text-sand-500 text-sm mb-2">
          {tech.name} • {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}
        </p>
        <p className="text-xs text-forest-600 mb-6">{tech.description}</p>

        {afterMood === null ? (
          <div className="bg-warm-50 rounded-2xl border border-warm-200 p-4 mb-6">
            <p className="text-sm text-forest-800 mb-3">How does your nervous system feel now?</p>
            <div className="flex justify-between">
              {MOODS.map(m => (
                <button
                  key={m.v}
                  type="button"
                  onClick={() => setAfterMood(m.v)}
                  className="text-2xl py-1 px-3 rounded-xl opacity-60 hover:opacity-100 hover:scale-110 transition-all"
                >
                  {m.e}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-forest-50 rounded-2xl border border-forest-200 p-4 mb-6">
            <p className="text-sm text-forest-800">
              Before: {MOODS.find(m => m.v === beforeMood)?.e} → After: {MOODS.find(m => m.v === afterMood)?.e}
              {afterMood! > (beforeMood || 3)
                ? ' — your parasympathetic system shifted into calm ✨'
                : afterMood === beforeMood
                  ? ' — steady and grounded'
                  : " — that's okay. gentle regulation builds over time 💙"}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={reset}
          className="w-full bg-forest-600 hover:bg-forest-700 text-white py-3 rounded-2xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          <ChevronRight className="w-4 h-4" /> Explore Another Technique
        </button>
      </motion.div>
    </div>
  );
}
