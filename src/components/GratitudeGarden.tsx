import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Check, Share2 } from 'lucide-react';

interface GratEntry {
  id: string;
  text: string;
  category: 'people' | 'experience' | 'small' | 'growth' | 'faith';
  date: string;
}

interface GardenData {
  entries: GratEntry[];
  streak: number;
  lastDate: string;
}

const CATEGORIES = [
  { id: 'people' as const, emoji: '🌹', label: 'People', plant: 'Rose' },
  { id: 'experience' as const, emoji: '🌻', label: 'Experiences', plant: 'Sunflower' },
  { id: 'small' as const, emoji: '🌼', label: 'Small things', plant: 'Daisy' },
  { id: 'growth' as const, emoji: '🌳', label: 'Growth', plant: 'Tree' },
  { id: 'faith' as const, emoji: '🪷', label: 'Faith', plant: 'Lotus' },
];

function loadGarden(): GardenData {
  try { const r = localStorage.getItem('nm_garden'); return r ? JSON.parse(r) : { entries: [], streak: 0, lastDate: '' }; } catch { return { entries: [], streak: 0, lastDate: '' }; }
}
function saveGarden(data: GardenData) { localStorage.setItem('nm_garden', JSON.stringify(data)); }

function getGardenLevel(entries: number, streak: number): { level: number; name: string; emoji: string } {
  const score = entries + streak * 2;
  if (score >= 200) return { level: 6, name: 'Thriving landscape', emoji: '🏞️' };
  if (score >= 100) return { level: 5, name: 'Garden with trees', emoji: '🌳' };
  if (score >= 40) return { level: 4, name: 'Full garden', emoji: '🌺' };
  if (score >= 20) return { level: 3, name: 'Flowers blooming', emoji: '🌸' };
  if (score >= 10) return { level: 2, name: 'Small plant', emoji: '🌱' };
  if (score >= 3) return { level: 1, name: 'First sprout', emoji: '🌿' };
  return { level: 0, name: 'Empty soil', emoji: '🟤' };
}

const MIRA_COMMENTS = [
  "your garden is getting beautiful — just like you honestly",
  "look at what showing up every day creates",
  "even the smallest plants here started with one grateful thought",
  "this is proof that good things grow when you pay attention to them",
  "i love watching this garden grow with you",
];

export default function GratitudeGarden() {
  const [data, setData] = useState<GardenData>(loadGarden);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [category, setCategory] = useState<GratEntry['category']>('small');
  const [addCount, setAddCount] = useState(0); // how many added in this session
  const [showShare, setShowShare] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<GratEntry | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const todayEntries = data.entries.filter(e => e.date === today);
  const todayDone = todayEntries.length >= 3;

  const gardenLevel = useMemo(() => getGardenLevel(data.entries.length, data.streak), [data]);
  const miraComment = MIRA_COMMENTS[data.entries.length % MIRA_COMMENTS.length];

  // Category counts for the garden
  const catCounts = useMemo(() => {
    const c: Record<string, number> = {};
    data.entries.forEach(e => { c[e.category] = (c[e.category] || 0) + 1; });
    return c;
  }, [data.entries]);

  const addEntry = () => {
    if (!text.trim()) return;
    const entry: GratEntry = {
      id: `g_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      text: text.trim(), category, date: today,
    };
    // Update streak
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let streak = data.streak;
    if (data.lastDate === today) { /* already counted */ }
    else if (data.lastDate === yesterday) streak++;
    else streak = 1;

    const updated: GardenData = { entries: [...data.entries, entry], streak, lastDate: today };
    setData(updated);
    saveGarden(updated);
    setText('');
    setAddCount(addCount + 1);
    if (addCount >= 2) setAdding(false); // close after 3
  };

  // ─── GARDEN VISUALIZATION ───
  const renderGarden = () => {
    const lv = gardenLevel.level;
    // Build a row of plant emojis based on actual entries
    const recent = data.entries.slice(-20); // show last 20 plants
    const plantEmoji = (cat: string) => CATEGORIES.find(c => c.id === cat)?.emoji || '🌱';

    return (
      <div className="relative bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-100 rounded-2xl overflow-hidden mb-4" style={{ minHeight: 200 }}>
        {/* Sky */}
        {lv >= 3 && <div className="absolute top-3 right-4 text-lg animate-float">☁️</div>}
        {lv >= 5 && <div className="absolute top-6 left-6 text-sm animate-float" style={{ animationDelay: '2s' }}>🦋</div>}
        {lv >= 6 && <div className="absolute top-4 left-1/3 text-sm animate-float" style={{ animationDelay: '4s' }}>🐦</div>}

        {/* Weather based on mood (use latest mood from today's entries or neutral) */}
        <div className="absolute top-3 left-4 text-xl">
          {data.streak >= 7 ? '☀️' : data.streak >= 3 ? '⛅' : '🌤️'}
        </div>

        {/* Ground */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-amber-800/30 to-transparent" />

        {/* Plants */}
        <div className="flex items-end justify-center gap-1 px-4 pt-16 pb-4 min-h-[180px] flex-wrap">
          {lv === 0 && (
            <p className="text-sand-600 text-sm italic">plant your first seed of gratitude...</p>
          )}
          {recent.map((entry, i) => (
            <motion.button key={entry.id}
              initial={{ scale: 0, y: 10 }} animate={{ scale: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: 'spring', damping: 8 }}
              onClick={() => setViewingEntry(entry)}
              className="text-xl hover:scale-125 transition-transform cursor-pointer"
              title={entry.text}
            >
              {plantEmoji(entry.category)}
            </motion.button>
          ))}
          {lv >= 4 && <span className="text-2xl ml-1">🌳</span>}
          {lv >= 5 && <span className="text-2xl ml-1">🌲</span>}
        </div>

        {/* Level badge */}
        <div className="absolute bottom-2 right-3 bg-white/80 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] text-forest-700 font-medium">
          {gardenLevel.emoji} {gardenLevel.name}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-4">
          <h2 className="font-serif text-2xl text-forest-900 mb-1">Gratitude Garden</h2>
          <p className="text-sand-500 text-sm">
            {data.entries.length} gratitude{data.entries.length !== 1 ? 's' : ''} planted
            {data.streak > 1 ? ` • ${data.streak} day streak 🔥` : ''}
          </p>
        </motion.div>

        {/* Garden */}
        {renderGarden()}

        {/* Entry being viewed */}
        {viewingEntry && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-sand-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">{CATEGORIES.find(c => c.id === viewingEntry.category)?.emoji}</span>
              <button onClick={() => setViewingEntry(null)} className="text-xs text-sand-400 hover:text-sand-600">✕</button>
            </div>
            <p className="text-sm text-forest-900 mb-1">"{viewingEntry.text}"</p>
            <p className="text-[10px] text-sand-500">
              planted on {new Date(viewingEntry.date + 'T00:00:00').toLocaleDateString('en', { month: 'long', day: 'numeric' })}
              {' • '}{CATEGORIES.find(c => c.id === viewingEntry.category)?.plant}
            </p>
          </motion.div>
        )}

        {/* Plant stats */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar">
          {CATEGORIES.map(cat => (
            <div key={cat.id} className="flex items-center gap-1 bg-white rounded-full border border-sand-200 px-2.5 py-1 flex-shrink-0">
              <span className="text-sm">{cat.emoji}</span>
              <span className="text-[10px] text-sand-600 font-medium">{catCounts[cat.id] || 0}</span>
            </div>
          ))}
        </div>

        {/* Mira comment */}
        {data.entries.length >= 5 && (
          <div className="bg-forest-50 rounded-xl border border-forest-200 p-3 mb-4 flex items-start gap-2">
            <span className="text-sm">🌿</span>
            <p className="text-xs text-forest-700 italic">{miraComment}</p>
          </div>
        )}

        {/* Daily gratitude */}
        {!todayDone && !adding && (
          <button onClick={() => { setAdding(true); setAddCount(0); }}
            className="w-full bg-forest-600 hover:bg-forest-700 text-white py-3.5 rounded-2xl font-medium mb-4 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
            <Plus className="w-5 h-5" /> Plant today's gratitude ({3 - todayEntries.length} left)
          </button>
        )}
        {todayDone && !adding && (
          <div className="bg-forest-50 rounded-xl border border-forest-200 p-3 mb-4 text-center">
            <p className="text-sm text-forest-700 font-medium"><Check className="w-4 h-4 inline mr-1" />today's gratitude planted ✨</p>
          </div>
        )}

        {/* Add gratitude form */}
        {adding && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-sand-200 p-5 mb-4">
            <p className="text-sm font-medium text-forest-900 mb-3">
              gratitude {addCount + 1} of 3: what are you grateful for?
            </p>

            <input value={text} onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && text.trim()) addEntry(); }}
              placeholder="i'm grateful for..." autoFocus
              className="w-full px-4 py-3 bg-sand-50 border border-sand-200 rounded-xl text-sm text-forest-900 placeholder:text-sand-400 focus:border-forest-400 mb-3" />

            <div className="flex flex-wrap gap-1.5 mb-3">
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    category === cat.id ? 'bg-forest-600 text-white' : 'bg-sand-100 text-sand-600 hover:bg-sand-200'
                  }`}>
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={addEntry} disabled={!text.trim()}
                className="flex-1 bg-forest-600 hover:bg-forest-700 disabled:bg-sand-300 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1">
                <Plus className="w-4 h-4" /> Plant {CATEGORIES.find(c => c.id === category)?.emoji}
              </button>
              <button onClick={() => setAdding(false)} className="px-4 py-2.5 bg-sand-100 text-sand-600 rounded-xl text-sm">done</button>
            </div>
          </motion.div>
        )}

        {/* Share */}
        <button onClick={() => setShowShare(!showShare)}
          className="w-full bg-white border border-sand-200 hover:border-forest-200 text-forest-700 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 mb-4 transition-colors">
          <Share2 className="w-4 h-4" /> Share My Garden
        </button>

        {showShare && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-gradient-to-br from-forest-700 to-forest-900 rounded-2xl p-8 text-center mb-4">
            <p className="text-forest-300 text-xs mb-2">NeuralMinds</p>
            <div className="flex justify-center gap-1 mb-3">
              {data.entries.slice(-8).map((e, i) => (
                <motion.span key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }}
                  className="text-lg">{CATEGORIES.find(c => c.id === e.category)?.emoji}</motion.span>
              ))}
            </div>
            <p className="text-white font-serif text-lg mb-1">
              i've found {data.entries.length} reasons to be grateful 🌱
            </p>
            <p className="text-forest-400 text-xs">{gardenLevel.emoji} {gardenLevel.name}</p>
          </motion.div>
        )}

        {/* History */}
        {data.entries.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-sand-500 uppercase tracking-wider mb-2">recent gratitude</p>
            <div className="space-y-1.5">
              {[...data.entries].reverse().slice(0, 10).map(entry => (
                <div key={entry.id} className="flex items-center gap-2 bg-white rounded-lg border border-sand-100 px-3 py-2">
                  <span className="text-sm">{CATEGORIES.find(c => c.id === entry.category)?.emoji}</span>
                  <p className="text-xs text-forest-900 flex-1 truncate">{entry.text}</p>
                  <p className="text-[10px] text-sand-400 flex-shrink-0">
                    {new Date(entry.date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
