import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw, ExternalLink, Leaf, AlertTriangle } from 'lucide-react';

import { GROQ_API_KEY } from '../utils/constants';
const API_KEY = GROQ_API_KEY;

interface Category {
  id: string;
  emoji: string;
  label: string;
  prompt: string;
  heavy?: boolean; // shows mental health note
  good?: boolean;  // green styling
}

const CATEGORIES: Category[] = [
  {
    id: 'world', emoji: '🌐', label: 'World', heavy: true,
    prompt: 'Give me 3 important recent world news stories. For each story provide: a bold headline, then "What happened:" (2-3 sentences), "Where:" (country/region), "Why it matters:" (1-2 sentences). Make stories factual, balanced, and concise. Separate stories with ---. Do NOT add numbering.',
  },
  {
    id: 'business', emoji: '💰', label: 'Business',
    prompt: 'Give me 3 recent business and economy news stories. For each: a bold headline, "What happened:" (2-3 sentences about markets, companies, or economic trends), "Where:" (which market/country), "Why it matters:" (1-2 sentences). Separate with ---.',
  },
  {
    id: 'scitech', emoji: '🔬', label: 'Sci & Tech',
    prompt: 'Give me 3 recent science and technology news stories. For each: a bold headline, "What happened:" (2-3 sentences about discoveries, launches, breakthroughs, or tech developments), "Where:", "Why it matters:". Separate with ---.',
  },
  {
    id: 'sports', emoji: '⚽', label: 'Sports',
    prompt: 'Give me 3 recent sports news stories from around the world. For each: a bold headline, "What happened:" (2-3 sentences about games, tournaments, records, or transfers), "Where:", "Why it matters:". Cover diverse sports. Separate with ---.',
  },
  {
    id: 'entertainment', emoji: '🎭', label: 'Entertainment',
    prompt: 'Give me 3 recent entertainment news stories. For each: a bold headline, "What happened:" (2-3 sentences about movies, music, TV, awards, or celebrity news), "Where:", "Why it matters:". Separate with ---.',
  },
  {
    id: 'health', emoji: '🏥', label: 'Health', heavy: true,
    prompt: 'Give me 3 recent health and medical news stories. For each: a bold headline, "What happened:" (2-3 sentences about medical research, public health, or wellness discoveries), "Where:", "Why it matters:". Separate with ---.',
  },
  {
    id: 'environment', emoji: '🌱', label: 'Environment',
    prompt: 'Give me 3 recent environment and climate news stories. For each: a bold headline, "What happened:" (2-3 sentences about climate action, conservation, or environmental events), "Where:", "Why it matters:". Separate with ---.',
  },
  {
    id: 'good', emoji: '✨', label: 'Good News', good: true,
    prompt: 'Give me 3 genuinely uplifting and positive global news stories. Focus on: human kindness, scientific breakthroughs that help people, environmental wins, community heroes, or heartwarming events. For each: a bold headline, "What happened:" (2-3 sentences), "Where:", "Why it matters:". Make the reader smile. Separate with ---.',
  },
];

const NEWS_LINKS = [
  { name: 'BBC News', url: 'https://www.bbc.com/news' },
  { name: 'AP News', url: 'https://apnews.com' },
  { name: 'Ground News', url: 'https://ground.news' },
  { name: 'Inshorts', url: 'https://inshorts.com' },
];

const GROUNDING_TIPS = [
  'try the 5-4-3-2-1 grounding: name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.',
  'take 3 slow breaths: in for 4 counts, hold for 4, out for 6. your body will thank you.',
  'put your hand on your chest and feel your heartbeat for 10 seconds. you\'re here. you\'re okay.',
  'look out the window or at something green nearby. nature resets the nervous system.',
  'wiggle your toes, stretch your fingers, roll your shoulders. come back to your body for a moment.',
];

function parseStories(raw: string): string[] {
  // Split by --- or *** separator lines
  const parts = raw.split(/\n\s*---\s*\n|\n\s*\*\*\*\s*\n|\n\s*-{3,}\s*\n/);
  return parts.map(p => p.trim()).filter(p => p.length > 20);
}

export default function NewsSection() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [stories, setStories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [groundingTip] = useState(() => GROUNDING_TIPS[Math.floor(Math.random() * GROUNDING_TIPS.length)]);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; if (abortRef.current) abortRef.current.abort(); };
  }, []);

  const loadNews = async (cat: Category) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setActiveCategory(cat.id);
    setContent('');
    setStories([]);
    setLoading(true);

    const systemPrompt = `You are a neutral, factual news summarizer. Summarize recent and significant global news stories. Be balanced — do not show political bias. Write in a clear, journalistic style. Each story should feel like a brief news bulletin. Use the format requested. Do not add disclaimers or meta-commentary. Just give the news summaries directly.`;

    try {
      const models = ['qwen/qwen3.8-27b', 'allam-2-7b', 'openai/gpt-oss-20b'];
      let generated = false;

      for (const model of models) {
        if (generated || ctrl.signal.aborted) break;
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: cat.prompt },
              ],
              temperature: 0.5,
              max_tokens: 1500,
            }),
            signal: ctrl.signal,
          });

          if (res.ok && !ctrl.signal.aborted) {
            const data = await res.json();
            const text = data.choices?.[0]?.message?.content;
            if (text && mountedRef.current) {
              const cleaned = text.replace(/^["']|["']$/g, '').trim();
              setContent(cleaned);
              setStories(parseStories(cleaned));
              generated = true;
            }
          }
        } catch { /* next model */ }
      }

      if (!generated && mountedRef.current && !ctrl.signal.aborted) {
        setContent('could not load news right now. try again in a moment or check the links below for live news.');
        setStories([]);
      }
    } catch {
      if (mountedRef.current) {
        setContent('something went wrong. try again?');
        setStories([]);
      }
    }

    if (mountedRef.current && !ctrl.signal.aborted) setLoading(false);
  };

  const activeCat = CATEGORIES.find(c => c.id === activeCategory);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 pb-24 md:pb-8 max-w-2xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <h2 className="font-serif text-2xl text-forest-900 mb-1">News</h2>
          <p className="text-sand-500 text-sm">ai-summarized global news, bite-sized</p>
        </motion.div>

        {/* Category filter buttons */}
        <div className="flex flex-wrap gap-2 mb-5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => loadNews(cat)}
              disabled={loading}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-[0.96] disabled:opacity-60 ${
                activeCategory === cat.id
                  ? cat.good
                    ? 'bg-green-600 text-white shadow-md shadow-green-600/20'
                    : 'bg-forest-600 text-white shadow-md shadow-forest-600/20'
                  : cat.good
                    ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                    : 'bg-white text-forest-800 border border-sand-200 hover:border-forest-200 hover:bg-forest-50/50'
              }`}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-16">
              <Loader2 className="w-8 h-8 text-forest-400 animate-spin mx-auto mb-3" />
              <p className="text-sand-500 text-sm">fetching {activeCat?.label?.toLowerCase()} news...</p>
            </motion.div>
          ) : stories.length > 0 ? (
            <motion.div key="stories" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-4">
              {/* Stories */}
              {stories.map((story, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-white rounded-2xl border border-sand-200 p-5 hover:shadow-sm transition-shadow"
                >
                  <p className="text-forest-900 text-[14.5px] leading-[1.8] whitespace-pre-wrap">
                    {story}
                  </p>
                </motion.div>
              ))}

              {/* Refresh */}
              <div className="flex justify-center">
                <button onClick={() => activeCat && loadNews(activeCat)}
                  className="flex items-center gap-1.5 text-sm text-forest-600 hover:text-forest-700 font-medium transition-colors">
                  <RefreshCw className="w-4 h-4" /> load different stories
                </button>
              </div>

              {/* Mental health note for heavy categories */}
              {activeCat?.heavy && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  className="bg-forest-50 border border-forest-200 rounded-xl p-4 flex items-start gap-3">
                  <Leaf className="w-5 h-5 text-forest-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-forest-800 mb-1">
                      this is heavy news. here's a grounding tip if you need it 🌱
                    </p>
                    <p className="text-sm text-forest-600">{groundingTip}</p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : content && !loading ? (
            <motion.div key="fallback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="bg-white rounded-2xl border border-sand-200 p-5">
              <p className="text-forest-900 text-[14.5px] leading-[1.8] whitespace-pre-wrap">{content}</p>
            </motion.div>
          ) : (
            /* Empty state */
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-12">
              <span className="text-4xl block mb-4">📰</span>
              <p className="text-forest-900 font-medium mb-1">tap a category to get started</p>
              <p className="text-sand-500 text-sm">ai-powered news summaries in seconds</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Disclaimer */}
        <div className="mt-6 mb-4 flex items-start gap-2 bg-warm-50 border border-warm-200 rounded-xl p-3">
          <AlertTriangle className="w-4 h-4 text-warm-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-warm-700 leading-relaxed">
            AI-generated summaries based on training data. For live breaking news, use the links below.
          </p>
        </div>

        {/* Quick links to real news */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-sand-500 uppercase tracking-wider">live news sources</p>
          <div className="grid grid-cols-2 gap-2">
            {NEWS_LINKS.map(link => (
              <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between bg-white rounded-xl border border-sand-200 p-3 hover:border-forest-200 hover:shadow-sm transition-all group">
                <span className="text-sm font-medium text-forest-800">{link.name}</span>
                <ExternalLink className="w-3.5 h-3.5 text-sand-400 group-hover:text-forest-600" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
