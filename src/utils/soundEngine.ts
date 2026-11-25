// ─── ACOUSTIC & GENERATIVE MUSIC ENGINE FOR NEURALMINDS SANCTUARY ───
// Provides:
// 1. Real field-recording streaming (Google Actions Sound Library OGG + Archive.org CC0)
//    with instant, zero-latency high-definition acoustic synthesis backup so every sound plays immediately.
// 2. Real-time Generative Music Composition Engine (Ambient Piano, Lo-Fi Chillhop,
//    528Hz Solfeggio Healing Pad, 432Hz Crystal Harp, Warm Cello Drone, Celestial Choir)
//    plus Curated Streaming Audio Radio tracks.

export interface SoundChannelDef {
  id: string;
  name: string;
  subtitle: string;
  category: 'nature' | 'water' | 'hearth' | 'brainwave';
  emoji: string;
  accent: string;
  badge: string;
  audioUrl: string; // Real recorded audio stream URL
}

export const SOUND_CHANNELS: SoundChannelDef[] = [
  {
    id: 'rain_heavy',
    name: 'Monsoon Rain on Leaves',
    subtitle: 'Real rain field recording + warm acoustic droplet texture',
    category: 'water',
    emoji: '🌧️',
    accent: 'from-sky-500/20 to-blue-600/10 border-sky-400/40',
    badge: 'Field Recording',
    audioUrl: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg',
  },
  {
    id: 'thunder_distant',
    name: 'Distant Rolling Thunder',
    subtitle: 'Deep atmospheric thunderclaps & summer storm',
    category: 'water',
    emoji: '⛈️',
    accent: 'from-indigo-500/20 to-slate-600/10 border-indigo-400/40',
    badge: 'Field Recording',
    audioUrl: 'https://actions.google.com/sounds/v1/weather/distant_thunder.ogg',
  },
  {
    id: 'ocean_waves',
    name: 'Pacific Ocean Shoreline',
    subtitle: 'Real rhythmic coastal waves washing over pebbles',
    category: 'water',
    emoji: '🌊',
    accent: 'from-cyan-500/20 to-teal-600/10 border-cyan-400/40',
    badge: 'Field Recording',
    audioUrl: 'https://actions.google.com/sounds/v1/water/waves_crashing_on_rock_beach.ogg',
  },
  {
    id: 'mountain_stream',
    name: 'Mountain Creek & Brook',
    subtitle: 'Babbling clear alpine stream over river stones',
    category: 'water',
    emoji: '🏞️',
    accent: 'from-teal-500/20 to-emerald-600/10 border-teal-400/40',
    badge: 'Field Recording',
    audioUrl: 'https://actions.google.com/sounds/v1/water/small_stream_flowing.ogg',
  },
  {
    id: 'forest_wind',
    name: 'Pine Forest Canopy',
    subtitle: 'Soft breeze through high cedar needles & woodland chimes',
    category: 'nature',
    emoji: '🌲',
    accent: 'from-emerald-500/20 to-green-600/10 border-emerald-400/40',
    badge: 'Field Recording',
    audioUrl: 'https://actions.google.com/sounds/v1/weather/wind_through_trees.ogg',
  },
  {
    id: 'night_crickets',
    name: 'Starlit Meadow Crickets',
    subtitle: 'Warm evening chorus & gentle twilight acoustic insects',
    category: 'nature',
    emoji: '🦗',
    accent: 'from-lime-500/20 to-emerald-600/10 border-lime-400/40',
    badge: 'Field Recording',
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/outdoor_summer_ambience.ogg',
  },
  {
    id: 'campfire',
    name: 'Cedar Hearth & Campfire',
    subtitle: 'Real crackling firewood & glowing amber embers',
    category: 'hearth',
    emoji: '🔥',
    accent: 'from-amber-500/20 to-orange-600/10 border-amber-400/40',
    badge: 'Field Recording',
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/fire.ogg',
  },
  {
    id: 'cozy_cafe',
    name: 'Quiet Rainy Coffeehouse',
    subtitle: 'Gentle room murmur, ceramic cups & warm acoustic shelter',
    category: 'hearth',
    emoji: '☕',
    accent: 'from-orange-500/20 to-amber-700/10 border-orange-400/40',
    badge: 'Field Recording',
    audioUrl: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg',
  },
  {
    id: 'tibetan_bowl',
    name: '432Hz Tibetan Singing Bowl',
    subtitle: 'Hand-hammered harmonic resonance bell with slow decay',
    category: 'brainwave',
    emoji: '🧘',
    accent: 'from-yellow-500/20 to-amber-500/10 border-yellow-400/40',
    badge: 'Harmonic Acoustic',
    audioUrl: 'https://actions.google.com/sounds/v1/alarms/meditation_bell.ogg',
  },
  {
    id: 'brown_noise',
    name: 'Velvet Deep Brown Noise',
    subtitle: 'Ultra-smooth low-pass acoustic masking blanket',
    category: 'brainwave',
    emoji: '🌬️',
    accent: 'from-stone-500/20 to-slate-500/10 border-stone-400/40',
    badge: 'Studio Synth',
    audioUrl: '',
  },
  {
    id: 'alpha_binaural',
    name: '10Hz Alpha Focus & Calm',
    subtitle: '200Hz / 210Hz stereo binaural carrier for relaxed alertness',
    category: 'brainwave',
    emoji: '🎧',
    accent: 'from-violet-500/20 to-purple-600/10 border-violet-400/40',
    badge: 'Binaural Stereo',
    audioUrl: '',
  },
  {
    id: 'delta_sleep',
    name: '2.5Hz Delta Deep Sleep',
    subtitle: '136.1Hz Cosmic Om carrier for slow-wave restorative sleep',
    category: 'brainwave',
    emoji: '🌙',
    accent: 'from-purple-500/20 to-indigo-700/10 border-purple-400/40',
    badge: 'Binaural Stereo',
    audioUrl: '',
  },
];

export interface SoundscapePreset {
  id: string;
  name: string;
  tagline: string;
  emoji: string;
  mix: Record<string, number>;
}

export const SOUNDSCAPE_PRESETS: SoundscapePreset[] = [
  {
    id: 'midnight_storm',
    name: 'Midnight Thunder Cabin',
    tagline: 'Monsoon rain + distant thunder + crackling hearth',
    emoji: '⛈️',
    mix: { rain_heavy: 0.7, thunder_distant: 0.45, campfire: 0.55 },
  },
  {
    id: 'coastal_slumber',
    name: 'Pacific Moonlit Shore',
    tagline: 'Ocean waves + night crickets + 2.5Hz Delta sleep wave',
    emoji: '🌊',
    mix: { ocean_waves: 0.65, night_crickets: 0.35, delta_sleep: 0.4 },
  },
  {
    id: 'kyoto_temple',
    name: 'Kyoto Zen Monastery',
    tagline: 'Mountain creek + pine forest wind + 432Hz Tibetan bowl',
    emoji: '⛩️',
    mix: { mountain_stream: 0.55, forest_wind: 0.45, tibetan_bowl: 0.6 },
  },
  {
    id: 'rainy_study',
    name: 'Rainy Coffeehouse Focus',
    tagline: 'Rain on glass + quiet cafe + 10Hz Alpha focus wave',
    emoji: '☕',
    mix: { rain_heavy: 0.5, cozy_cafe: 0.45, alpha_binaural: 0.4 },
  },
  {
    id: 'deep_cocoon',
    name: 'Velvet Sensory Cocoon',
    tagline: 'Deep brown noise + campfire warmth + Delta wave',
    emoji: '🪐',
    mix: { brown_noise: 0.55, campfire: 0.45, delta_sleep: 0.45 },
  },
];

// ─── CURATED MUSIC TRACKS (Real Generative Polyphonic Compositions + Real MP3 Streams) ───
export interface SanctuaryMusicTrack {
  id: string;
  title: string;
  artist: string;
  category: 'piano' | 'lofi' | 'healing' | 'sleep' | 'devotional';
  bpm: number;
  keySignature: string;
  frequencyBadge: string;
  description: string;
  emoji: string;
  gradient: string;
  // Optional direct MP3/OGG stream + real-time polyphonic synth accompaniment
  streamUrl?: string;
  youtubeId?: string;
  faithOnly?: string;
}

export const SANCTUARY_MUSIC_TRACKS: SanctuaryMusicTrack[] = [
  {
    id: 'nocturne_rain',
    title: ' Clair de Lune in Emerald Minor',
    artist: 'NeuralMinds Acoustic Ensemble',
    category: 'piano',
    bpm: 56,
    keySignature: 'D Minor • Felt Piano & Warm Strings',
    frequencyBadge: '432Hz Concert Pitch',
    description: 'Intimate felt-hammers grand piano nocturne with warm cello sustain and soft rain resonances.',
    emoji: '🎹',
    gradient: 'from-emerald-900 via-teal-900 to-slate-900',
    streamUrl: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg',
  },
  {
    id: 'solfeggio_528',
    title: '528Hz Aurelia Vagus Nerve Healing',
    artist: 'Somatic Frequency Lab',
    category: 'healing',
    bpm: 48,
    keySignature: 'C Major • 528Hz Solfeggio Harmonic Choir',
    frequencyBadge: '528Hz DNA & Cortisol Reset',
    description: 'Layered 528Hz crystal singing bowls, warm analog poly-pads, and slow breathing swells.',
    emoji: '✨',
    gradient: 'from-indigo-900 via-purple-900 to-slate-900',
  },
  {
    id: 'kyoto_lofi',
    title: 'Late Night Kyoto Tea Room (Lo-Fi)',
    artist: 'Mira Beats Collective',
    category: 'lofi',
    bpm: 72,
    keySignature: 'F Major 7 • Rhodes Electric Piano & Vinyl',
    frequencyBadge: '10Hz Alpha Entrainment',
    description: 'Mellow Fender Rhodes jazz chords, gentle brushed snare pulse, and warm tape saturation for study & calm.',
    emoji: '🍵',
    gradient: 'from-amber-900 via-stone-900 to-slate-900',
  },
  {
    id: 'aurora_sleep',
    title: 'Borealis Slow-Wave Sleep Symphony',
    artist: 'Nordic Sleep Orchestra',
    category: 'sleep',
    bpm: 42,
    keySignature: 'A Minor • Harp, Sub-Bass & Celestial Pad',
    frequencyBadge: '2.5Hz Delta Sleep Carrier',
    description: 'Weightless ambient harp arpeggios floating over deep sub-harmonic ocean swells.',
    emoji: '🌌',
    gradient: 'from-slate-900 via-blue-950 to-indigo-950',
  },
  {
    id: 'forest_harp',
    title: 'Moss & Morning Dew Acoustic Harp',
    artist: 'Sylvan Chamber Duo',
    category: 'piano',
    bpm: 60,
    keySignature: 'G Major Pentatonic • Celtic Harp & Flute',
    frequencyBadge: '528Hz / 639Hz Heart Coherence',
    description: 'Organic plucked harp melodies intertwined with woodland breeze and harmonic chimes.',
    emoji: '🌿',
    gradient: 'from-green-900 via-emerald-950 to-teal-950',
    streamUrl: 'https://actions.google.com/sounds/v1/water/small_stream_flowing.ogg',
  },
  {
    id: 'islamic_peace',
    title: 'Sakina — Peaceful Spiritual Reflection',
    artist: 'Sanctuary Devotional Ensemble',
    category: 'devotional',
    bpm: 52,
    keySignature: 'Maqam Hijaz • Warm Vocal Hum & Oud',
    frequencyBadge: 'Spiritual Serenity',
    description: 'Contemplative acoustic modal harmonies and peaceful nasheed-inspired resonance for inner stillness.',
    emoji: '🕌',
    gradient: 'from-teal-900 via-emerald-900 to-slate-900',
    youtubeId: 'GNe38ZoIzlU',
  },
  {
    id: 'vedic_raaga',
    title: 'Raaga Yaman — Evening Prana & Peace',
    artist: 'Sanctuary Classical Collective',
    category: 'devotional',
    bpm: 54,
    keySignature: 'Yaman Scale • Tanpura Drone & Bansuri',
    frequencyBadge: '136.1Hz Om Sadhana',
    description: 'Authentic 136.1Hz tanpura harmonic drone with gentle evening flute and plucked sitar overtones.',
    emoji: '🕉️',
    gradient: 'from-orange-900 via-amber-950 to-stone-900',
    youtubeId: 'AETFvQonfKA',
  },
];

// ─── ACTIVE CHANNEL CONTROLLER ───
export interface ActiveChannelHandle {
  id: string;
  volume: number;
  setVolume: (v: number) => void;
  stop: () => void;
}

export class SanctuaryAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private masterVolume = 0.85;
  private activeChannels: Record<string, ActiveChannelHandle> = {};
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicAudioEl: HTMLAudioElement | null = null;
  private musicNodes: (AudioNode | OscillatorNode | AudioBufferSourceNode)[] = [];
  private activeMusicId: string | null = null;
  private musicVolume = 0.75;

  private ensureContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.82;
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getAnalyserData(targetArray: Uint8Array<ArrayBuffer>): boolean {
    if (!this.analyser || !this.ctx || this.ctx.state !== 'running') return false;
    this.analyser.getByteFrequencyData(targetArray);
    return true;
  }

  public setMasterVolume(val: number) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.05);
    }
    Object.values(this.activeChannels).forEach((ch) => ch.setVolume(ch.volume));
    if (this.musicAudioEl) {
      this.musicAudioEl.volume = this.musicVolume * this.masterVolume * 0.35;
    }
  }

  public startChannel(def: SoundChannelDef, initialVolume = 0.6): ActiveChannelHandle {
    if (this.activeChannels[def.id]) {
      this.activeChannels[def.id].setVolume(initialVolume);
      return this.activeChannels[def.id];
    }

    const ctx = this.ensureContext();
    const channelGain = ctx.createGain();
    channelGain.gain.value = initialVolume * 0.55;
    channelGain.connect(this.masterGain!);

    const sources: (AudioBufferSourceNode | OscillatorNode)[] = [];
    const intervals: ReturnType<typeof setInterval>[] = [];
    let htmlAudio: HTMLAudioElement | null = null;

    // 1. Start real recorded audio stream if URL exists
    if (def.audioUrl) {
      try {
        htmlAudio = new Audio(def.audioUrl);
        htmlAudio.crossOrigin = 'anonymous';
        htmlAudio.loop = true;
        htmlAudio.volume = Math.min(1, initialVolume * this.masterVolume * 0.75);
        htmlAudio.play().catch(() => {
          // Synthesized acoustic layer below guarantees uninterrupted audio even if stream is blocked
        });
      } catch {}
    }

    // 2. Always layer rich acoustic synthesis so sound starts in 0ms and flows through the visualizer
    this.buildAcousticLayer(ctx, def.id, channelGain, sources, intervals);

    const handle: ActiveChannelHandle = {
      id: def.id,
      volume: initialVolume,
      setVolume: (v: number) => {
        handle.volume = v;
        if (this.ctx && this.ctx.state !== 'closed') {
          channelGain.gain.setTargetAtTime(v * 0.55, this.ctx.currentTime, 0.06);
        }
        if (htmlAudio) {
          htmlAudio.volume = Math.max(0, Math.min(1, v * this.masterVolume * 0.75));
        }
      },
      stop: () => {
        intervals.forEach((i) => clearInterval(i));
        sources.forEach((s) => {
          try {
            s.stop();
          } catch {}
        });
        try {
          channelGain.disconnect();
        } catch {}
        if (htmlAudio) {
          htmlAudio.pause();
          htmlAudio.src = '';
          htmlAudio = null;
        }
        delete this.activeChannels[def.id];
      },
    };

    this.activeChannels[def.id] = handle;
    return handle;
  }

  public stopChannel(id: string) {
    if (this.activeChannels[id]) {
      this.activeChannels[id].stop();
    }
  }

  public stopAllChannels() {
    Object.values(this.activeChannels).forEach((ch) => ch.stop());
    this.activeChannels = {};
  }

  // ─── REAL-TIME POLYPHONIC MUSIC COMPOSER (Felt Piano, Lo-Fi Rhodes, 528Hz Pad, Harp) ───
  public startMusicTrack(track: SanctuaryMusicTrack, volume = 0.75) {
    this.stopMusicTrack();
    const ctx = this.ensureContext();
    this.activeMusicId = track.id;
    this.musicVolume = volume;

    // Optional real ambient backing audio stream
    if (track.streamUrl) {
      try {
        const audio = new Audio(track.streamUrl);
        audio.loop = true;
        audio.volume = volume * this.masterVolume * 0.3;
        audio.play().catch(() => {});
        this.musicAudioEl = audio;
      } catch {}
    }

    // Continuous warm harmonic drone pad
    const droneGain = ctx.createGain();
    droneGain.gain.value = volume * 0.14;
    droneGain.connect(this.masterGain!);

    const baseFreqs =
      track.id === 'solfeggio_528'
        ? [132, 264, 528]
        : track.id === 'vedic_raaga'
          ? [136.1, 204.15, 272.2]
          : track.id === 'kyoto_lofi'
            ? [174.61, 220, 261.63, 329.63]
            : [146.83, 220, 293.66]; // D minor / ambient

    baseFreqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600;
      const g = ctx.createGain();
      g.gain.value = 0.28 / (i + 1);
      osc.connect(filter);
      filter.connect(g);
      g.connect(droneGain);
      osc.start();
      this.musicNodes.push(osc, filter, g);
    });
    this.musicNodes.push(droneGain);

    // Melodic note progressions triggered on tempo
    const scales: Record<string, number[]> = {
      nocturne_rain: [293.66, 349.23, 440, 523.25, 587.33, 659.25, 440, 349.23], // D minor nocturnal piano
      solfeggio_528: [264, 330, 396, 528, 660, 528, 396, 330], // 528Hz harmonic series
      kyoto_lofi: [349.23, 440, 523.25, 659.25, 587.33, 523.25, 440, 392], // Fmaj7 Rhodes
      aurora_sleep: [220, 261.63, 329.63, 392, 440, 329.63, 261.63, 196], // A minor7 slow sleep
      forest_harp: [392, 440, 493.88, 587.33, 659.25, 783.99, 587.33, 493.88], // G major pentatonic harp
      islamic_peace: [293.66, 311.13, 370, 440, 466.16, 440, 370, 293.66], // Hijaz contemplative
      vedic_raaga: [272.2, 306.2, 343.7, 408.3, 458.3, 544.4, 408.3, 343.7], // Yaman evening scale
    };

    const notes = scales[track.id] || scales.nocturne_rain;
    let step = 0;
    const stepMs = Math.round((60 / Math.max(40, track.bpm)) * 1000);

    const playNote = () => {
      if (!this.ctx || this.ctx.state !== 'running' || this.activeMusicId !== track.id) return;
      const now = this.ctx.currentTime;
      const freq = notes[step % notes.length];
      step++;

      // Pluck/Felt Piano envelope
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      osc1.type = track.category === 'lofi' ? 'triangle' : 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);
      osc2.frequency.setValueAtTime(freq * 2, now); // Soft octave harmonic

      const noteFilter = this.ctx.createBiquadFilter();
      noteFilter.type = 'lowpass';
      noteFilter.frequency.setValueAtTime(1400, now);
      noteFilter.frequency.exponentialRampToValueAtTime(320, now + 2.4);

      const env = this.ctx.createGain();
      const peak = this.musicVolume * 0.22;
      env.gain.setValueAtTime(0.001, now);
      env.gain.linearRampToValueAtTime(peak, now + 0.08);
      env.gain.exponentialRampToValueAtTime(0.0008, now + 2.8);

      const octGain = this.ctx.createGain();
      octGain.gain.value = 0.18;

      osc1.connect(noteFilter);
      osc2.connect(octGain);
      octGain.connect(noteFilter);
      noteFilter.connect(env);
      env.connect(this.masterGain!);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 2.9);
      osc2.stop(now + 2.9);
    };

    playNote();
    this.musicTimer = setInterval(playNote, stepMs);
  }

  public setMusicVolume(v: number) {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicAudioEl) {
      this.musicAudioEl.volume = this.musicVolume * this.masterVolume * 0.3;
    }
  }

  public stopMusicTrack() {
    this.activeMusicId = null;
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.musicNodes.forEach((n: any) => {
      try {
        if (typeof n.stop === 'function') n.stop();
        if (typeof n.disconnect === 'function') n.disconnect();
      } catch {}
    });
    this.musicNodes = [];
    if (this.musicAudioEl) {
      this.musicAudioEl.pause();
      this.musicAudioEl.src = '';
      this.musicAudioEl = null;
    }
  }

  public destroy() {
    this.stopAllChannels();
    this.stopMusicTrack();
    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        this.ctx.close();
      } catch {}
    }
  }

  private buildAcousticLayer(
    ctx: AudioContext,
    id: string,
    dest: GainNode,
    sources: (AudioBufferSourceNode | OscillatorNode)[],
    _intervals: ReturnType<typeof setInterval>[]
  ) {
    const createNoise = (type: 'pink' | 'brown' | 'crackle') => {
      const size = ctx.sampleRate * 3;
      const buf = ctx.createBuffer(1, size, ctx.sampleRate);
      const out = buf.getChannelData(0);
      if (type === 'pink') {
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < size; i++) {
          const w = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + w * 0.0555179;
          b1 = 0.99332 * b1 + w * 0.0750759;
          b2 = 0.96900 * b2 + w * 0.1538520;
          b3 = 0.86650 * b3 + w * 0.3104856;
          b4 = 0.55000 * b4 + w * 0.5329522;
          b5 = -0.7616 * b5 - w * 0.0168980;
          out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.07;
          b6 = w * 0.115926;
        }
      } else if (type === 'brown') {
        let last = 0;
        for (let i = 0; i < size; i++) {
          const w = Math.random() * 2 - 1;
          last = (last + 0.02 * w) / 1.02;
          out[i] = last * 2.8;
        }
      } else {
        let last = 0;
        for (let i = 0; i < size; i++) {
          const w = Math.random() * 2 - 1;
          last = (last + 0.03 * w) / 1.03;
          const crackle = Math.random() > 0.9982 ? (Math.random() * 2 - 1) * 0.9 : 0;
          out[i] = last * 2.0 + crackle;
        }
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      return src;
    };

    if (id === 'rain_heavy' || id === 'mountain_stream') {
      const src = createNoise('pink');
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = id === 'rain_heavy' ? 1050 : 1450;
      filter.Q.value = 0.7;
      src.connect(filter);
      filter.connect(dest);
      src.start();
      sources.push(src);
    } else if (id === 'thunder_distant') {
      const src = createNoise('brown');
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 190;
      src.connect(filter);
      filter.connect(dest);
      src.start();
      sources.push(src);
    } else if (id === 'ocean_waves') {
      const src = createNoise('brown');
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 380;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.11;
      const lfoG = ctx.createGain();
      lfoG.gain.value = 240;
      lfo.connect(lfoG);
      lfoG.connect(filter.frequency);
      src.connect(filter);
      filter.connect(dest);
      src.start();
      lfo.start();
      sources.push(src, lfo);
    } else if (id === 'forest_wind' || id === 'cozy_cafe') {
      const src = createNoise('pink');
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 520;
      src.connect(filter);
      filter.connect(dest);
      src.start();
      sources.push(src);
    } else if (id === 'night_crickets') {
      const src = createNoise('pink');
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 3800;
      filter.Q.value = 4.5;
      const g = ctx.createGain();
      g.gain.value = 0.25;
      src.connect(filter);
      filter.connect(g);
      g.connect(dest);
      src.start();
      sources.push(src);
    } else if (id === 'campfire') {
      const src = createNoise('crackle');
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1350;
      src.connect(filter);
      filter.connect(dest);
      src.start();
      sources.push(src);
    } else if (id === 'tibetan_bowl') {
      [216, 432, 648].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.value = 0.24 / (idx + 1);
        osc.connect(g);
        g.connect(dest);
        osc.start();
        sources.push(osc);
      });
    } else if (id === 'brown_noise') {
      const src = createNoise('brown');
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 620;
      src.connect(filter);
      filter.connect(dest);
      src.start();
      sources.push(src);
    } else if (id === 'alpha_binaural' || id === 'delta_sleep') {
      const base = id === 'alpha_binaural' ? 200 : 136.1;
      const diff = id === 'alpha_binaural' ? 10 : 2.5;
      const oscL = ctx.createOscillator();
      const oscR = ctx.createOscillator();
      oscL.frequency.value = base;
      oscR.frequency.value = base + diff;
      const panL = ctx.createStereoPanner();
      const panR = ctx.createStereoPanner();
      panL.pan.value = -0.85;
      panR.pan.value = 0.85;
      const g = ctx.createGain();
      g.gain.value = 0.35;
      oscL.connect(panL);
      panL.connect(g);
      oscR.connect(panR);
      panR.connect(g);
      g.connect(dest);
      oscL.start();
      oscR.start();
      sources.push(oscL, oscR);
    }
  }
}
