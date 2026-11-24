import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Moon, RefreshCw, Pause, Play } from 'lucide-react';
import { GROQ_API_KEY } from '../utils/constants';

const STORY_THEMES = [
  { id: 'forest', emoji: '🌲', name: 'Enchanted Forest', prompt: 'Write a very calming, slow-paced bedtime story about walking through a peaceful enchanted forest at twilight. Describe the soft moss, glowing fireflies, gentle breeze, and quiet stream. Use present tense. 3-4 paragraphs. Make it soothing and sleepy.' },
  { id: 'ocean', emoji: '🌊', name: 'Moonlit Ocean', prompt: 'Write a calming bedtime story about sitting on a warm beach at night, watching silver moonlight dance on gentle waves. Describe the sound of water, the feel of sand, the salty breeze. Present tense. 3-4 paragraphs. Very slow and peaceful.' },
  { id: 'mountain', emoji: '🏔️', name: 'Mountain Cabin', prompt: 'Write a cozy bedtime story about being in a warm cabin in the mountains during gentle snowfall. Describe the crackling fire, hot cocoa, soft blankets, and the snow falling silently outside. Present tense. 3-4 paragraphs.' },
  { id: 'garden', emoji: '🌸', name: 'Secret Garden', prompt: 'Write a calming bedtime story about discovering a hidden garden behind an old stone wall. Describe blooming flowers, butterflies, a small fountain, and warm golden sunlight. Present tense. 3-4 paragraphs. Dreamlike and gentle.' },
  { id: 'train', emoji: '🚂', name: 'Night Train', prompt: 'Write a soothing bedtime story about riding a gentle train through countryside at night. Describe the rhythmic rocking, passing villages with tiny lights, fields under starlight, the warmth of the cabin. Present tense. 3-4 paragraphs.' },
  { id: 'clouds', emoji: '☁️', name: 'Cloud Journey', prompt: 'Write a dreamy bedtime story about floating on a soft cloud through a pastel sunset sky. Describe drifting past golden clouds, feeling weightless, seeing tiny landscapes below, gentle wind. Present tense. 3-4 paragraphs.' },
];

const FALLBACK_STORY = `the forest is quiet tonight. a soft breeze carries the scent of pine needles and damp earth. somewhere nearby, a stream whispers over smooth stones.

you follow a narrow path of soft moss, each step silent and gentle. the trees above form a canopy of dark green, and through small gaps, stars wink like tiny candles. a firefly drifts past, its glow warm and golden.

you find a clearing where the grass is thick and soft. you lie down, the earth warm beneath you. the sky is endless above, filled with slow-moving clouds painted silver by the moon.

your eyes grow heavy. the forest breathes with you — in, and out, and in again...`;

export default function SleepStories() {
  const [selectedTheme, setSelectedTheme] = useState<typeof STORY_THEMES[0] | null>(null);
  const [story, setStory] = useState('');
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speechPaused, setSpeechPaused] = useState(false);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  // Clean stop speech — works across all browsers
  const stopSpeech = () => {
    try {
      window.speechSynthesis.cancel();
    } catch {}
    setSpeaking(false);
    setSpeechPaused(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      try { window.speechSynthesis.cancel(); } catch {}
    };
  }, []);

  // Chrome bug: speechSynthesis pauses after 15s. This keeps it alive.
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

  const generateStory = async (theme: typeof STORY_THEMES[0]) => {
    // Abort any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const thisAbort = new AbortController();
    abortRef.current = thisAbort;

    setSelectedTheme(theme);
    setLoading(true);
    setStory('');
    stopSpeech();

    try {
      const apiKey = localStorage.getItem('neuralminds_groq_key') || GROQ_API_KEY;
      const models = ['qwen/qwen3.8-27b', 'allam-2-7b', 'openai/gpt-oss-20b'];

      let generated = false;
      for (const model of models) {
        if (generated || thisAbort.signal.aborted) break;
        try {
          const timeout = setTimeout(() => thisAbort.abort(), 15000);

          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: 'You are a calming bedtime story writer. Write in a slow, gentle, soothing style. Use sensory details. Every sentence should feel like a warm blanket. No drama, no conflict. Just peaceful imagery. Write in lowercase.' },
                { role: 'user', content: theme.prompt }
              ],
              temperature: 0.8,
              max_tokens: 800,
            }),
            signal: thisAbort.signal,
          });
          clearTimeout(timeout);

          if (res.ok && !thisAbort.signal.aborted) {
            const data = await res.json();
            const content = data.choices?.[0]?.message?.content;
            if (content && mountedRef.current && !thisAbort.signal.aborted) {
              setStory(content.replace(/^["']|["']$/g, '').trim());
              generated = true;
            }
          }
        } catch { /* try next model or aborted */ }
      }

      if (!generated && mountedRef.current && !thisAbort.signal.aborted) {
        setStory(FALLBACK_STORY);
      }
    } catch {
      if (mountedRef.current && !thisAbort.signal.aborted) setStory(FALLBACK_STORY);
    }

    if (mountedRef.current && !thisAbort.signal.aborted) setLoading(false);
  };

  const startSpeech = () => {
    if (!story || !window.speechSynthesis) return;
    stopSpeech();

    // Small delay to ensure cancel() completed
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(story);
      utterance.rate = 0.75;
      utterance.pitch = 0.9;
      utterance.volume = 0.8;

      // Find a nice voice
      const voices = speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        v.lang.startsWith('en') && (
          v.name.toLowerCase().includes('samantha') ||
          v.name.toLowerCase().includes('karen') ||
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('google')
        )
      ) || voices.find(v => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;

      utterance.onend = () => {
        if (mountedRef.current) { setSpeaking(false); setSpeechPaused(false); }
      };
      utterance.onerror = () => {
        if (mountedRef.current) { setSpeaking(false); setSpeechPaused(false); }
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
    <div className="h-full overflow-y-auto">
      <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h2 className="font-serif text-2xl text-forest-900 mb-1">Sleep Stories</h2>
          <p className="text-sand-500 text-sm">ai-generated bedtime stories to drift off to</p>
        </motion.div>

        {/* Theme selector */}
        {!story && !loading && (
          <div>
            <p className="text-sm text-forest-800 mb-3 font-medium">choose a world to drift into...</p>
            <div className="grid grid-cols-2 gap-3">
              {STORY_THEMES.map((theme, i) => (
                <motion.button
                  key={theme.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => generateStory(theme)}
                  className="text-left p-4 bg-white rounded-2xl border border-sand-200 hover:border-dusk-200 hover:shadow-md transition-all active:scale-[0.97]"
                >
                  <span className="text-3xl mb-2 block">{theme.emoji}</span>
                  <p className="font-medium text-forest-900 text-sm">{theme.name}</p>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <Moon className="w-10 h-10 text-dusk-400 mx-auto mb-4 animate-pulse" />
            <p className="text-sand-600 font-medium">weaving your story...</p>
            <p className="text-xs text-sand-400 mt-1">about {selectedTheme?.name}</p>
          </div>
        )}

        {/* Story */}
        {story && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedTheme?.emoji}</span>
                <h3 className="font-serif text-lg text-forest-900">{selectedTheme?.name}</h3>
              </div>
              <button
                onClick={() => { setStory(''); stopSpeech(); }}
                className="text-sm text-sand-500 hover:text-forest-600 flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" /> New
              </button>
            </div>

            <div className="bg-gradient-to-b from-dusk-50 to-warm-50 rounded-2xl border border-dusk-100 p-6 mb-4">
              <p className="text-forest-900 leading-[1.9] text-[15px] whitespace-pre-wrap font-light">
                {story}
              </p>
            </div>

            {/* Read aloud controls */}
            <div className="bg-white rounded-xl border border-sand-200 p-3 flex items-center gap-3">
              <button
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
                  {speaking ? (speechPaused ? 'Paused' : 'Reading aloud...') : 'Read to me'}
                </p>
                <p className="text-xs text-sand-500">uses your device's voice</p>
              </div>
              {speaking && (
                <button onClick={stopSpeech} className="text-xs text-sand-500 hover:text-clay-600 flex-shrink-0">
                  Stop
                </button>
              )}
              {speaking && !speechPaused && (
                <div className="flex items-end gap-0.5 h-5">
                  {[0, 1, 2, 3, 4].map(j => (
                    <div
                      key={j}
                      className="w-0.5 bg-dusk-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${j * 120}ms`, animationDuration: '0.6s', height: `${6 + (j % 3) * 5}px` }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Other themes */}
            <div className="mt-5">
              <p className="text-xs text-sand-500 mb-2">or try another...</p>
              <div className="flex gap-2 flex-wrap">
                {STORY_THEMES.filter(t => t.id !== selectedTheme?.id).map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => generateStory(theme)}
                    className="flex items-center gap-1.5 text-xs bg-white border border-sand-200 hover:border-dusk-200 px-3 py-1.5 rounded-lg transition-colors"
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
