import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Moon, RefreshCw, Pause, Play, CloudRain, Sparkles } from 'lucide-react';
import { GROQ_API_KEY, hasValidGroqKey } from '../utils/constants';

const STORY_THEMES = [
  {
    id: 'forest',
    emoji: '🌲',
    name: 'Enchanted Forest',
    subtitle: 'Soft moss, fireflies & twilight pines',
    prompt: 'Write a very calming, slow-paced bedtime story about walking through a peaceful enchanted forest at twilight. Describe the soft moss, glowing fireflies, gentle breeze, and quiet stream. Use present tense. 4 paragraphs. Make it soothing and sleepy.',
  },
  {
    id: 'ocean',
    emoji: '🌊',
    name: 'Moonlit Ocean',
    subtitle: 'Silver tide & warm night sand',
    prompt: 'Write a calming bedtime story about sitting on a warm beach at night, watching silver moonlight dance on gentle waves. Describe the sound of water, the feel of sand, the salty breeze. Present tense. 4 paragraphs. Very slow and peaceful.',
  },
  {
    id: 'mountain',
    emoji: '🏔️',
    name: 'Mountain Cabin',
    subtitle: 'Crackling hearth & silent snowfall',
    prompt: 'Write a cozy bedtime story about being in a warm cabin in the mountains during gentle snowfall. Describe the crackling fire, hot cocoa, soft blankets, and the snow falling silently outside. Present tense. 4 paragraphs.',
  },
  {
    id: 'garden',
    emoji: '🌸',
    name: 'Secret Garden',
    subtitle: 'Lavender breeze & stone fountain',
    prompt: 'Write a calming bedtime story about discovering a hidden garden behind an old stone wall. Describe blooming flowers, butterflies, a small fountain, and warm golden twilight. Present tense. 4 paragraphs. Dreamlike and gentle.',
  },
  {
    id: 'train',
    emoji: '🚂',
    name: 'Night Train',
    subtitle: 'Rhythmic tracks & starlit valleys',
    prompt: 'Write a soothing bedtime story about riding a gentle sleeper train through countryside at night. Describe the rhythmic rocking, passing villages with tiny lights, fields under starlight, the warmth of the cabin. Present tense. 4 paragraphs.',
  },
  {
    id: 'clouds',
    emoji: '☁️',
    name: 'Cloud Journey',
    subtitle: 'Weightless drift across velvet skies',
    prompt: 'Write a dreamy bedtime story about floating on a soft cloud through a pastel twilight sky. Describe drifting past golden clouds, feeling weightless, seeing tiny landscapes below, gentle wind. Present tense. 4 paragraphs.',
  },
];

const CURATED_STORIES: Record<string, string> = {
  forest: `the forest is quiet tonight. a soft breeze carries the scent of pine needles and damp earth, while somewhere nearby a shallow stream whispers over smooth river stones.

you follow a narrow path of velvet moss, each step silent and unhurried. the ancient trees above form a cathedral canopy of deep emerald, and through small clearings, early stars wink like tiny lanterns. a single firefly drifts past your shoulder, its amber glow rising and falling in time with your breath.

ahead, a circular glade opens where fern fronds curl in the cool evening air. you rest against the warm trunk of an old cedar, feeling the steady, centuries-old stillness of the woods settle into your shoulders and jaw.

your eyelids grow heavy as the stream hums its slow lullaby. the forest breathes with you — a slow inhale of cool pine air, and a long, peaceful release into the night...`,

  ocean: `the shoreline is empty and peaceful under a wide velvet sky. a ribbon of silver moonlight stretches across the dark water, shimmering softly each time a gentle wave rolls toward the beach.

you sink into the sand, which still holds the mild warmth of the afternoon sun. the rhythm of the tide is steady and ancient — a slow crest of white foam gliding up the shore, pausing for a quiet heartbeat, and sighing back into the deep.

a mild salt breeze brushes across your forehead, carrying away every lingering thought from the day. out on the horizon, distant constellations glow above the calm swell.

with every wave that recedes, your body sinks a little deeper into rest. inhale as the water rises... hold in the quiet stillness... and exhale as the tide drifts effortlessly out to sea...`,

  mountain: `outside the tall timber windows, fat snowflakes drift straight down through the hush of the pine valley. inside the cabin, a cedar fire crackles softly in the stone hearth, casting warm amber light across wool blankets and rough-hewn beams.

you wrap your hands around a warm ceramic mug of spiced chamomile, feeling the gentle heat radiate into your palms. the silence of the high mountains wraps around the cabin like a thick quilt, muffling the entire world outside.

on the hearth rug, the embers shift with a soft, sleepy glow. there are no schedules up here, no messages to answer, and nowhere else you need to be tonight.

you pull the quilt up to your chin and watch the snow fall slower and slower past the glass, letting each quiet breath carry you deeper into warm, uninterrupted sleep...`,

  garden: `behind an archway of ivy-covered limestone, a quiet courtyard garden rests in the amber glow of late dusk. the air is perfumed with night-blooming jasmine, lavender, and warm rain-washed stone.

at the center of the garden, water trickles from a carved stone basin, creating a soft, continuous melody that fills the courtyard. velvety petals sway gently as the evening breeze moves through the wisteria overhead.

you sit beside the fountain on a sun-warmed bench, trailing your fingers through the cool thyme growing along the path. every leaf and blossom is settling into its nightly rest.

as the first stars appear above the garden walls, your breathing slows to match the gentle trickle of the fountain — calm, protected, and completely at ease...`,

  train: `the sleeper car is dimly lit by a single brass reading lamp as the night train glides smoothly along the valley tracks. beneath you, the wheels keep a steady, hypnotic cadence — clack-clack, pause, clack-clack, pause.

through the wide window, the countryside unspools under pale starlight: quiet pastures, silver rivers, and the occasional distant farmhouse glowing like a tiny ember in the dark.

your berth is lined with crisp cotton sheets and a heavy down blanket. the gentle swaying of the carriage rocks your shoulders from side to side, loosening every muscle in your back and neck.

miles of quiet track stretch ahead while the train carries you safely through the night. all you have to do is close your eyes and let the rhythmic hum of the rails guide you into deep sleep...`,

  clouds: `high above the sleeping world, the evening sky is painted in soft washes of violet, rose, and deep indigo. you are resting on a wide, billowy cloud that supports your entire body like weightless down.

there is no gravity here — every bit of tension in your neck, shoulders, and spine simply dissolves into the warm twilight air. far below, rivers look like silver threads and city lights twinkle as softly as fallen stars.

a slow thermal current carries you smoothly eastward through curtains of golden mist. each breath you take feels spacious, cool, and effortless.

drifting higher into the velvet quiet of the night sky, you float in complete safety and stillness, letting the soft cloud cradle you all the way into dreamless rest...`,
};

// Built-in Web Audio gentle night-rain backing sound for sleep narration
function createSleepRainBacking(): { stop: () => void } | null {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new AudioCtx();
    const bufSize = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufSize; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.025 * w) / 1.025;
      data[i] = last * 2.2;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 620;
    const gain = ctx.createGain();
    gain.gain.value = 0.14;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    return {
      stop: () => {
        try { src.stop(); } catch {}
        if (ctx.state !== 'closed') { try { ctx.close(); } catch {} }
      },
    };
  } catch {
    return null;
  }
}

export default function SleepStories({ embedded = false }: { embedded?: boolean } = {}) {
  const [selectedTheme, setSelectedTheme] = useState<typeof STORY_THEMES[0] | null>(null);
  const [story, setStory] = useState('');
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speechPaused, setSpeechPaused] = useState(false);
  const [rainBacking, setRainBacking] = useState(false);
  const rainSynthRef = useRef<{ stop: () => void } | null>(null);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const stopRainBacking = useCallback(() => {
    if (rainSynthRef.current) {
      rainSynthRef.current.stop();
      rainSynthRef.current = null;
    }
    setRainBacking(false);
  }, []);

  const toggleRainBacking = useCallback(() => {
    if (rainSynthRef.current) {
      stopRainBacking();
    } else {
      rainSynthRef.current = createSleepRainBacking();
      setRainBacking(Boolean(rainSynthRef.current));
    }
  }, [stopRainBacking]);

  const stopSpeech = useCallback(() => {
    try {
      window.speechSynthesis.cancel();
    } catch {}
    setSpeaking(false);
    setSpeechPaused(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      try {
        window.speechSynthesis.cancel();
      } catch {}
      if (rainSynthRef.current) rainSynthRef.current.stop();
    };
  }, []);

  useEffect(() => {
    if (!speaking || speechPaused) return;
    const keepAlive = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
    return () => clearInterval(keepAlive);
  }, [speaking, speechPaused]);

  const generateStory = async (theme: typeof STORY_THEMES[0], forceAiWeave: boolean = false) => {
    if (abortRef.current) abortRef.current.abort();
    const thisAbort = new AbortController();
    abortRef.current = thisAbort;

    setSelectedTheme(theme);
    stopSpeech();

    // Show the theme's distinct curated story immediately unless the user clicked "Weave New AI Story"
    if (!forceAiWeave && CURATED_STORIES[theme.id]) {
      setStory(CURATED_STORIES[theme.id]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setStory('');

    try {
      // 1. Try Server-Side Gemini (/api/mira/story)
      const res = await fetch('/api/mira/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeName: theme.name, prompt: theme.prompt }),
        signal: thisAbort.signal,
      });

      if (res.ok && !thisAbort.signal.aborted) {
        const data = await res.json();
        if (data.story && mountedRef.current) {
          setStory(data.story.replace(/^["']|["']$/g, '').trim());
          setLoading(false);
          return;
        }
      }

      // 2. Optional Groq fallback if key is configured
      const storedGroq = localStorage.getItem('neuralminds_groq_key');
      const apiKey = hasValidGroqKey(storedGroq) ? storedGroq! : hasValidGroqKey(GROQ_API_KEY) ? GROQ_API_KEY : '';
      if (apiKey && !thisAbort.signal.aborted) {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'qwen/qwen3.8-27b',
            messages: [
              {
                role: 'system',
                content:
                  'You are a calming bedtime story writer. Write in a slow, gentle, soothing style in lowercase. 4 paragraphs.',
              },
              { role: 'user', content: theme.prompt },
            ],
            temperature: 0.8,
            max_tokens: 700,
          }),
          signal: thisAbort.signal,
        });
        if (groqRes.ok) {
          const data = await groqRes.json();
          const content = data.choices?.[0]?.message?.content;
          if (content && mountedRef.current) {
            setStory(content.replace(/^["']|["']$/g, '').trim());
            setLoading(false);
            return;
          }
        }
      }
    } catch {}

    if (mountedRef.current && !thisAbort.signal.aborted) {
      setStory(CURATED_STORIES[theme.id] || CURATED_STORIES.forest);
      setLoading(false);
    }
  };

  const startSpeech = () => {
    if (!story || !window.speechSynthesis) return;
    stopSpeech();

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(story);
      utterance.rate = 0.78;
      utterance.pitch = 0.92;
      utterance.volume = 0.85;

      const voices = speechSynthesis.getVoices();
      const preferred =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.toLowerCase().includes('samantha') ||
              v.name.toLowerCase().includes('karen') ||
              v.name.toLowerCase().includes('female') ||
              v.name.toLowerCase().includes('google'))
        ) || voices.find((v) => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;

      utterance.onend = () => {
        if (mountedRef.current) {
          setSpeaking(false);
          setSpeechPaused(false);
        }
      };
      utterance.onerror = () => {
        if (mountedRef.current) {
          setSpeaking(false);
          setSpeechPaused(false);
        }
      };

      speechSynthesis.speak(utterance);
      setSpeaking(true);
      setSpeechPaused(false);
    }, 100);
  };

  const togglePauseSpeech = () => {
    if (speechPaused) {
      speechSynthesis.resume();
      setSpeechPaused(false);
    } else {
      speechSynthesis.pause();
      setSpeechPaused(true);
    }
  };

  return (
    <div className={embedded ? 'w-full' : 'h-full overflow-y-auto'}>
      <div className="p-5 pb-12 md:pb-8 max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl text-forest-900 mb-1">Sleep Stories</h2>
            <p className="text-sand-500 text-sm">Soothing bedtime journeys with voice narration &amp; ambient rain</p>
          </div>
          <button
            type="button"
            onClick={toggleRainBacking}
            className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-all ${
              rainBacking
                ? 'bg-dusk-600 text-white border-dusk-600 shadow-sm'
                : 'bg-white text-sand-700 border-sand-200 hover:border-dusk-300'
            }`}
            title="Toggle gentle night rain backing audio"
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span>{rainBacking ? 'Rain Backing On' : 'Add Night Rain'}</span>
          </button>
        </motion.div>

        {!story && !loading && (
          <div>
            <p className="text-sm text-forest-800 mb-3 font-medium">Choose a sanctuary world to drift into...</p>
            <div className="grid grid-cols-2 gap-3">
              {STORY_THEMES.map((theme, i) => (
                <motion.button
                  key={theme.id}
                  type="button"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => generateStory(theme, false)}
                  className="text-left p-4 bg-white rounded-2xl border border-sand-200 hover:border-dusk-300 hover:shadow-md transition-all active:scale-[0.98]"
                >
                  <span className="text-3xl mb-2 block">{theme.emoji}</span>
                  <p className="font-semibold text-forest-900 text-sm">{theme.name}</p>
                  <p className="text-[11px] text-sand-500 mt-0.5">{theme.subtitle}</p>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-16">
            <Moon className="w-10 h-10 text-dusk-500 mx-auto mb-4 animate-pulse" />
            <p className="text-forest-800 font-medium">Mira is weaving a fresh bedtime story...</p>
            <p className="text-xs text-sand-400 mt-1">Setting: {selectedTheme?.name}</p>
          </div>
        )}

        {story && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-4 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedTheme?.emoji}</span>
                <h3 className="font-serif text-lg text-forest-900">{selectedTheme?.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                {selectedTheme && (
                  <button
                    type="button"
                    onClick={() => generateStory(selectedTheme, true)}
                    className="text-xs bg-dusk-50 hover:bg-dusk-100 text-dusk-700 border border-dusk-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-medium"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Weave AI Variation
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setStory('');
                    stopSpeech();
                  }}
                  className="text-xs text-sand-500 hover:text-forest-700 px-2 py-1.5 flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> All Themes
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-b from-dusk-50/90 to-warm-50/90 rounded-2xl border border-dusk-200/70 p-6 mb-4 shadow-xs">
              <p className="text-forest-900 leading-[1.95] text-[15px] whitespace-pre-wrap font-light">{story}</p>
            </div>

            {/* Read aloud controls */}
            <div className="bg-white rounded-xl border border-sand-200 p-3 flex items-center gap-3 shadow-2xs">
              <button
                type="button"
                onClick={speaking ? togglePauseSpeech : startSpeech}
                className="w-10 h-10 rounded-full bg-dusk-100 hover:bg-dusk-200 flex items-center justify-center transition-colors flex-shrink-0"
              >
                {speaking && !speechPaused ? (
                  <Pause className="w-5 h-5 text-dusk-700" />
                ) : (
                  <Play className="w-5 h-5 text-dusk-700 ml-0.5" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-forest-900">
                  {speaking ? (speechPaused ? 'Narration Paused' : 'Narrating softly...') : 'Narrate Story Aloud'}
                </p>
                <p className="text-xs text-sand-500">Slow 0.78x bedtime cadence • Pair with Night Rain above</p>
              </div>
              {speaking && (
                <button
                  type="button"
                  onClick={stopSpeech}
                  className="text-xs text-sand-500 hover:text-clay-600 flex-shrink-0 font-medium"
                >
                  Stop
                </button>
              )}
            </div>

            {/* Quick switch themes */}
            <div className="mt-5">
              <p className="text-xs text-sand-500 mb-2">Or drift into another world...</p>
              <div className="flex gap-2 flex-wrap">
                {STORY_THEMES.filter((t) => t.id !== selectedTheme?.id).map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => generateStory(theme, false)}
                    className="flex items-center gap-1.5 text-xs bg-white border border-sand-200 hover:border-dusk-300 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {theme.emoji} {theme.name}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
