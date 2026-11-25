import { ChatMessage, UserProfile, MiraMemoryFact, MiraFactCategory } from './types';
import { GROQ_API_KEY, hasValidGroqKey } from './constants';

const API_KEY = hasValidGroqKey(GROQ_API_KEY) ? GROQ_API_KEY : '';

// ─── 1. MIRA'S MAXIMUM DEEP MEMORY VAULT (Up to 100 structured personal facts + Cloud Sync) ───

export type MiraFact = MiraMemoryFact;

const MAX_MEMORY_FACTS = 100;

export function loadMiraMemory(): MiraFact[] {
  try {
    const r = localStorage.getItem('nm_mira_memory');
    if (!r) return [];
    const parsed = JSON.parse(r);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMiraMemory(facts: MiraFact[]): MiraFact[] {
  // Keep pinned facts + most recent facts up to 100
  const pinned = facts.filter(f => f.pinned);
  const unpinned = facts.filter(f => !f.pinned);
  const combined = [...pinned, ...unpinned].slice(-MAX_MEMORY_FACTS);
  try {
    localStorage.setItem('nm_mira_memory', JSON.stringify(combined));
  } catch {}
  return combined;
}

export function addManualMiraFact(type: MiraFactCategory, text: string, pinned: boolean = true): MiraFact[] {
  const clean = text.trim().slice(0, 120);
  if (!clean) return loadMiraMemory();
  const existing = loadMiraMemory();
  if (existing.some(f => f.text.toLowerCase() === clean.toLowerCase())) {
    return existing;
  }
  const today = new Date().toISOString().split('T')[0];
  const fact: MiraFact = {
    id: `fact_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    text: clean,
    date: today,
    pinned,
  };
  return saveMiraMemory([...existing, fact]);
}

export function removeMiraFact(textOrId: string): MiraFact[] {
  const existing = loadMiraMemory();
  const filtered = existing.filter(f => f.id !== textOrId && f.text !== textOrId);
  return saveMiraMemory(filtered);
}

export function togglePinMiraFact(textOrId: string): MiraFact[] {
  const existing = loadMiraMemory();
  const updated = existing.map(f =>
    f.id === textOrId || f.text === textOrId ? { ...f, pinned: !f.pinned } : f
  );
  return saveMiraMemory(updated);
}

export function mergeMiraFacts(incoming: { type?: string; text: string; date?: string }[]): MiraFact[] {
  if (!Array.isArray(incoming) || incoming.length === 0) return loadMiraMemory();
  const existing = loadMiraMemory();
  const today = new Date().toISOString().split('T')[0];
  const validCategories: MiraFactCategory[] = ['problem', 'person', 'goal', 'event', 'mood', 'trigger', 'win', 'preference', 'detail'];

  const added: MiraFact[] = [];
  for (const item of incoming) {
    if (!item || typeof item.text !== 'string') continue;
    const cleanText = item.text.trim().slice(0, 120);
    if (cleanText.length < 3) continue;
    const alreadyExists = existing.some(e => e.text.toLowerCase() === cleanText.toLowerCase()) ||
      added.some(a => a.text.toLowerCase() === cleanText.toLowerCase());
    if (alreadyExists) continue;

    const category: MiraFactCategory = validCategories.includes(item.type as MiraFactCategory)
      ? (item.type as MiraFactCategory)
      : 'detail';

    added.push({
      id: `fact_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: category,
      text: cleanText,
      date: item.date || today,
    });
  }

  if (added.length === 0) return existing;
  return saveMiraMemory([...existing, ...added]);
}

// Deterministic local fact extraction — runs immediately on every user message so memory works 100% offline or online
export function extractDeterministicFactsFromText(userText: string): { type: MiraFactCategory; text: string }[] {
  const clean = userText.trim();
  if (clean.length < 6) return [];
  const extracted: { type: MiraFactCategory; text: string }[] = [];

  // 1. People mentioned ("my mom Sarah", "my boss Rahul", "my partner Alex", "my friend Priya")
  const personMatches = clean.matchAll(/\bmy\s+(mom|mother|dad|father|sister|brother|partner|boyfriend|girlfriend|husband|wife|boss|manager|friend|best friend|therapist|doctor|roommate|professor|teacher)(?:\s+named|\s+is)?\s+([A-Z][a-z]{2,15})\b/g);
  for (const m of personMatches) {
    extracted.push({ type: 'person', text: `${m[1].toLowerCase()}: ${m[2]}` });
  }

  // Also generic relationship context if no proper name
  const relMatch = clean.match(/\bmy\s+(boss|partner|boyfriend|girlfriend|husband|wife|mom|dad|parents|roommate)\s+(?:keeps|is|was|told|yelled|ignored|helped|supports)\s+([^.!?,]{4,45})/i);
  if (relMatch) {
    extracted.push({ type: 'person', text: `${relMatch[1].toLowerCase()} ${relMatch[2].trim().toLowerCase()}` });
  }

  // 2. Problems / stressors ("stressed about...", "worried about...", "struggling with...", "dealing with...")
  const problemMatch = clean.match(/\b(?:stressed about|worried about|anxious about|struggling with|dealing with|overwhelmed by|afraid of|scared of|burned out from)\s+([^.!?,]{4,60})/i);
  if (problemMatch) {
    extracted.push({ type: 'problem', text: problemMatch[1].trim().toLowerCase() });
  }

  // 3. Goals ("I want to...", "my goal is...", "trying to...", "hoping to...", "planning to...")
  const goalMatch = clean.match(/\b(?:my goal is to|i want to|i'm trying to|i am trying to|hoping to|planning to|working toward)\s+([^.!?,]{4,60})/i);
  if (goalMatch) {
    extracted.push({ type: 'goal', text: goalMatch[1].trim().toLowerCase() });
  }

  // 4. Upcoming or recent events ("I have an exam...", "interview tomorrow", "deadline on...")
  const eventMatch = clean.match(/\b(?:i have (?:a |an )?(?:exam|interview|meeting|presentation|flight|surgery|appointment|deadline|test)[^.!?,]{0,40})/i);
  if (eventMatch) {
    extracted.push({ type: 'event', text: eventMatch[0].trim().toLowerCase() });
  }

  // 5. Triggers ("whenever...", "triggers my anxiety", "makes me panic")
  const triggerMatch = clean.match(/\b(?:triggers my|makes me panic|makes me anxious when|whenever)\s+([^.!?,]{4,55})/i);
  if (triggerMatch) {
    extracted.push({ type: 'trigger', text: triggerMatch[1].trim().toLowerCase() });
  }

  // 6. Wins ("I finally...", "proud that I...", "managed to...")
  const winMatch = clean.match(/\b(?:i finally|i managed to|proud that i|i completed|i finished)\s+([^.!?,]{4,55})/i);
  if (winMatch) {
    extracted.push({ type: 'win', text: winMatch[1].trim().toLowerCase() });
  }

  // 7. Preferences / identity ("I work as a...", "I study...", "I love...", "I prefer...")
  const prefMatch = clean.match(/\b(?:i work as (?:a |an )?|i'm studying |i am studying |i love listening to |calms me down when )\s*([^.!?,]{3,50})/i);
  if (prefMatch) {
    extracted.push({ type: 'preference', text: prefMatch[0].trim().toLowerCase() });
  }

  return extracted;
}

// Extract facts from recent conversation — deterministic + optional LLM enrichment
export async function extractAndStoreFacts(messages: ChatMessage[]): Promise<MiraFact[]> {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  if (lastUserMsg) {
    const localFacts = extractDeterministicFactsFromText(lastUserMsg.content);
    if (localFacts.length > 0) {
      mergeMiraFacts(localFacts);
    }
  }

  if (!API_KEY) return loadMiraMemory();

  const recent = messages.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n');
  if (recent.length < 20) return loadMiraMemory();

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen/qwen3.8-27b',
        messages: [{
          role: 'user',
          content: `From this conversation extract personal facts the USER shared. Return ONLY valid JSON:\n{"problems":[],"people":[],"goals":[],"triggers":[],"wins":[],"preferences":[],"recent_event":null,"mood":null}\n\nConversation:\n${recent}`,
        }],
        temperature: 0.1,
        max_tokens: 220,
      }),
    });

    if (!res.ok) return loadMiraMemory();
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return loadMiraMemory();

    const jsonStr = text.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    const batch: { type: MiraFactCategory; text: string }[] = [];

    if (Array.isArray(parsed.problems)) parsed.problems.forEach((t: string) => batch.push({ type: 'problem', text: t }));
    if (Array.isArray(parsed.people)) parsed.people.forEach((t: string) => batch.push({ type: 'person', text: t }));
    if (Array.isArray(parsed.goals)) parsed.goals.forEach((t: string) => batch.push({ type: 'goal', text: t }));
    if (Array.isArray(parsed.triggers)) parsed.triggers.forEach((t: string) => batch.push({ type: 'trigger', text: t }));
    if (Array.isArray(parsed.wins)) parsed.wins.forEach((t: string) => batch.push({ type: 'win', text: t }));
    if (Array.isArray(parsed.preferences)) parsed.preferences.forEach((t: string) => batch.push({ type: 'preference', text: t }));
    if (parsed.recent_event) batch.push({ type: 'event', text: parsed.recent_event });
    if (parsed.mood) batch.push({ type: 'mood', text: parsed.mood });

    return mergeMiraFacts(batch);
  } catch {
    return loadMiraMemory();
  }
}

// Build a full summary of the user's NeuralMinds Sanctuary state for Mira's context
export function getSanctuarySummary(profile?: UserProfile): string {
  const parts: string[] = [];
  try {
    const prog = localStorage.getItem('nm_program');
    if (prog) {
      const p = JSON.parse(prog);
      const progNames: Record<string, string> = {
        anxiety: '7-Day Anxiety Reset',
        confidence: '7-Day Confidence Builder',
        sleep: '7-Day Sleep Repair',
      };
      parts.push(`Active Program: Day ${p.currentDay || 1} of ${progNames[p.programId] || p.programId}`);
    }
    const garden = localStorage.getItem('nm_garden');
    if (garden) {
      const plants = JSON.parse(garden);
      if (Array.isArray(plants) && plants.length > 0) {
        parts.push(`Gratitude Garden: ${plants.length} gratitude seeds planted (latest: "${plants[plants.length - 1]?.text || ''}")`);
      }
    }
    const letters = localStorage.getItem('nm_future_letters');
    if (letters) {
      const list = JSON.parse(letters);
      if (Array.isArray(list) && list.length > 0) {
        parts.push(`Future Letters written: ${list.length}`);
      }
    }
    const faith = localStorage.getItem('nm_faith_religion');
    if (faith) {
      parts.push(`Spiritual/Faith tradition: ${faith}`);
    }
  } catch {}

  if (profile) {
    if (profile.streak > 0) parts.push(`Current wellness streak: ${profile.streak} days`);
    if (profile.journalEntries?.length > 0) parts.push(`Total journal entries: ${profile.journalEntries.length}`);
  }
  return parts.join(' | ');
}

// Format memory for injection into system prompt
export function formatDeepMemory(facts: MiraFact[]): string {
  if (facts.length === 0) return '';

  const pinned = facts.filter(f => f.pinned);
  const problems = facts.filter(f => f.type === 'problem').slice(-6);
  const people = facts.filter(f => f.type === 'person').slice(-6);
  const goals = facts.filter(f => f.type === 'goal').slice(-5);
  const events = facts.filter(f => f.type === 'event').slice(-4);
  const triggers = facts.filter(f => f.type === 'trigger').slice(-4);
  const wins = facts.filter(f => f.type === 'win').slice(-4);
  const preferences = facts.filter(f => f.type === 'preference' || f.type === 'detail').slice(-5);
  const moods = facts.filter(f => f.type === 'mood').slice(-2);

  const lines: string[] = [];
  if (pinned.length) lines.push(`core pinned facts: ${pinned.map(f => f.text).join('; ')}`);
  if (problems.length) lines.push(`stressors & challenges: ${problems.map(f => f.text).join('; ')}`);
  if (people.length) lines.push(`important people in their life: ${people.map(f => f.text).join('; ')}`);
  if (goals.length) lines.push(`their goals & aspirations: ${goals.map(f => f.text).join('; ')}`);
  if (events.length) lines.push(`key events/deadlines: ${events.map(f => f.text).join('; ')}`);
  if (triggers.length) lines.push(`known emotional triggers: ${triggers.map(f => f.text).join('; ')}`);
  if (wins.length) lines.push(`recent wins & progress: ${wins.map(f => f.text).join('; ')}`);
  if (preferences.length) lines.push(`personal details & preferences: ${preferences.map(f => f.text).join('; ')}`);
  if (moods.length) lines.push(`recent emotional state: ${moods.map(f => f.text).join(', ')}`);

  if (lines.length === 0) return '';
  return `\nDEEP MEMORY VAULT (${facts.length} facts remembered across past sessions):\n${lines.map(l => `- ${l}`).join('\n')}\nReference these facts naturally when relevant — act like a close friend who genuinely remembers their life.\n`;
}

// ─── 2. DYNAMIC GREETING ───

export async function generateDynamicGreeting(profile: UserProfile): Promise<string> {
  const name = profile.displayName && profile.displayName !== 'Friend' ? profile.displayName : '';
  const hour = new Date().getHours();
  const timeLabel = hour < 6 ? 'late night' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';

  const memory = loadMiraMemory();
  const recentProblem = memory.filter(f => f.type === 'problem' || f.type === 'event').slice(-1)[0];

  if (recentProblem) {
    return `hey${name ? ` ${name}` : ''} :) how's your ${timeLabel} going? i was thinking about what you mentioned earlier (${recentProblem.text}) — how are you holding up with that?`;
  }

  return `hey${name ? ` ${name}` : ''} :) good to see you this ${timeLabel}. how is your headspace right now — or is there anything on your mind you want to talk through or ask me?`;
}

// ─── 3. WEEKLY WRAPPED ───

export interface WeeklyWrapped {
  dateGenerated: string;
  messageCount: number;
  moodAvg: number;
  moodTrend: 'improving' | 'declining' | 'stable';
  journalCount: number;
  streakDays: number;
  aiInsight: string;
  weekMoods: { day: string; mood: number }[];
}

export function loadWeeklyWrapped(): WeeklyWrapped | null {
  try {
    const r = localStorage.getItem('nm_weekly_wrapped');
    if (!r) return null;
    const data = JSON.parse(r);
    const genDate = new Date(data.dateGenerated);
    if (Date.now() - genDate.getTime() > 7 * 86400000) return null;
    return data;
  } catch {
    return null;
  }
}

export async function generateWeeklyWrapped(profile: UserProfile): Promise<WeeklyWrapped> {
  const now = Date.now();
  const day = 86400000;
  const weekAgo = new Date(now - 7 * day).toISOString().split('T')[0];

  const weekMoods = profile.moodHistory
    .filter(m => m.date >= weekAgo && typeof m.mood === 'number')
    .map(m => ({ day: new Date(m.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short' }), mood: m.mood }));

  const moodAvg = weekMoods.length > 0 ? Math.round((weekMoods.reduce((s, m) => s + m.mood, 0) / weekMoods.length) * 10) / 10 : 0;

  const firstHalf = weekMoods.slice(0, Math.ceil(weekMoods.length / 2));
  const secondHalf = weekMoods.slice(Math.ceil(weekMoods.length / 2));
  const fAvg = firstHalf.length > 0 ? firstHalf.reduce((s, m) => s + m.mood, 0) / firstHalf.length : 0;
  const sAvg = secondHalf.length > 0 ? secondHalf.reduce((s, m) => s + m.mood, 0) / secondHalf.length : 0;
  const moodTrend: 'improving' | 'declining' | 'stable' = sAvg > fAvg + 0.3 ? 'improving' : sAvg < fAvg - 0.3 ? 'declining' : 'stable';

  const journalCount = (profile.journalEntries || []).filter(j => j.date >= weekAgo).length;
  const messageCount = Math.min(profile.messageCount || 0, 999);

  const aiInsight = `you showed up for yourself ${profile.streak || 1} days in a row and logged ${journalCount} reflections. your average mood was ${moodAvg || 3.5}/5 (${moodTrend}) — keep honoring your pace.`;

  const wrapped: WeeklyWrapped = {
    dateGenerated: new Date().toISOString().split('T')[0],
    messageCount,
    moodAvg,
    moodTrend,
    journalCount,
    streakDays: profile.streak || 0,
    aiInsight,
    weekMoods,
  };

  localStorage.setItem('nm_weekly_wrapped', JSON.stringify(wrapped));
  return wrapped;
}

export function isWrappedDay(): boolean {
  return new Date().getDay() === 0;
}
