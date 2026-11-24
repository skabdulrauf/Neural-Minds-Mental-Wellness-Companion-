import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Timer, X } from 'lucide-react';

// ─── SOUND DEFINITIONS ───
interface SoundDef {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  type: 'url' | 'whitenoise' | 'binaural';
  url?: string;
}

const SOUNDS: SoundDef[] = [
  { id: 'rain', name: 'Rainfall', emoji: '🌧️', color: 'from-blue-50 to-slate-100', description: 'Gentle rain', type: 'url', url: 'https://www.soundjay.com/nature/rain-01.mp3' },
  { id: 'ocean', name: 'Ocean Waves', emoji: '🌊', color: 'from-cyan-50 to-blue-100', description: 'Beach waves', type: 'url', url: 'https://www.soundjay.com/nature/ocean-wave-1.mp3' },
  { id: 'forest', name: 'Forest Birds', emoji: '🌲', color: 'from-green-50 to-emerald-100', description: 'Birds chirping', type: 'url', url: 'https://www.soundjay.com/nature/birds-in-forest-1.mp3' },
  { id: 'fire', name: 'Fireplace', emoji: '🔥', color: 'from-orange-50 to-red-100', description: 'Crackling fire', type: 'url', url: 'https://www.soundjay.com/nature/fire-burning-1.mp3' },
  { id: 'bowl', name: 'Tibetan Bowl', emoji: '🧘', color: 'from-amber-50 to-yellow-100', description: 'Meditation bell', type: 'url', url: 'https://www.soundjay.com/human/sounds/bell-ringing-05.mp3' },
  { id: 'whitenoise', name: 'White Noise', emoji: '🌬️', color: 'from-gray-50 to-slate-100', description: 'Pure white noise', type: 'whitenoise' },
  { id: 'binaural', name: 'Focus Beats', emoji: '🎵', color: 'from-violet-50 to-purple-100', description: '10Hz alpha binaural', type: 'binaural' },
];

const TIMER_OPTIONS = [
  { label: '5m', minutes: 5 },
  { label: '15m', minutes: 15 },
  { label: '25m', minutes: 25 },
  { label: '45m', minutes: 45 },
  { label: '∞', minutes: 0 },
];

// ─── AUDIO ENGINE ───
interface ActiveSound {
  id: string;
  volume: number;
  // For URL-based sounds
  audio?: HTMLAudioElement;
  // For Web Audio API sounds
  ctx?: AudioContext;
  gainNode?: GainNode;
  sources?: (AudioBufferSourceNode | OscillatorNode)[];
}

function createUrlSound(url: string, volume: number): ActiveSound | null {
  try {
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = volume;
    // Don't set crossOrigin — it breaks some servers that don't send CORS headers
    // HTML5 Audio doesn't need CORS unless we're analyzing it with Web Audio API
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(() => {
        // If play fails (autoplay policy or network), it's handled by the onerror fallback
      });
    }
    return { id: '', volume, audio };
  } catch { return null; }
}

// Fallback: generate nature-like noise via Web Audio API when URLs fail
function createFallbackNoise(type: string, volume: number): ActiveSound | null {
  try {
    const ctx = new AudioContext();
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Different noise textures for different "sounds"
    if (type === 'rain' || type === 'ocean') {
      // Pink noise (rain/ocean-like)
      let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
      for (let i = 0; i < bufferSize; i++) {
        const w = Math.random() * 2 - 1;
        b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
        b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
        b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
        data[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11;
        b6=w*0.115926;
      }
    } else {
      // Brown noise (fire/forest-like)
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.02 * w) / 1.02;
        data[i] = last * 3.5;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = volume * 0.3;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    return { id: '', volume, ctx, gainNode: gain, sources: [source] };
  } catch { return null; }
}

function createWhiteNoise(volume: number): ActiveSound | null {
  try {
    const ctx = new AudioContext();
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = volume * 0.3; // White noise is loud, scale down
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    return { id: '', volume, ctx, gainNode: gain, sources: [source] };
  } catch { return null; }
}

function createBinaural(volume: number): ActiveSound | null {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.value = volume * 0.15; // Binaural should be subtle

    // Left ear: 200Hz
    const oscL = ctx.createOscillator();
    oscL.type = 'sine';
    oscL.frequency.value = 200;
    const panL = ctx.createStereoPanner();
    panL.pan.value = -1;
    oscL.connect(panL);
    panL.connect(gain);

    // Right ear: 210Hz (10Hz diff = alpha waves)
    const oscR = ctx.createOscillator();
    oscR.type = 'sine';
    oscR.frequency.value = 210;
    const panR = ctx.createStereoPanner();
    panR.pan.value = 1;
    oscR.connect(panR);
    panR.connect(gain);

    gain.connect(ctx.destination);
    oscL.start();
    oscR.start();

    return { id: '', volume, ctx, gainNode: gain, sources: [oscL, oscR] };
  } catch { return null; }
}

// ─── COMPONENT ───
export default function AmbientSounds() {
  const [activeSounds, setActiveSounds] = useState<Map<string, ActiveSound>>(new Map());
  const [volumes, setVolumes] = useState<Record<string, number>>(() => {
    try { const s = localStorage.getItem('nm_sound_volumes'); return s ? JSON.parse(s) : {}; } catch { return {}; }
  });
  const [showTimer, setShowTimer] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Stop all sounds on unmount
      activeSounds.forEach(s => stopSingleSound(s));
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Save volumes when they change
  useEffect(() => {
    localStorage.setItem('nm_sound_volumes', JSON.stringify(volumes));
  }, [volumes]);

  const stopSingleSound = useCallback((sound: ActiveSound) => {
    if (sound.audio) {
      sound.audio.pause();
      sound.audio.src = '';
    }
    if (sound.sources) {
      sound.sources.forEach(s => { try { s.stop(); } catch {} });
    }
    if (sound.ctx && sound.ctx.state !== 'closed') {
      try { sound.ctx.close(); } catch {}
    }
  }, []);

  const toggleSound = useCallback((soundDef: SoundDef) => {
    const existing = activeSounds.get(soundDef.id);
    if (existing) {
      // Stop this sound
      stopSingleSound(existing);
      const updated = new Map(activeSounds);
      updated.delete(soundDef.id);
      setActiveSounds(updated);
      return;
    }

    // Start this sound
    const vol = volumes[soundDef.id] ?? 0.5;
    let newSound: ActiveSound | null = null;

    if (soundDef.type === 'url' && soundDef.url) {
      newSound = createUrlSound(soundDef.url, vol);
      // Add error handler — if URL fails to load, fall back to generated noise
      if (newSound?.audio) {
        const audio = newSound.audio;
        const fallbackId = soundDef.id;
        audio.onerror = () => {
          // URL failed — replace with generated noise
          const fallback = createFallbackNoise(fallbackId, vol);
          if (fallback) {
            fallback.id = fallbackId;
            setActiveSounds(prev => { const m = new Map(prev); m.set(fallbackId, fallback); return m; });
          }
        };
      }
    } else if (soundDef.type === 'whitenoise') {
      newSound = createWhiteNoise(vol);
    } else if (soundDef.type === 'binaural') {
      newSound = createBinaural(vol);
    }

    if (newSound) {
      newSound.id = soundDef.id;
      const updated = new Map(activeSounds);
      updated.set(soundDef.id, newSound);
      setActiveSounds(updated);

      // Start timer if set
      if (timerMinutes > 0 && !timerRef.current) {
        startTimer();
      }
    }
  }, [activeSounds, volumes, timerMinutes]);

  const changeVolume = useCallback((soundId: string, vol: number) => {
    setVolumes(prev => ({ ...prev, [soundId]: vol }));
    const sound = activeSounds.get(soundId);
    if (sound) {
      if (sound.audio) sound.audio.volume = vol;
      if (sound.gainNode && sound.ctx) {
        const scale = sound.id === 'whitenoise' ? 0.3 : sound.id === 'binaural' ? 0.15 : 0.6;
        sound.gainNode.gain.setTargetAtTime(vol * scale, sound.ctx.currentTime, 0.05);
      }
    }
  }, [activeSounds]);

  const stopAll = useCallback(() => {
    activeSounds.forEach(s => stopSingleSound(s));
    setActiveSounds(new Map());
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setTimeLeft(0);
  }, [activeSounds, stopSingleSound]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(timerMinutes * 60);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Fade out and stop
          setTimeout(() => stopAll(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [timerMinutes, stopAll]);

  const playingCount = activeSounds.size;
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const [tab, setTab] = useState<'sounds' | 'music'>('sounds');
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  const faithPref = typeof localStorage !== 'undefined' ? localStorage.getItem('nm_faith_religion') : null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <h2 className="font-serif text-2xl text-forest-900 mb-1">Sounds & Music</h2>
          <p className="text-sand-500 text-sm">ambient sounds and music therapy</p>
        </motion.div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-sand-100 p-1 rounded-xl mb-5">
          <button onClick={() => setTab('sounds')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'sounds' ? 'bg-white text-forest-700 shadow-sm' : 'text-sand-600'}`}>
            🔊 Sounds
          </button>
          <button onClick={() => setTab('music')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'music' ? 'bg-white text-forest-700 shadow-sm' : 'text-sand-600'}`}>
            🎵 Music Therapy
          </button>
        </div>

        {tab === 'music' && <MusicTherapy faithPref={faithPref} playingVideo={playingVideo} setPlayingVideo={setPlayingVideo} />}

        {tab === 'sounds' && (<>
        {/* Original sounds content below */}

        {/* Timer + Stop controls */}
        <div className="bg-white rounded-xl border border-sand-200 p-3 mb-5 flex items-center gap-3">
          {playingCount > 0 && (
            <button onClick={stopAll} className="text-clay-500 hover:text-clay-600 transition-colors flex-shrink-0">
              <VolumeX className="w-5 h-5" />
            </button>
          )}
          {playingCount === 0 && <Volume2 className="w-5 h-5 text-sand-400 flex-shrink-0" />}

          <div className="flex-1 text-center">
            {playingCount > 0 ? (
              <span className="text-xs text-forest-600 font-medium">{playingCount} sound{playingCount > 1 ? 's' : ''} playing</span>
            ) : (
              <span className="text-xs text-sand-400">tap sounds below to mix</span>
            )}
          </div>

          <div className="relative">
            <button onClick={() => setShowTimer(!showTimer)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                timerMinutes > 0 ? 'bg-forest-100 text-forest-700' : 'bg-sand-100 text-sand-600 hover:bg-sand-200'
              }`}>
              <Timer className="w-3.5 h-3.5" />
              {timeLeft > 0 ? formatTime(timeLeft) : timerMinutes > 0 ? `${timerMinutes}m` : 'Timer'}
            </button>
            {showTimer && (
              <div className="absolute top-10 right-0 bg-white rounded-xl shadow-xl border border-sand-200 p-2 z-10 min-w-[120px]">
                {TIMER_OPTIONS.map(opt => (
                  <button key={opt.minutes} onClick={() => { setTimerMinutes(opt.minutes); setShowTimer(false); }}
                    className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      timerMinutes === opt.minutes ? 'bg-forest-50 text-forest-700 font-medium' : 'text-sand-700 hover:bg-sand-50'
                    }`}>{opt.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sound grid */}
        <div className="space-y-3">
          {SOUNDS.map((sound, i) => {
            const isPlaying = activeSounds.has(sound.id);
            const vol = volumes[sound.id] ?? 0.5;

            return (
              <motion.div key={sound.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-2xl border transition-all ${
                  isPlaying
                    ? `bg-gradient-to-r ${sound.color} border-forest-200 shadow-sm`
                    : 'bg-white border-sand-200'
                }`}
              >
                <div className="flex items-center gap-3 p-4">
                  <button onClick={() => toggleSound(sound)}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                      isPlaying ? 'bg-white/70 shadow-sm' : 'bg-sand-100 hover:bg-sand-200'
                    }`}>
                    {isPlaying ? <Pause className="w-5 h-5 text-forest-700" /> : <Play className="w-5 h-5 text-sand-600 ml-0.5" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{sound.emoji}</span>
                      <p className="font-medium text-forest-900 text-sm">{sound.name}</p>
                    </div>
                    <p className="text-xs text-sand-500 mt-0.5">{sound.description}</p>
                  </div>

                  {/* Waveform when playing */}
                  {isPlaying && (
                    <div className="flex items-end gap-0.5 h-5 mr-1">
                      {[0,1,2,3].map(j => (
                        <div key={j} className="w-0.5 bg-forest-500/60 rounded-full animate-bounce"
                          style={{ animationDelay: `${j * 150}ms`, animationDuration: '0.8s', height: `${8 + (j % 3) * 5}px` }} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Volume slider when playing */}
                {isPlaying && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    className="px-4 pb-3">
                    <div className="flex items-center gap-2">
                      <VolumeX className="w-3 h-3 text-sand-400 flex-shrink-0" />
                      <input type="range" min="0" max="1" step="0.05" value={vol}
                        onChange={e => changeVolume(sound.id, parseFloat(e.target.value))}
                        className="flex-1 h-1 accent-forest-600 cursor-pointer" />
                      <Volume2 className="w-3 h-3 text-sand-400 flex-shrink-0" />
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Stop all */}
        {playingCount > 0 && (
          <div className="mt-5 text-center">
            <button onClick={stopAll} className="text-sm text-sand-500 hover:text-clay-600 transition-colors inline-flex items-center gap-1">
              <X className="w-4 h-4" /> stop all sounds
            </button>
          </div>
        )}

        {/* Headphone note for binaural */}
        <p className="text-[10px] text-sand-400 text-center mt-6 leading-relaxed">
          🎧 binaural beats require headphones to work properly
        </p>
        </>)}
      </div>
    </div>
  );
}

// ─── MUSIC THERAPY COMPONENT ───
interface MusicPlaylist {
  id: string;
  title: string;
  emoji: string;
  color: string;
  videoId: string; // YouTube video ID
  description: string;
  faithOnly?: string; // show only for this faith
}

const PLAYLISTS: MusicPlaylist[] = [
  { id: 'calm', title: 'Calm & Anxiety Relief', emoji: '😌', color: 'from-blue-50 to-cyan-50', videoId: 'lFcSrYw-ARY', description: 'Soothing music to ease anxiety' },
  { id: 'sleep', title: 'Sleep Music', emoji: '😴', color: 'from-indigo-50 to-violet-50', videoId: '1ZYbU82GVz4', description: 'Drift off to deep relaxation' },
  { id: 'meditation', title: 'Meditation', emoji: '🧘', color: 'from-amber-50 to-yellow-50', videoId: '77ZozI0rw7w', description: 'Mindful ambient sounds' },
  { id: 'focus', title: 'Focus & Deep Work', emoji: '🎯', color: 'from-emerald-50 to-green-50', videoId: 'jfKfPfyJRdk', description: 'Lo-fi beats for concentration' },
  { id: 'nasheed', title: 'Islamic Nasheeds', emoji: '🕌', color: 'from-emerald-50 to-teal-50', videoId: 'GNe38ZoIzlU', description: 'Peaceful nasheeds for the soul', faithOnly: 'islam' },
  { id: 'bhajan', title: 'Hindu Devotional', emoji: '🕉️', color: 'from-orange-50 to-amber-50', videoId: 'AETFvQonfKA', description: 'Bhajans and kirtans', faithOnly: 'hinduism' },
  { id: 'worship', title: 'Christian Worship', emoji: '✝️', color: 'from-blue-50 to-indigo-50', videoId: 'Fd_bueii9MY', description: 'Praise and worship music', faithOnly: 'christianity' },
  { id: 'kirtan', title: 'Sikh Kirtan', emoji: '🪯', color: 'from-orange-50 to-yellow-50', videoId: 'f4QCxblcHGU', description: 'Gurbani shabad kirtan', faithOnly: 'sikhism' },
];

function MusicTherapy({ faithPref, playingVideo, setPlayingVideo }: {
  faithPref: string | null;
  playingVideo: string | null;
  setPlayingVideo: (id: string | null) => void;
}) {
  // Filter: show universal + user's faith-specific playlists
  const visible = PLAYLISTS.filter(p => !p.faithOnly || p.faithOnly === faithPref);

  return (
    <div className="space-y-4">
      {/* Currently playing */}
      {playingVideo && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-sand-200 overflow-hidden shadow-sm">
          <div className="aspect-video w-full">
            <iframe
              src={`https://www.youtube.com/embed/${playingVideo}?autoplay=1&rel=0`}
              title="Music player"
              className="w-full h-full rounded-t-2xl"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
          <div className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Waveform */}
              <div className="flex items-end gap-0.5 h-4">
                {[0,1,2,3].map(j => (
                  <div key={j} className="w-0.5 bg-forest-500/60 rounded-full animate-bounce"
                    style={{ animationDelay: `${j*150}ms`, animationDuration: '0.8s', height: `${8+(j%3)*5}px` }} />
                ))}
              </div>
              <span className="text-xs text-forest-600 font-medium">now playing</span>
            </div>
            <button onClick={() => setPlayingVideo(null)}
              className="text-xs text-sand-500 hover:text-clay-600 transition-colors">stop</button>
          </div>
        </motion.div>
      )}

      {/* Playlist cards */}
      {visible.map((pl, i) => {
        const isPlaying = playingVideo === pl.videoId;
        return (
          <motion.button key={pl.id}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setPlayingVideo(isPlaying ? null : pl.videoId)}
            className={`w-full text-left rounded-2xl border p-4 transition-all active:scale-[0.98] ${
              isPlaying
                ? `bg-gradient-to-r ${pl.color} border-forest-200 shadow-sm`
                : 'bg-white border-sand-200 hover:border-forest-200 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{pl.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-forest-900 text-sm">{pl.title}</p>
                <p className="text-xs text-sand-500 mt-0.5">{pl.description}</p>
              </div>
              {isPlaying ? (
                <div className="flex items-end gap-0.5 h-4">
                  {[0,1,2].map(j => (
                    <div key={j} className="w-0.5 bg-forest-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${j*120}ms`, animationDuration: '0.6s', height: `${6+(j%3)*4}px` }} />
                  ))}
                </div>
              ) : (
                <Play className="w-5 h-5 text-sand-400" />
              )}
            </div>
          </motion.button>
        );
      })}

      <p className="text-[10px] text-sand-400 text-center mt-4 leading-relaxed">
        music streams from YouTube • content by original creators
      </p>
    </div>
  );
}

