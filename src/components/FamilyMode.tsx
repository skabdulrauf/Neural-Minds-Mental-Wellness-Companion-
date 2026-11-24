import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Send, Loader2, Users } from 'lucide-react';

import { GROQ_API_KEY } from '../utils/constants';
const API_KEY = GROQ_API_KEY;

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  mood: number; // 1-5 today
  moodDate: string;
  isParent?: boolean;
}

interface FamilyData {
  members: FamilyMember[];
  encouragements: { to: string; message: string; date: string }[];
}

const RELATIONSHIPS = ['Partner', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Friend', 'Other'];
const MOODS = [
  { v: 1, e: '😢', l: 'struggling' },
  { v: 2, e: '😔', l: 'having a hard day' },
  { v: 3, e: '😐', l: 'doing okay' },
  { v: 4, e: '🙂', l: 'feeling good' },
  { v: 5, e: '😊', l: 'feeling great' },
];

function loadFamily(): FamilyData {
  try { const r = localStorage.getItem('nm_family'); return r ? JSON.parse(r) : { members: [], encouragements: [] }; } catch { return { members: [], encouragements: [] }; }
}
function saveFamily(data: FamilyData) { localStorage.setItem('nm_family', JSON.stringify(data)); }

async function callAI(prompt: string): Promise<string> {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'qwen/qwen3.8-27b', messages: [{ role: 'user', content: prompt }], temperature: 0.8, max_tokens: 300 }),
    });
    if (res.ok) { const d = await res.json(); return d.choices?.[0]?.message?.content?.replace(/^["']|["']$/g, '').trim() || ''; }
  } catch {}
  return '';
}

type View = 'home' | 'add' | 'moodboard' | 'parent' | 'encourage';

export default function FamilyMode() {
  const [data, setData] = useState<FamilyData>(loadFamily);
  const [view, setView] = useState<View>('home');
  const [newName, setNewName] = useState('');
  const [newRel, setNewRel] = useState('Child');
  const [encourageTo, setEncourageTo] = useState<FamilyMember | null>(null);
  const [encourageMsg, setEncourageMsg] = useState('');
  const [encourageLoading, setEncourageLoading] = useState(false);
  const [parentTopic, setParentTopic] = useState<string | null>(null);
  const [parentContent, setParentContent] = useState('');
  const [parentLoading, setParentLoading] = useState(false);
  const mountedRef = useRef(true);

  const today = new Date().toISOString().split('T')[0];

  const update = (newData: FamilyData) => { setData(newData); saveFamily(newData); };

  const addMember = () => {
    if (!newName.trim()) return;
    const member: FamilyMember = {
      id: `fm_${Date.now()}`, name: newName.trim(), relationship: newRel,
      mood: 3, moodDate: '', isParent: newRel === 'Child',
    };
    update({ ...data, members: [...data.members, member] });
    setNewName('');
    setView('home');
  };

  const removeMember = (id: string) => {
    update({ ...data, members: data.members.filter(m => m.id !== id) });
  };

  const setMemberMood = (id: string, mood: number) => {
    const members = data.members.map(m => m.id === id ? { ...m, mood, moodDate: today } : m);
    update({ ...data, members });
  };

  const generateEncouragement = async (member: FamilyMember) => {
    setEncourageTo(member);
    setEncourageLoading(true);
    setView('encourage');
    const msg = await callAI(
      `Write a short, warm encouragement message from a family member to ${member.name} (${member.relationship}) who is feeling "${MOODS.find(m => m.v === member.mood)?.l}". 1-2 sentences. Genuine, not generic. Like a real family member would text. Lowercase.`
    );
    if (mountedRef.current) {
      setEncourageMsg(msg || `thinking of you today, ${member.name} 💛`);
      setEncourageLoading(false);
    }
  };

  const sendEncouragement = () => {
    if (!encourageTo || !encourageMsg) return;
    const enc = { to: encourageTo.id, message: encourageMsg, date: today };
    update({ ...data, encouragements: [...data.encouragements, enc].slice(-50) });
    setView('home');
    setEncourageTo(null);
  };

  const loadParentTopic = async (topic: string) => {
    setParentTopic(topic);
    setParentLoading(true);
    setParentContent('');
    setView('parent');

    const prompts: Record<string, string> = {
      talk: 'Give practical, age-appropriate guidance on how to talk to a child about mental health. Include: when to bring it up, how to start the conversation, what to say and what NOT to say, and how to make it feel safe. Be warm and specific. 200 words.',
      signs: 'List evidence-based signs that a child or teenager might be struggling with mental health. Include: behavioral changes, emotional signs, social changes, and physical symptoms. Be specific but not alarming. Remind the parent that one sign alone isn\'t cause for panic. 200 words.',
      scripts: 'Give 5 real conversation starters a parent can use to talk to their child about mental health without making it awkward. Each should be a natural, casual opener that doesn\'t feel like an interrogation. Include the context for when to use each one.',
    };

    const content = await callAI(prompts[topic] || prompts.talk);
    if (mountedRef.current) {
      setParentContent(content || 'Could not load content. Try again.');
      setParentLoading(false);
    }
  };

  const todayEncouragements = data.encouragements.filter(e => e.date === today);

  // ─── HOME ───
  if (view === 'home') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-5">
            <Users className="w-10 h-10 text-forest-400 mx-auto mb-3" />
            <h2 className="font-serif text-2xl text-forest-900 mb-1">Family Wellness</h2>
            <p className="text-sand-500 text-sm">because mental health is a family thing</p>
          </motion.div>

          {/* Family mood board summary */}
          {data.members.length > 0 && (
            <div className="bg-white rounded-2xl border border-sand-200 p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-forest-700 uppercase tracking-wider">Today's Mood Board</p>
                <button onClick={() => setView('moodboard')} className="text-xs text-forest-600 hover:text-forest-700 font-medium">
                  update →
                </button>
              </div>
              {data.members.map(member => {
                const moodInfo = MOODS.find(m => m.v === member.mood);
                const isToday = member.moodDate === today;
                return (
                  <div key={member.id} className="flex items-center justify-between py-2 border-b border-sand-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{isToday ? moodInfo?.e : '⬜'}</span>
                      <div>
                        <p className="text-sm text-forest-900 font-medium">{member.name}</p>
                        <p className="text-[10px] text-sand-500">{member.relationship}</p>
                      </div>
                    </div>
                    {isToday && member.mood <= 2 && (
                      <button onClick={() => generateEncouragement(member)}
                        className="text-xs bg-warm-50 text-warm-600 border border-warm-200 px-2 py-1 rounded-lg hover:bg-warm-100">
                        💛 send love
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Encouragements received today */}
          {todayEncouragements.length > 0 && (
            <div className="bg-warm-50 rounded-xl border border-warm-200 p-4 mb-4">
              <p className="text-xs text-warm-600 font-medium mb-2">💌 kind thoughts today</p>
              {todayEncouragements.map((enc, i) => {
                const member = data.members.find(m => m.id === enc.to);
                return (
                  <p key={i} className="text-sm text-forest-800 mb-1">
                    to {member?.name}: "{enc.message}"
                  </p>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <button onClick={() => setView('add')}
              className="w-full bg-white rounded-xl border border-sand-200 p-4 text-left hover:border-forest-200 transition-all active:scale-[0.98] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-forest-50 flex items-center justify-center"><Plus className="w-5 h-5 text-forest-600" /></div>
              <div>
                <p className="text-sm font-medium text-forest-900">Add Family Member</p>
                <p className="text-xs text-sand-500">track your family's wellness</p>
              </div>
            </button>

            <button onClick={() => setView('moodboard')}
              className="w-full bg-white rounded-xl border border-sand-200 p-4 text-left hover:border-forest-200 transition-all active:scale-[0.98] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warm-50 flex items-center justify-center text-xl">😊</div>
              <div>
                <p className="text-sm font-medium text-forest-900">Update Mood Board</p>
                <p className="text-xs text-sand-500">how is everyone feeling today?</p>
              </div>
            </button>

            <button onClick={() => loadParentTopic('talk')}
              className="w-full bg-white rounded-xl border border-sand-200 p-4 text-left hover:border-forest-200 transition-all active:scale-[0.98] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-dusk-50 flex items-center justify-center text-xl">💬</div>
              <div>
                <p className="text-sm font-medium text-forest-900">Parent Tools</p>
                <p className="text-xs text-sand-500">how to talk about mental health</p>
              </div>
            </button>
          </div>

          {/* Members list */}
          {data.members.length > 0 && (
            <div className="mt-5">
              <p className="text-[10px] font-bold text-sand-500 uppercase tracking-wider mb-2">family members</p>
              {data.members.map(m => (
                <div key={m.id} className="flex items-center justify-between py-2">
                  <p className="text-sm text-forest-900">{m.name} <span className="text-sand-400 text-xs">({m.relationship})</span></p>
                  <button onClick={() => removeMember(m.id)} className="text-sand-300 hover:text-clay-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── ADD MEMBER ───
  if (view === 'add') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
          <button onClick={() => setView('home')} className="text-sm text-sand-500 hover:text-forest-600 mb-4">← back</button>
          <h3 className="font-serif text-xl text-forest-900 mb-4">Add Family Member</h3>
          <div className="space-y-3">
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="their name"
              className="w-full px-4 py-3 bg-white border border-sand-200 rounded-xl text-sm placeholder:text-sand-400 focus:border-forest-400" />
            <div className="flex flex-wrap gap-2">
              {RELATIONSHIPS.map(r => (
                <button key={r} onClick={() => setNewRel(r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${newRel === r ? 'bg-forest-600 text-white' : 'bg-sand-100 text-sand-600'}`}>
                  {r}
                </button>
              ))}
            </div>
            <button onClick={addMember} disabled={!newName.trim()}
              className="w-full bg-forest-600 hover:bg-forest-700 disabled:bg-sand-300 text-white py-3 rounded-xl font-medium">
              Add {newName.trim() || 'Member'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── MOOD BOARD ───
  if (view === 'moodboard') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
          <button onClick={() => setView('home')} className="text-sm text-sand-500 hover:text-forest-600 mb-4">← back</button>
          <h3 className="font-serif text-xl text-forest-900 mb-1">Family Mood Board</h3>
          <p className="text-sand-500 text-sm mb-5">how is everyone feeling today?</p>
          
          {data.members.length === 0 ? (
            <p className="text-sand-500 text-sm text-center py-8">add family members first</p>
          ) : (
            <div className="space-y-4">
              {data.members.map(member => (
                <div key={member.id} className="bg-white rounded-2xl border border-sand-200 p-4">
                  <p className="text-sm font-medium text-forest-900 mb-3">{member.name} <span className="text-sand-400 text-xs">({member.relationship})</span></p>
                  <div className="flex justify-between">
                    {MOODS.map(m => (
                      <button key={m.v} onClick={() => setMemberMood(member.id, m.v)}
                        className={`text-xl px-2 py-1 rounded-xl transition-all ${member.mood === m.v && member.moodDate === today ? 'bg-forest-50 scale-110 ring-2 ring-forest-300' : 'opacity-50 hover:opacity-80'}`}>
                        {m.e}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── ENCOURAGEMENT ───
  if (view === 'encourage' && encourageTo) {
    return (
      <div className="h-full flex items-center justify-center p-6 pb-24 md:pb-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-sm w-full text-center">
          <span className="text-4xl mb-4 block">💛</span>
          <h3 className="font-serif text-xl text-forest-900 mb-2">send love to {encourageTo.name}</h3>
          {encourageLoading ? (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="w-5 h-5 text-forest-400 animate-spin" />
              <span className="text-sm text-sand-500">writing something kind...</span>
            </div>
          ) : (
            <>
              <div className="bg-warm-50 rounded-2xl border border-warm-200 p-5 mb-4">
                <p className="text-forest-800 text-sm leading-relaxed italic">"{encourageMsg}"</p>
              </div>
              <div className="flex gap-2">
                <button onClick={sendEncouragement}
                  className="flex-1 bg-forest-600 hover:bg-forest-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Send
                </button>
                <button onClick={() => setView('home')}
                  className="px-4 py-3 bg-sand-100 text-sand-600 rounded-xl text-sm">cancel</button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  // ─── PARENT TOOLS ───
  if (view === 'parent') {
    const TOPICS = [
      { id: 'talk', label: 'How to talk to my child', emoji: '💬' },
      { id: 'signs', label: 'Signs they might be struggling', emoji: '👀' },
      { id: 'scripts', label: 'Conversation starters', emoji: '📝' },
    ];

    return (
      <div className="h-full overflow-y-auto">
        <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
          <button onClick={() => { setView('home'); setParentTopic(null); }} className="text-sm text-sand-500 hover:text-forest-600 mb-4">← back</button>
          <h3 className="font-serif text-xl text-forest-900 mb-1">Parent Tools</h3>
          <p className="text-sand-500 text-sm mb-5">guidance for supporting your family's mental health</p>

          {/* Topic pills */}
          <div className="flex gap-2 mb-5 overflow-x-auto no-scrollbar">
            {TOPICS.map(t => (
              <button key={t.id} onClick={() => loadParentTopic(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  parentTopic === t.id ? 'bg-forest-600 text-white' : 'bg-sand-100 text-sand-600 hover:bg-sand-200'
                }`}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          {parentLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-6 h-6 text-forest-400 animate-spin mx-auto mb-2" />
              <p className="text-sm text-sand-500">loading guidance...</p>
            </div>
          ) : parentContent ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-sand-200 p-5">
              <p className="text-forest-900 text-[14.5px] leading-[1.8] whitespace-pre-wrap">{parentContent}</p>
            </motion.div>
          ) : null}
        </div>
      </div>
    );
  }

  return null;
}
