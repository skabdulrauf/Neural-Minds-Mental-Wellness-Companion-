import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Send, Heart } from 'lucide-react';

import { GROQ_API_KEY } from '../utils/constants';
const API_KEY = GROQ_API_KEY;

interface Situation {
  id: string;
  emoji: string;
  title: string;
  color: string;
  systemPrompt: string;
  openingPrompt: string;
  hasTracker?: boolean; // breakup day counter
  hasNoContact?: boolean;
  hasDraftHelp?: boolean;
  hasChallenges?: boolean;
}

const SITUATIONS: Situation[] = [
  {
    id: 'breakup', emoji: '💔', title: 'Going through a breakup', color: 'from-rose-50 to-pink-100',
    systemPrompt: 'You are Mira helping someone through a breakup. Be warm, real, never dismiss their pain. Never say "you\'ll find someone better." Acknowledge the grief. Help them process day by day. One question per response. Casual, lowercase.',
    openingPrompt: 'I\'m going through a breakup. It hurts.',
    hasTracker: true, hasNoContact: true,
  },
  {
    id: 'conflict', emoji: '😤', title: 'Conflict with someone', color: 'from-orange-50 to-amber-100',
    systemPrompt: 'You are Mira helping someone through interpersonal conflict. Listen first. Help them see both sides without dismissing their feelings. Help them communicate better. Never take sides blindly. Lowercase, casual.',
    openingPrompt: 'I\'m having a conflict with someone important to me.',
    hasDraftHelp: true,
  },
  {
    id: 'anxiety', emoji: '💑', title: 'Relationship anxiety', color: 'from-violet-50 to-purple-100',
    systemPrompt: 'You are Mira helping someone with relationship anxiety — fear of abandonment, jealousy, overthinking, attachment issues. Be understanding. Help them distinguish between intuition and anxiety. Never minimize. Lowercase.',
    openingPrompt: 'I keep feeling anxious in my relationship. Like something bad is going to happen.',
  },
  {
    id: 'family', emoji: '👨‍👩‍👧', title: 'Family tension', color: 'from-sky-50 to-blue-100',
    systemPrompt: 'You are Mira helping someone with family issues. Family dynamics are complex. Validate their feelings without demonizing their family. Help with boundaries. Cultural sensitivity is important. Lowercase.',
    openingPrompt: 'Things are really tense with my family right now.',
  },
  {
    id: 'friendship', emoji: '👫', title: 'Friendship problems', color: 'from-emerald-50 to-green-100',
    systemPrompt: 'You are Mira helping with friendship issues — drifting apart, betrayal, one-sided friendships, friend groups. Friendship grief is real and underacknowledged. Validate it. Lowercase.',
    openingPrompt: 'I\'m struggling with a friendship situation.',
  },
  {
    id: 'loneliness', emoji: '😶', title: 'Loneliness & isolation', color: 'from-indigo-50 to-blue-100',
    systemPrompt: 'You are Mira being a warm companion to someone who feels deeply alone. Don\'t say "just go meet people." Acknowledge that loneliness is one of the most painful human experiences. Be genuinely curious about them. Ask about their day, interests, what they\'re watching. Be a real presence. Lowercase.',
    openingPrompt: 'I feel really alone. Like nobody actually cares.',
    hasChallenges: true,
  },
  {
    id: 'work', emoji: '💼', title: 'Work relationships', color: 'from-amber-50 to-yellow-100',
    systemPrompt: 'You are Mira helping with workplace relationship issues — toxic boss, difficult coworker, feeling undervalued, office politics. Be practical and empathetic. Help with boundaries and communication. Lowercase.',
    openingPrompt: 'I\'m having issues with someone at work and it\'s affecting me.',
  },
];

interface Message { role: 'user' | 'assistant'; content: string; }

interface BreakupData { startDate: string; }

const CONNECTION_CHALLENGES = [
  'smile at one stranger today',
  'text someone you haven\'t talked to in a while',
  'compliment someone genuinely',
  'join one online community about something you love',
  'call someone instead of texting',
  'write a message to someone you appreciate',
  'ask someone "how are you really doing?"',
];

function loadBreakupData(): BreakupData | null {
  try { const r = localStorage.getItem('nm_breakup'); return r ? JSON.parse(r) : null; } catch { return null; }
}
function saveBreakupData(data: BreakupData) { localStorage.setItem('nm_breakup', JSON.stringify(data)); }

async function callAI(messages: { role: string; content: string }[]): Promise<string> {
  const models = ['qwen/qwen3.8-27b', 'allam-2-7b', 'openai/gpt-oss-20b'];
  for (const model of models) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: 0.85, max_tokens: 300 }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text.replace(/^["']|["']$/g, '').trim();
      }
    } catch {}
  }
  return 'sorry, something glitched. try again?';
}

export default function RelationshipSupport() {
  const [situation, setSituation] = useState<Situation | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [breakupData, setBreakupData] = useState<BreakupData | null>(loadBreakupData);
  const [showDraft, setShowDraft] = useState(false);
  const [draftInput, setDraftInput] = useState('');
  const [draftResult, setDraftResult] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversation]);

  const startSituation = async (sit: Situation) => {
    setSituation(sit);
    setConversation([]);
    setLoading(true);
    setShowDraft(false);
    setDraftResult('');

    const response = await callAI([
      { role: 'system', content: sit.systemPrompt },
      { role: 'user', content: sit.openingPrompt },
    ]);

    if (mountedRef.current) {
      setConversation([{ role: 'assistant', content: response }]);
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending || !situation) return;
    const text = input.trim();
    const userMsg: Message = { role: 'user', content: text };
    const newConv = [...conversation, userMsg];
    setConversation(newConv);
    setInput('');
    setSending(true);

    const msgs = [
      { role: 'system', content: situation.systemPrompt },
      { role: 'user', content: situation.openingPrompt },
      ...newConv.map(m => ({ role: m.role, content: m.content })),
    ];
    const response = await callAI(msgs);
    if (mountedRef.current) {
      setConversation(prev => [...prev, { role: 'assistant', content: response }]);
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleNoContact = async () => {
    if (!situation) return;
    setLoading(true);
    const response = await callAI([
      { role: 'system', content: "You are Mira. The user is about to text their ex. Stop them gently but firmly. Say: 'don't. tell me what you want to say to them instead.' Then listen. Lowercase, warm, real." },
      { role: 'user', content: 'I want to text my ex right now.' },
    ]);
    if (mountedRef.current) {
      setConversation(prev => [...prev, { role: 'assistant', content: response }]);
      setLoading(false);
    }
  };

  const handleDraft = async () => {
    if (!draftInput.trim()) return;
    setDraftLoading(true);
    const response = await callAI([
      { role: 'system', content: "Help draft a message that expresses the user's feelings honestly but opens dialogue rather than creating defensiveness. Keep their voice. Not therapy speak. Suggest 2 versions: one direct and one softer. Lowercase." },
      { role: 'user', content: `I want to say this to someone: "${draftInput.trim()}" Help me say it better.` },
    ]);
    if (mountedRef.current) { setDraftResult(response); setDraftLoading(false); }
  };

  const breakupDays = breakupData ? Math.max(0, Math.floor((Date.now() - new Date(breakupData.startDate + 'T00:00:00').getTime()) / 86400000)) : 0;
  const todayChallenge = CONNECTION_CHALLENGES[new Date().getDate() % CONNECTION_CHALLENGES.length];

  // ─── SITUATION PICKER ───
  if (!situation) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
            <Heart className="w-10 h-10 text-clay-400 mx-auto mb-3" />
            <h2 className="font-serif text-2xl text-forest-900 mb-1">Relationship Support</h2>
            <p className="text-sand-500 text-sm">what are you going through?</p>
          </motion.div>

          <div className="space-y-3">
            {SITUATIONS.map((sit, i) => (
              <motion.button key={sit.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => startSituation(sit)}
                className={`w-full text-left bg-gradient-to-r ${sit.color} rounded-2xl border border-sand-200 p-4 hover:shadow-sm transition-all active:scale-[0.98]`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{sit.emoji}</span>
                  <p className="font-medium text-forest-900 text-sm">{sit.title}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── ACTIVE CONVERSATION ───
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2 border-b border-sand-200 flex items-center gap-3">
        <button onClick={() => { setSituation(null); setConversation([]); }}
          className="w-8 h-8 rounded-lg bg-sand-100 hover:bg-sand-200 flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-sand-600" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-lg">{situation.emoji}</span>
          <p className="font-serif text-lg text-forest-900 truncate">{situation.title}</p>
        </div>
      </div>

      {/* Breakup tracker */}
      {situation.hasTracker && (
        <div className="px-4 py-2 bg-rose-50 border-b border-rose-200">
          {breakupData ? (
            <div className="flex items-center justify-between">
              <p className="text-xs text-rose-700 font-medium">day {breakupDays} since your breakup</p>
              {breakupDays === 3 && <span className="text-xs text-rose-600">💪 3 days — the hardest part</span>}
              {breakupDays === 7 && <span className="text-xs text-rose-600">🌱 1 week — you're doing it</span>}
              {breakupDays === 30 && <span className="text-xs text-rose-600">✨ 1 month — look how far you've come</span>}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-xs text-rose-600">when did it happen?</p>
              <input type="date" className="text-xs bg-white border border-rose-200 rounded-lg px-2 py-1"
                onChange={e => { if (e.target.value) { const d = { startDate: e.target.value }; setBreakupData(d); saveBreakupData(d); } }} />
            </div>
          )}
        </div>
      )}

      {/* Loneliness challenge */}
      {situation.hasChallenges && (
        <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-200">
          <p className="text-xs text-indigo-700"><span className="font-medium">today's connection challenge:</span> {todayChallenge}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-lg mx-auto space-y-4">
          {loading && conversation.length === 0 && (
            <div className="text-center py-12">
              <Loader2 className="w-6 h-6 text-forest-400 animate-spin mx-auto mb-2" />
              <p className="text-sm text-sand-500">mira is here...</p>
            </div>
          )}

          {conversation.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'chat-bubble-user px-4 py-3' : 'bg-white rounded-2xl border border-sand-200 p-4'}`}>
                <p className={`text-[14.5px] leading-[1.75] whitespace-pre-wrap ${msg.role === 'user' ? 'text-white' : 'text-forest-900'}`}>
                  {msg.content}
                </p>
              </div>
            </motion.div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl border border-sand-200 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-forest-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-forest-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-forest-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* Tools bar */}
      {(situation.hasNoContact || situation.hasDraftHelp) && (
        <div className="px-4 py-2 border-t border-sand-100 flex gap-2">
          {situation.hasNoContact && (
            <button onClick={handleNoContact} disabled={loading || sending}
              className="text-xs bg-rose-50 text-rose-600 border border-rose-200 px-3 py-1.5 rounded-lg font-medium hover:bg-rose-100 transition-colors disabled:opacity-50">
              🚫 No Contact Support
            </button>
          )}
          {situation.hasDraftHelp && (
            <button onClick={() => setShowDraft(!showDraft)}
              className="text-xs bg-forest-50 text-forest-600 border border-forest-200 px-3 py-1.5 rounded-lg font-medium hover:bg-forest-100 transition-colors">
              ✍️ Help me draft a message
            </button>
          )}
        </div>
      )}

      {/* Draft helper */}
      {showDraft && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
          className="px-4 py-3 border-t border-sand-200 bg-forest-50">
          <p className="text-xs text-forest-700 font-medium mb-2">what do you want to say to them?</p>
          <div className="flex gap-2 mb-2">
            <input value={draftInput} onChange={e => setDraftInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleDraft(); }}
              placeholder="type the raw version..."
              className="flex-1 px-3 py-2 bg-white border border-forest-200 rounded-lg text-sm placeholder:text-sand-400 focus:border-forest-400" />
            <button onClick={handleDraft} disabled={!draftInput.trim() || draftLoading}
              className="px-3 py-2 bg-forest-600 hover:bg-forest-700 disabled:bg-sand-300 text-white rounded-lg text-sm">
              {draftLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'draft'}
            </button>
          </div>
          {draftResult && <p className="text-sm text-forest-800 leading-relaxed bg-white rounded-lg p-3 border border-forest-100">{draftResult}</p>}
        </motion.div>
      )}

      {/* Input */}
      <div className="flex-shrink-0 border-t border-sand-200 bg-white/80 backdrop-blur-xl px-4 py-3 pb-20 md:pb-3">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && input.trim()) sendMessage(); }}
            placeholder="talk to mira..." disabled={loading || sending}
            className="flex-1 px-4 py-3 bg-white border border-sand-200 rounded-2xl text-sm text-forest-900 placeholder:text-sand-400 focus:border-forest-400 disabled:opacity-60 transition-all" />
          <button onClick={sendMessage} disabled={!input.trim() || sending}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 ${
              input.trim() && !sending ? 'bg-forest-600 hover:bg-forest-700 text-white shadow-md active:scale-95' : 'bg-sand-100 text-sand-400'
            }`}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
