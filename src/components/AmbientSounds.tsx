import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Timer,
  X,
  Sparkles,
  Music,
  Waves,
  Moon,
  Sliders,
  Radio,
  Disc3,
} from 'lucide-react';
import {
  SOUND_CHANNELS,
  SOUNDSCAPE_PRESETS,
  SANCTUARY_MUSIC_TRACKS,
  SanctuaryAudioEngine,
  SoundChannelDef,
  SanctuaryMusicTrack,
} from '../utils/soundEngine';
import SleepStories from './SleepStories';

const TIMER_OPTIONS = [
  { label: '10m', minutes: 10 },
  { label: '20m', minutes: 20 },
  { label: '30m', minutes: 30 },
  { label: '60m', minutes: 60 },
  { label: '∞ Continuous', minutes: 0 },
];

export default function AmbientSounds() {
  const engineRef = useRef<SanctuaryAudioEngine | null>(null);
  if (!engineRef.current && typeof window !== 'undefined') {
    engineRef.current = new SanctuaryAudioEngine();
  }

  const [activeTab, setActiveTab] = useState<'soundscapes' | 'music' | 'stories'>('soundscapes');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'water' | 'nature' | 'hearth' | 'brainwave'>('all');
  const [activeChannels, setActiveChannels] = useState<Record<string, boolean>>({});
  const [volumes, setVolumes] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('nm_sound_volumes');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [masterVolume, setMasterVolume] = useState(0.85);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Music Studio State
  const [activeTrack, setActiveTrack] = useState<SanctuaryMusicTrack | null>(null);
  const [musicVolume, setMusicVolume] = useState(0.75);
  const [musicCategory, setMusicCategory] = useState<'all' | 'piano' | 'lofi' | 'healing' | 'sleep' | 'devotional'>('all');
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);

  // Sleep Timer State
  const [showTimer, setShowTimer] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Real-time Canvas Acoustic Visualizer
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const activeChannelCount = Object.keys(activeChannels).filter((k) => activeChannels[k]).length;
  const isAnythingPlaying = activeChannelCount > 0 || activeTrack !== null;

  useEffect(() => {
    localStorage.setItem('nm_sound_volumes', JSON.stringify(volumes));
  }, [volumes]);

  useEffect(() => {
    return () => {
      engineRef.current?.destroy();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Live Frequency Visualizer Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const freqData = new Uint8Array(64);
    let phase = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const hasLiveAudio = engineRef.current?.getAnalyserData(freqData) && isAnythingPlaying;
      const barCount = 36;
      const gap = 4;
      const barWidth = (w - gap * (barCount - 1)) / barCount;
      phase += 0.045;

      for (let i = 0; i < barCount; i++) {
        let normalized = 0.12;
        if (hasLiveAudio) {
          const val = freqData[i % 32] / 255;
          const wave = Math.sin(phase + i * 0.28) * 0.15 + 0.2;
          normalized = Math.max(0.14, Math.min(0.95, val * 0.75 + wave));
        } else if (isAnythingPlaying) {
          normalized = 0.25 + Math.sin(phase + i * 0.35) * 0.18 + Math.cos(phase * 0.7 - i * 0.2) * 0.12;
        } else {
          normalized = 0.1 + Math.sin(phase * 0.4 + i * 0.25) * 0.04;
        }

        const barHeight = Math.max(4, normalized * (h - 8));
        const x = i * (barWidth + gap);
        const y = (h - barHeight) / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        if (isAnythingPlaying) {
          grad.addColorStop(0, '#34d399');
          grad.addColorStop(0.5, '#10b981');
          grad.addColorStop(1, '#6366f1');
        } else {
          grad.addColorStop(0, 'rgba(148, 163, 184, 0.25)');
          grad.addColorStop(1, 'rgba(148, 163, 184, 0.15)');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isAnythingPlaying]);

  const stopEverything = useCallback(() => {
    engineRef.current?.stopAllChannels();
    engineRef.current?.stopMusicTrack();
    setActiveChannels({});
    setActiveTrack(null);
    setActivePresetId(null);
    setYoutubeVideoId(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeLeft(0);
  }, []);

  const startSleepTimer = useCallback(
    (mins: number) => {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimerMinutes(mins);
      if (mins <= 0) {
        setTimeLeft(0);
        return;
      }
      setTimeLeft(mins * 60);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimeout(() => stopEverything(), 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [stopEverything]
  );

  const toggleChannel = (def: SoundChannelDef) => {
    const engine = engineRef.current;
    if (!engine) return;

    if (activeChannels[def.id]) {
      engine.stopChannel(def.id);
      setActiveChannels((prev) => {
        const next = { ...prev };
        delete next[def.id];
        return next;
      });
      setActivePresetId(null);
    } else {
      const vol = volumes[def.id] ?? 0.65;
      engine.startChannel(def, vol);
      setActiveChannels((prev) => ({ ...prev, [def.id]: true }));
      if (timerMinutes > 0 && !timerRef.current) {
        startSleepTimer(timerMinutes);
      }
    }
  };

  const handleChannelVolume = (id: string, val: number) => {
    setVolumes((prev) => ({ ...prev, [id]: val }));
    const def = SOUND_CHANNELS.find((c) => c.id === id);
    if (!def || !engineRef.current) return;
    if (activeChannels[id]) {
      engineRef.current.startChannel(def, val);
    }
  };

  const applyPreset = (presetId: string, mix: Record<string, number>) => {
    const engine = engineRef.current;
    if (!engine) return;

    if (activePresetId === presetId) {
      engine.stopAllChannels();
      setActiveChannels({});
      setActivePresetId(null);
      return;
    }

    engine.stopAllChannels();
    const nextActive: Record<string, boolean> = {};
    const nextVolumes = { ...volumes };

    for (const [chId, vol] of Object.entries(mix)) {
      const def = SOUND_CHANNELS.find((c) => c.id === chId);
      if (!def) continue;
      nextVolumes[chId] = vol;
      engine.startChannel(def, vol);
      nextActive[chId] = true;
    }

    setVolumes(nextVolumes);
    setActiveChannels(nextActive);
    setActivePresetId(presetId);
    if (timerMinutes > 0 && !timerRef.current) {
      startSleepTimer(timerMinutes);
    }
  };

  const toggleMusicTrack = (track: SanctuaryMusicTrack) => {
    const engine = engineRef.current;
    if (!engine) return;

    if (activeTrack?.id === track.id) {
      engine.stopMusicTrack();
      setActiveTrack(null);
    } else {
      engine.startMusicTrack(track, musicVolume);
      setActiveTrack(track);
      if (timerMinutes > 0 && !timerRef.current) {
        startSleepTimer(timerMinutes);
      }
    }
  };

  const handleMasterVolume = (val: number) => {
    setMasterVolume(val);
    engineRef.current?.setMasterVolume(val);
  };

  const handleMusicVolumeChange = (val: number) => {
    setMusicVolume(val);
    engineRef.current?.setMusicVolume(val);
  };

  const formatCountdown = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const visibleChannels = SOUND_CHANNELS.filter(
    (c) => categoryFilter === 'all' || c.category === categoryFilter
  );

  const visibleTracks = SANCTUARY_MUSIC_TRACKS.filter(
    (t) => musicCategory === 'all' || t.category === musicCategory
  );

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-forest-950 via-slate-950 to-forest-950 text-white">
      <div className="p-4 md:p-6 pb-28 md:pb-10 max-w-5xl mx-auto space-y-5">
        {/* ─── STUDIO HERO CONSOLE & REAL-TIME SPECTRUM VISUALIZER ─── */}
        <div className="rounded-3xl bg-gradient-to-br from-forest-900/90 via-slate-900/95 to-indigo-950/90 border border-white/10 p-5 md:p-6 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 px-3 py-1 rounded-full mb-2">
                <Radio className="w-3.5 h-3.5 animate-pulse" /> Sanctuary Acoustic &amp; Sleep Studio
              </div>
              <h2 className="font-serif text-2xl md:text-3xl text-white">
                Real Nature Recordings, Polyphonic Music &amp; Sleep Sanctuary
              </h2>
              <p className="text-xs md:text-sm text-emerald-100/70 mt-0.5">
                Layer real rain, ocean &amp; forest field recordings with live 432Hz/528Hz harmonic music and narrated bedtime stories.
              </p>
            </div>

            {/* Sleep Timer & Stop All Console */}
            <div className="flex items-center gap-2.5 self-start md:self-center">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTimer(!showTimer)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl border transition-all ${
                    timeLeft > 0
                      ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                      : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
                  }`}
                >
                  <Timer className="w-4 h-4 text-emerald-300" />
                  <span>
                    {timeLeft > 0
                      ? `Fade in ${formatCountdown(timeLeft)}`
                      : timerMinutes > 0
                        ? `${timerMinutes}m Timer`
                        : 'Sleep Timer'}
                  </span>
                </button>

                <AnimatePresence>
                  {showTimer && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="absolute top-11 right-0 bg-slate-900 rounded-2xl shadow-2xl border border-white/15 p-2 z-30 min-w-[145px]"
                    >
                      {TIMER_OPTIONS.map((opt) => (
                        <button
                          key={opt.minutes}
                          type="button"
                          onClick={() => {
                            startSleepTimer(opt.minutes);
                            setShowTimer(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs rounded-xl transition-colors ${
                            timerMinutes === opt.minutes
                              ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                              : 'text-slate-200 hover:bg-white/10'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {isAnythingPlaying && (
                <button
                  type="button"
                  onClick={stopEverything}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 transition-all"
                >
                  <X className="w-4 h-4" />
                  <span>Stop All</span>
                </button>
              )}
            </div>
          </div>

          {/* Live Spectrum Canvas + Master Gain Bar */}
          <div className="bg-black/35 rounded-2xl border border-white/10 p-3.5 flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isAnythingPlaying
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                    : 'bg-white/10 text-slate-400'
                }`}
              >
                {isAnythingPlaying ? <Disc3 className="w-5 h-5 animate-spin" /> : <Waves className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {activeTrack
                    ? `Playing: ${activeTrack.title}`
                    : activeChannelCount > 0
                      ? `${activeChannelCount} Real Soundscape Layer${activeChannelCount > 1 ? 's' : ''} Active`
                      : 'Ready — Select a soundscape, preset, or music composition'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {activeTrack && activeChannelCount > 0
                    ? `Layered with ${activeChannelCount} ambient nature recording(s)`
                    : activeTrack
                      ? `${activeTrack.artist} • ${activeTrack.frequencyBadge}`
                      : 'Mix nature audio + polyphonic music simultaneously'}
                </p>
              </div>
            </div>

            <div className="flex-1 w-full">
              <canvas ref={canvasRef} width={360} height={42} className="w-full h-10 block" />
            </div>

            {/* Master Volume Slider */}
            <div className="flex items-center gap-2 w-full md:w-44 flex-shrink-0">
              <VolumeX className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={masterVolume}
                onChange={(e) => handleMasterVolume(parseFloat(e.target.value))}
                className="flex-1 h-1.5 accent-emerald-400 cursor-pointer"
                aria-label="Master studio volume"
              />
              <Volume2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
            </div>
          </div>

          {/* 3-Pillar Studio Mode Switcher */}
          <div className="grid grid-cols-3 gap-2 mt-4 bg-black/30 p-1.5 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('soundscapes')}
              className={`py-2.5 px-3 rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'soundscapes'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Real Soundscapes ({activeChannelCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('music')}
              className={`py-2.5 px-3 rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'music'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <Music className="w-4 h-4" />
              <span>Sanctuary Music {activeTrack ? '• Live' : ''}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stories')}
              className={`py-2.5 px-3 rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'stories'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>Sleep Stories</span>
            </button>
          </div>
        </div>

        {/* ─── TAB 1: REAL FIELD RECORDINGS & BINAURAL SOUNDSCAPE MIXER ─── */}
        {activeTab === 'soundscapes' && (
          <div className="space-y-5">
            {/* 1-Click Curated Atmosphere Presets */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>1-Click Curated Atmosphere Mixes</span>
                </div>
                <span className="text-[11px] text-slate-400">Tap any scene to auto-mix multiple real channels</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {SOUNDSCAPE_PRESETS.map((preset) => {
                  const isSelected = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.id, preset.mix)}
                      className={`text-left p-3.5 rounded-2xl border transition-all active:scale-[0.98] ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-400 shadow-lg shadow-emerald-500/10'
                          : 'bg-white/5 hover:bg-white/10 border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-2xl">{preset.emoji}</span>
                        {isSelected && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-white leading-snug">{preset.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{preset.tagline}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'all', label: 'All 12 Channels' },
                { id: 'water', label: '🌧️ Rain, Ocean & Streams' },
                { id: 'nature', label: '🌲 Forest & Night Meadow' },
                { id: 'hearth', label: '🔥 Hearth & Cozy Spaces' },
                { id: 'brainwave', label: '🎧 Singing Bowls & Binaural Waves' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap border transition-all ${
                    categoryFilter === cat.id
                      ? 'bg-white text-slate-950 border-white font-semibold'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* 12 Multi-Track Sound Channels Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {visibleChannels.map((ch) => {
                const isPlaying = Boolean(activeChannels[ch.id]);
                const vol = volumes[ch.id] ?? 0.65;

                return (
                  <motion.div
                    key={ch.id}
                    layout
                    className={`rounded-2xl border p-4 transition-all ${
                      isPlaying
                        ? `bg-gradient-to-br ${ch.accent} shadow-lg`
                        : 'bg-white/[0.04] hover:bg-white/[0.07] border-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleChannel(ch)}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
                          isPlaying
                            ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                        aria-label={isPlaying ? `Mute ${ch.name}` : `Play ${ch.name}`}
                      >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/90">
                            {ch.badge}
                          </span>
                          <span className="text-lg">{ch.emoji}</span>
                        </div>
                        <h3 className="font-semibold text-white text-sm truncate mt-0.5">{ch.name}</h3>
                        <p className="text-[11px] text-slate-300/80 line-clamp-2 mt-0.5">{ch.subtitle}</p>
                      </div>
                    </div>

                    {/* Individual Channel Fader */}
                    <div className="mt-3.5 pt-2.5 border-t border-white/10 flex items-center gap-2.5">
                      <VolumeX className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.02"
                        value={vol}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          handleChannelVolume(ch.id, v);
                          if (!isPlaying && v > 0.05) {
                            toggleChannel(ch);
                          }
                        }}
                        className="flex-1 h-1.5 accent-emerald-400 cursor-pointer"
                        aria-label={`${ch.name} volume`}
                      />
                      <span className="text-[11px] font-mono text-slate-300 w-9 text-right">
                        {Math.round(vol * 100)}%
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── TAB 2: SANCTUARY POLYPHONIC MUSIC & THERAPEUTIC COMPOSITIONS ─── */}
        {activeTab === 'music' && (
          <div className="space-y-5">
            {/* Active Music Player Deck */}
            {activeTrack && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-3xl bg-gradient-to-r ${activeTrack.gradient} border border-emerald-400/30 p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-3xl shadow-inner">
                    {activeTrack.emoji}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-400 text-slate-950 px-2.5 py-0.5 rounded-full">
                        Now Composing &amp; Streaming
                      </span>
                      <span className="text-xs text-emerald-200">{activeTrack.frequencyBadge}</span>
                    </div>
                    <h3 className="font-serif text-xl text-white mt-1">{activeTrack.title}</h3>
                    <p className="text-xs text-slate-300">
                      {activeTrack.artist} • {activeTrack.keySignature} • {activeTrack.bpm} BPM
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <div className="flex items-center gap-2 bg-black/30 px-3 py-2 rounded-xl border border-white/10">
                    <Volume2 className="w-4 h-4 text-emerald-300" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={musicVolume}
                      onChange={(e) => handleMusicVolumeChange(parseFloat(e.target.value))}
                      className="w-24 h-1.5 accent-emerald-400 cursor-pointer"
                      aria-label="Music volume"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleMusicTrack(activeTrack)}
                    className="px-4 py-2.5 rounded-xl bg-white text-slate-950 font-semibold text-xs flex items-center gap-1.5 shadow-md hover:bg-emerald-100 transition-all"
                  >
                    <Pause className="w-4 h-4" /> Pause
                  </button>
                </div>
              </motion.div>
            )}

            {/* Category filter */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'All Compositions' },
                { id: 'piano', label: '🎹 Felt Piano & Acoustic Harp' },
                { id: 'healing', label: '✨ 528Hz Solfeggio Healing' },
                { id: 'lofi', label: '🍵 Late-Night Lo-Fi Study' },
                { id: 'sleep', label: '🌌 Deep Sleep Orchestral' },
                { id: 'devotional', label: '🕉️ Spiritual & Raaga' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setMusicCategory(c.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap border transition-all ${
                    musicCategory === c.id
                      ? 'bg-white text-slate-950 border-white font-semibold'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Music Track Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleTracks.map((track) => {
                const isPlaying = activeTrack?.id === track.id;
                return (
                  <div
                    key={track.id}
                    className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                      isPlaying
                        ? `bg-gradient-to-br ${track.gradient} border-emerald-400 shadow-xl`
                        : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{track.emoji}</span>
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-400/20 px-2 py-0.5 rounded-md">
                              {track.frequencyBadge}
                            </span>
                            <h3 className="font-serif text-lg text-white mt-1 leading-snug">{track.title}</h3>
                            <p className="text-xs text-slate-400">{track.artist}</p>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed mt-2">{track.description}</p>
                      <p className="text-[11px] text-emerald-200/70 font-mono mt-2">
                        {track.keySignature} • {track.bpm} BPM
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleMusicTrack(track)}
                        className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                          isPlaying
                            ? 'bg-emerald-400 text-slate-950 shadow-md'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-4 h-4" />
                            <span>Playing Live Instrumental</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            <span>Play Instrumental Stream</span>
                          </>
                        )}
                      </button>

                      {track.youtubeId && (
                        <button
                          type="button"
                          onClick={() => setYoutubeVideoId(youtubeVideoId === track.youtubeId ? null : track.youtubeId!)}
                          className="py-2.5 px-3 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/15 text-slate-200 border border-white/10"
                        >
                          {youtubeVideoId === track.youtubeId ? 'Hide Video' : 'YouTube Stream'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Optional YouTube Devotional/Long-form Embed */}
            {youtubeVideoId && (
              <div className="rounded-2xl overflow-hidden border border-white/15 bg-black/50">
                <div className="aspect-video w-full">
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0`}
                    title="Sanctuary YouTube Stream"
                    className="w-full h-full"
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: NARRATED SLEEP STORIES (Embedded Directly in the Studio) ─── */}
        {activeTab === 'stories' && (
          <div className="bg-warm-50 text-forest-900 rounded-3xl overflow-hidden border border-white/15 shadow-2xl">
            <SleepStories embedded />
          </div>
        )}
      </div>
    </div>
  );
}
