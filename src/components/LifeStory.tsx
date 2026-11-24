import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Loader2, Share2, ChevronRight, ArrowLeft } from 'lucide-react';
import { UserProfile } from '../utils/types';

import { GROQ_API_KEY } from '../utils/constants';
const API_KEY = GROQ_API_KEY;

interface Chapter {
  id: string;
  number: number;
  title: string;
  monthKey: string;     // "2025-07"
  content: string;
  avgMood: number;
  generatedDate: string;
}

function loadChapters(): Chapter[] {
  try { const r = localStorage.getItem('nm_life_chapters'); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveChapters(chapters: Chapter[]) { localStorage.setItem('nm_life_chapters', JSON.stringify(chapters)); }

async function callAI(prompt: string): Promise<string> {
  const models = ['qwen/qwen3.8-27b', 'allam-2-7b', 'openai/gpt-oss-20b'];
  for (const model of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.85, max_tokens: 500 }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text.replace(/^["']|["']$/g, '').trim();
      }
    } catch {}
  }
  return '';
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

function getMonthName(key: string): string {
  const [year, month] = key.split('-');
  return new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en', { month: 'long', year: 'numeric' });
}

function moodColor(avg: number): string {
  if (avg <= 1.5) return 'from-clay-50 to-clay-100';
  if (avg <= 2.5) return 'from-warm-50 to-orange-50';
  if (avg <= 3.5) return 'from-sand-50 to-warm-50';
  if (avg <= 4.0) return 'from-forest-50 to-emerald-50';
  return 'from-forest-100 to-emerald-100';
}

function moodLabel(avg: number): string {
  if (avg <= 1.5) return 'a tough month';
  if (avg <= 2.5) return 'a challenging month';
  if (avg <= 3.5) return 'a steady month';
  if (avg <= 4.0) return 'a good month';
  return 'a great month';
}

interface LifeStoryProps {
  profile: UserProfile;
}

export default function LifeStory({ profile }: LifeStoryProps) {
  const [chapters, setChapters] = useState<Chapter[]>(loadChapters);
  const [readingChapter, setReadingChapter] = useState<Chapter | null>(null);
  const [generating, setGenerating] = useState(false);
  const [shareChapter, setShareChapter] = useState<Chapter | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // Story stats
  const stats = useMemo(() => {
    const journals = profile.journalEntries || [];
    const firstEntry = profile.moodHistory.length > 0 ? profile.moodHistory[0].date : null;
    const daysSinceStart = firstEntry ? Math.floor((Date.now() - new Date(firstEntry + 'T00:00:00').getTime()) / 86400000) : 0;

    // Most used word in journals
    const allWords = journals.map(j => j.content.toLowerCase()).join(' ').split(/\s+/).filter(w => w.length > 4);
    const wordCount: Record<string, number> = {};
    allWords.forEach(w => { wordCount[w] = (wordCount[w] || 0) + 1; });
    const topWord = Object.entries(wordCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    // Happiest chapter
    const happiest = chapters.length > 0 ? chapters.reduce((best, ch) => ch.avgMood > best.avgMood ? ch : best, chapters[0]) : null;

    return { daysSinceStart, topWord, happiest, chapterCount: chapters.length };
  }, [profile, chapters]);

  // Check if current month chapter can be generated
  const currentMonthKey = getMonthKey(new Date());
  const hasCurrentMonth = chapters.some(c => c.monthKey === currentMonthKey);
  const currentMonthMoods = profile.moodHistory.filter(m => m.date.startsWith(currentMonthKey));
  const canGenerate = currentMonthMoods.length >= 3 && !hasCurrentMonth; // Need at least 3 mood entries

  const generateChapter = async () => {
    setGenerating(true);
    const monthName = getMonthName(currentMonthKey);
    const moods = currentMonthMoods.map(m => `${m.date}: mood ${m.mood}/5 (${m.emotion})`).join('\n');
    const journals = (profile.journalEntries || []).filter(j => j.date.startsWith(currentMonthKey)).map(j => `"${j.content.slice(0, 100)}"`).join('\n');
    const avgMood = currentMonthMoods.reduce((s, m) => s + m.mood, 0) / currentMonthMoods.length;
    const chapterNum = chapters.length + 1;

    const prompt = `Based on this person's mood data and journal entries from ${monthName}:

MOODS:
${moods}

JOURNAL SNIPPETS:
${journals || '(no journal entries this month)'}

Write a short, beautiful first-person narrative chapter (200 words) about their month as if writing their autobiography. Focus on growth, struggles overcome, and patterns you notice. Be warm, literary, and deeply personal. Write in past tense, first person.

Title it exactly: "Chapter ${chapterNum}: ${monthName}"

Start with the title, then the narrative. No meta-commentary.`;

    const content = await callAI(prompt);
    if (content && mountedRef.current) {
      // Extract title from first line
      const lines = content.split('\n').filter(l => l.trim());
      const title = lines[0]?.replace(/^#+\s*/, '').trim() || `Chapter ${chapterNum}: ${monthName}`;
      const body = lines.slice(1).join('\n').trim() || content;

      const chapter: Chapter = {
        id: `ch_${Date.now()}`,
        number: chapterNum,
        title,
        monthKey: currentMonthKey,
        content: body,
        avgMood: Math.round(avgMood * 10) / 10,
        generatedDate: new Date().toISOString().split('T')[0],
      };
      const updated = [...chapters, chapter];
      setChapters(updated);
      saveChapters(updated);
      setReadingChapter(chapter);
    }
    if (mountedRef.current) setGenerating(false);
  };

  // ─── READING VIEW ───
  if (readingChapter) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
          <button onClick={() => setReadingChapter(null)} className="text-sm text-sand-500 hover:text-forest-600 mb-4 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> back to chapters
          </button>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            {/* Chapter card */}
            <div className={`bg-gradient-to-br ${moodColor(readingChapter.avgMood)} rounded-2xl border border-sand-200 p-6 mb-4`}>
              <p className="text-xs text-sand-500 mb-2">{moodLabel(readingChapter.avgMood)} • avg mood {readingChapter.avgMood}/5</p>
              <h3 className="font-serif text-xl text-forest-900 mb-4">{readingChapter.title}</h3>
              <p className="text-forest-900 text-[14.5px] leading-[1.85] whitespace-pre-wrap">{readingChapter.content}</p>
            </div>

            {/* Share button */}
            <div className="flex gap-2">
              <button onClick={() => setShareChapter(readingChapter === shareChapter ? null : readingChapter)}
                className="flex-1 bg-white border border-sand-200 hover:border-forest-200 text-forest-700 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-colors">
                <Share2 className="w-4 h-4" /> Share Chapter
              </button>
            </div>

            {/* Share card (screenshotable) */}
            {shareChapter?.id === readingChapter.id && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="mt-4 bg-gradient-to-br from-forest-800 to-forest-950 rounded-2xl p-8 text-center">
                <p className="text-forest-300 text-xs mb-3">NeuralMinds • My Story</p>
                <p className="font-serif text-lg text-white mb-4 leading-relaxed italic">
                  "{readingChapter.content.split('.').slice(0, 2).join('.')}."
                </p>
                <p className="text-forest-400 text-xs">{readingChapter.title}</p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── MAIN LIST VIEW ───
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <BookOpen className="w-10 h-10 text-forest-400 mx-auto mb-3" />
          <h2 className="font-serif text-2xl text-forest-900 mb-1">My Story</h2>
          <p className="text-sand-500 text-sm">your life, one chapter at a time</p>
        </motion.div>

        {/* Stats */}
        {stats.daysSinceStart > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-5">
            <div className="bg-white rounded-xl border border-sand-200 p-3 text-center">
              <p className="font-serif text-xl text-forest-900">{stats.daysSinceStart}</p>
              <p className="text-[10px] text-sand-500">days since start</p>
            </div>
            <div className="bg-white rounded-xl border border-sand-200 p-3 text-center">
              <p className="font-serif text-xl text-forest-900">{stats.chapterCount}</p>
              <p className="text-[10px] text-sand-500">chapters written</p>
            </div>
            {stats.topWord !== '—' && (
              <div className="bg-white rounded-xl border border-sand-200 p-3 text-center">
                <p className="font-serif text-lg text-forest-900">"{stats.topWord}"</p>
                <p className="text-[10px] text-sand-500">most used word</p>
              </div>
            )}
            {stats.happiest && (
              <div className="bg-white rounded-xl border border-sand-200 p-3 text-center">
                <p className="font-serif text-lg text-forest-900">{getMonthName(stats.happiest.monthKey).split(' ')[0]}</p>
                <p className="text-[10px] text-sand-500">happiest chapter</p>
              </div>
            )}
          </div>
        )}

        {/* Generate button */}
        {canGenerate && (
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={generateChapter} disabled={generating}
            className="w-full bg-gradient-to-r from-forest-600 to-forest-700 hover:from-forest-700 hover:to-forest-800 disabled:from-sand-400 disabled:to-sand-500 text-white py-3.5 rounded-2xl font-medium mb-5 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
            {generating ? <><Loader2 className="w-5 h-5 animate-spin" /> writing your chapter...</> : <><BookOpen className="w-5 h-5" /> Generate {getMonthName(currentMonthKey)} Chapter</>}
          </motion.button>
        )}
        {!canGenerate && chapters.length === 0 && currentMonthMoods.length < 3 && (
          <div className="bg-warm-50 rounded-2xl border border-warm-200 p-4 mb-5 text-center">
            <p className="text-sm text-warm-700">log at least 3 moods this month to generate your first chapter</p>
            <p className="text-xs text-warm-500 mt-1">{currentMonthMoods.length}/3 so far</p>
          </div>
        )}

        {/* Chapter list */}
        {chapters.length > 0 ? (
          <div className="space-y-3">
            {[...chapters].reverse().map((ch, i) => (
              <motion.button key={ch.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setReadingChapter(ch)}
                className={`w-full text-left bg-gradient-to-br ${moodColor(ch.avgMood)} rounded-2xl border border-sand-200 p-5 hover:shadow-sm transition-all active:scale-[0.98]`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-lg text-forest-900 mb-1">{ch.title}</p>
                    <p className="text-sm text-forest-800/70 line-clamp-2 leading-relaxed">{ch.content.slice(0, 100)}...</p>
                    <p className="text-[10px] text-sand-500 mt-2">mood: {ch.avgMood}/5 • {moodLabel(ch.avgMood)}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-sand-400 mt-1 flex-shrink-0" />
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sand-500 text-sm">your story hasn't started yet.</p>
            <p className="text-sand-400 text-xs mt-1">keep checking in — your first chapter will write itself.</p>
          </div>
        )}
      </div>
    </div>
  );
}
