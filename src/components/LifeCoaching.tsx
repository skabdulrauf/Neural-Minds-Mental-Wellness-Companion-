import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Send, RefreshCw } from 'lucide-react';

import { GROQ_API_KEY } from '../utils/constants';
const API_KEY = GROQ_API_KEY;

interface Topic {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
  systemPrompt: string;
  openingPrompt: string;
}

const TOPICS: Topic[] = [
  {
    id: 'motivation', emoji: '🌅', title: 'Daily Motivation', subtitle: 'a personal pep talk',
    color: 'from-amber-50 to-orange-100',
    systemPrompt: 'You are a warm, genuine life coach giving a personalized motivational message. Sound like a friend who really believes in them — not a generic poster quote. Be specific, use real examples, reference time of day or common struggles. Short paragraphs, casual but powerful. 3-4 paragraphs max.',
    openingPrompt: 'Give me a personalized motivational message for right now. Make it feel like it was written just for me, not a generic quote. Reference the fact that I showed up today, opened this app, and that counts for something.',
  },
  {
    id: 'productivity', emoji: '⏱️', title: 'Productivity Coach', subtitle: 'get stuff done without burnout',
    color: 'from-blue-50 to-indigo-100',
    systemPrompt: 'You are a practical, no-BS productivity coach. You know about Pomodoro technique, time blocking, the 2-minute rule, eating the frog, and beating procrastination. Give actionable advice, not theory. Be warm but direct. Acknowledge that executive dysfunction and ADHD are real. Never shame someone for struggling.',
    openingPrompt: 'I need help being more productive. Give me one concrete technique I can start RIGHT NOW — not tomorrow, not next week. Something small that actually works. Explain it like I have zero motivation to start.',
  },
  {
    id: 'relationships', emoji: '❤️', title: 'Relationship Advice', subtitle: 'communicate better, set boundaries',
    color: 'from-rose-50 to-pink-100',
    systemPrompt: 'You are a thoughtful relationship coach. You help with healthy communication, setting boundaries, recognizing toxic patterns, navigating conflict, and building deeper connections. You never take sides blindly. You ask clarifying questions. You validate feelings first, then offer perspective. Never preachy.',
    openingPrompt: 'Share one key insight about healthy relationships that most people get wrong. Something that would actually change how I interact with people I care about. Make it practical.',
  },
  {
    id: 'study', emoji: '📚', title: 'Study & Career', subtitle: 'study tips, interview prep, career growth',
    color: 'from-violet-50 to-purple-100',
    systemPrompt: 'You are a practical study and career coach. You help with study techniques (active recall, spaced repetition, Feynman method), interview preparation, resume tips, career anxiety, imposter syndrome, and choosing career paths. Be encouraging but realistic. Give specific, actionable steps.',
    openingPrompt: 'Give me one study or career tip that most people overlook but actually makes a huge difference. Something backed by research, explained simply.',
  },
  {
    id: 'wellness', emoji: '🏃', title: 'Physical Wellness', subtitle: 'body + mind connection',
    color: 'from-emerald-50 to-green-100',
    systemPrompt: 'You are a friendly wellness coach who understands the deep connection between physical and mental health. You suggest simple exercises, basic nutrition guidance, sleep hygiene, and movement for people who may be depressed or anxious. Never body-shame. Never push extreme fitness. Meet people where they are. "A 5-minute walk counts" energy.',
    openingPrompt: 'I want to feel better physically but I have zero energy and motivation. Give me the absolute smallest step I can take today — something so easy it feels almost silly. Then explain why even that tiny step matters for my mental health.',
  },
  {
    id: 'finance', emoji: '💸', title: 'Finance Stress', subtitle: 'money anxiety, budgeting basics',
    color: 'from-emerald-50 to-teal-100',
    systemPrompt: 'You are a compassionate financial wellness coach. You acknowledge that financial anxiety is real and devastating. You help with basic budgeting mindset, the 50/30/20 rule, breaking the shame cycle around money, and small steps toward financial awareness. You NEVER judge someone\'s spending. You NEVER assume their income level. You validate the stress first.',
    openingPrompt: 'Money stress is eating me alive. I don\'t need a lecture about saving — I need someone to acknowledge how hard this is, and then give me ONE tiny step that could help me feel slightly more in control.',
  },
  {
    id: 'grief', emoji: '🕊️', title: 'Grief Support', subtitle: 'empathetic space for loss',
    color: 'from-slate-50 to-gray-100',
    systemPrompt: 'You are a deeply empathetic grief companion. You understand that grief is not linear, there are no stages that apply to everyone, and sometimes people just need to be heard. You never say "they\'re in a better place" or "time heals all wounds." You sit with the pain. You validate. You share gentle wisdom only when appropriate. You acknowledge that grief can be for anything — a person, a pet, a relationship, a version of yourself.',
    openingPrompt: 'I\'m going through a loss. I don\'t need advice or platitudes. Just... talk to me like someone who gets it. Acknowledge that grief is messy and doesn\'t follow rules. Make me feel less alone in this.',
  },
  {
    id: 'loneliness', emoji: '🤝', title: 'Loneliness Companion', subtitle: 'you\'re not alone right now',
    color: 'from-sky-50 to-blue-100',
    systemPrompt: 'You are a warm, present companion for someone who feels deeply alone. You don\'t try to fix it immediately. You don\'t say "just go meet people." You acknowledge that loneliness is one of the most painful human experiences. You have a genuine, extended conversation — ask about their day, their interests, what they\'ve been watching or thinking about. Be a real presence. Be curious about them as a person.',
    openingPrompt: 'I feel really alone right now. I don\'t want advice, I just want to feel like someone actually cares that I exist. Talk to me like a real friend would — ask me something, be curious about me, make me feel seen.',
  },
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

async function callAI(messages: { role: string; content: string }[], signal?: AbortSignal): Promise<string> {
  const models = ['qwen/qwen3.8-27b', 'allam-2-7b', 'openai/gpt-oss-20b'];
  for (const model of models) {
    if (signal?.aborted) break;
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: 0.85, max_tokens: 800 }),
        signal,
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text.replace(/^["']|["']$/g, '').trim();
      }
    } catch { /* next model */ }
  }
  return 'sorry, something went wrong. try again?';
}

interface LifeCoachingProps {
  profile?: any;
}

export default function LifeCoaching(_props: LifeCoachingProps = {}) {
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [followUp, setFollowUp] = useState('');
  const [sending, setSending] = useState(false);
  const contentEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; if (abortRef.current) abortRef.current.abort(); };
  }, []);

  useEffect(() => {
    contentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const startTopic = async (topic: Topic) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setActiveTopic(topic);
    setConversation([]);
    setFollowUp('');
    setLoading(true);

    const msgs = [
      { role: 'system', content: topic.systemPrompt },
      { role: 'user', content: topic.openingPrompt },
    ];

    const response = await callAI(msgs, ctrl.signal);

    if (mountedRef.current && !ctrl.signal.aborted) {
      setConversation([{ role: 'assistant', content: response }]);
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  };

  const sendFollowUp = async () => {
    const text = followUp.trim();
    if (!text || sending || !activeTopic) return;

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const userMsg: Message = { role: 'user', content: text };
    const newConversation = [...conversation, userMsg];
    setConversation(newConversation);
    setFollowUp('');
    setSending(true);

    // Build full message history for context
    const msgs = [
      { role: 'system', content: activeTopic.systemPrompt },
      // Include the hidden opening prompt as first user message for context
      { role: 'user', content: activeTopic.openingPrompt },
      ...newConversation.map(m => ({ role: m.role, content: m.content })),
    ];

    const response = await callAI(msgs, ctrl.signal);

    if (mountedRef.current && !ctrl.signal.aborted) {
      setConversation(prev => [...prev, { role: 'assistant', content: response }]);
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const regenerate = async () => {
    if (!activeTopic || loading) return;
    await startTopic(activeTopic);
  };

  // Topic grid
  if (!activeTopic) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <h2 className="font-serif text-2xl text-forest-900 mb-1">Life Coaching</h2>
            <p className="text-sand-500 text-sm">pick a topic, get real guidance</p>
          </motion.div>

          <div className="grid grid-cols-2 gap-3">
            {TOPICS.map((topic, i) => (
              <motion.button key={topic.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => startTopic(topic)}
                className={`text-left p-4 rounded-2xl bg-gradient-to-br ${topic.color} border border-sand-200 hover:shadow-md transition-all active:scale-[0.97]`}>
                <span className="text-2xl block mb-2">{topic.emoji}</span>
                <p className="font-medium text-forest-900 text-sm leading-tight">{topic.title}</p>
                <p className="text-xs text-sand-600 mt-0.5">{topic.subtitle}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Conversation view
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2 border-b border-sand-200 flex items-center gap-3">
        <button onClick={() => { setActiveTopic(null); setConversation([]); if (abortRef.current) abortRef.current.abort(); }}
          className="w-8 h-8 rounded-lg bg-sand-100 hover:bg-sand-200 flex items-center justify-center transition-colors">
          <ArrowLeft className="w-4 h-4 text-sand-600" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xl">{activeTopic.emoji}</span>
          <p className="font-serif text-lg text-forest-900 truncate">{activeTopic.title}</p>
        </div>
        <button onClick={regenerate} disabled={loading || sending}
          className="text-sand-500 hover:text-forest-600 disabled:opacity-40 transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 pb-4">
        <div className="max-w-lg mx-auto space-y-4">
          {/* Loading state */}
          {loading && conversation.length === 0 && (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 text-forest-400 animate-spin mx-auto mb-3" />
              <p className="text-sand-500 text-sm">thinking about this...</p>
            </div>
          )}

          {/* Conversation messages */}
          {conversation.map((msg, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i === conversation.length - 1 ? 0.1 : 0 }}
              className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
            >
              <div className={`max-w-[90%] ${
                msg.role === 'user'
                  ? 'chat-bubble-user px-4 py-3'
                  : 'bg-white rounded-2xl border border-sand-200 p-5'
              }`}>
                <p className={`text-[14.5px] leading-[1.8] whitespace-pre-wrap ${
                  msg.role === 'user' ? 'text-white' : 'text-forest-900'
                }`}>
                  {msg.content}
                </p>
              </div>
            </motion.div>
          ))}

          {/* AI typing indicator */}
          {sending && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex justify-start">
              <div className="bg-white rounded-2xl border border-sand-200 px-5 py-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-forest-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-forest-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-forest-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={contentEndRef} />
        </div>
      </div>

      {/* Follow-up input */}
      <div className="flex-shrink-0 border-t border-sand-200 bg-white/80 backdrop-blur-xl px-4 py-3 pb-20 md:pb-3">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={followUp}
            onChange={e => setFollowUp(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && followUp.trim()) sendFollowUp(); }}
            placeholder="ask a follow-up..."
            disabled={loading || sending}
            maxLength={500}
            className="flex-1 px-4 py-3 bg-white border border-sand-200 rounded-2xl text-forest-900 text-sm placeholder:text-sand-400 transition-all focus:border-forest-400 focus:shadow-[0_0_0_3px_rgba(93,163,132,0.1)] disabled:opacity-60"
          />
          <button onClick={sendFollowUp}
            disabled={!followUp.trim() || loading || sending}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all flex-shrink-0 ${
              followUp.trim() && !sending
                ? 'bg-forest-600 hover:bg-forest-700 text-white shadow-md active:scale-95'
                : 'bg-sand-100 text-sand-400 cursor-not-allowed'
            }`}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
