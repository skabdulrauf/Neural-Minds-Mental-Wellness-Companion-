import { ChatMessage, UserProfile } from './types';

import { GROQ_API_KEY } from './constants';
const API_KEY = GROQ_API_KEY;

// ─── 1. MIRA'S DEEP MEMORY ───

export interface MiraFact {
  type: 'problem' | 'person' | 'goal' | 'event' | 'mood' | 'detail';
  text: string;
  date: string;
}

export function loadMiraMemory(): MiraFact[] {
  try { const r = localStorage.getItem('nm_mira_memory'); return r ? JSON.parse(r) : []; } catch { return []; }
}

function saveMiraMemory(facts: MiraFact[]) {
  // Keep max 20 facts, remove oldest
  localStorage.setItem('nm_mira_memory', JSON.stringify(facts.slice(-20)));
}

// Extract facts from recent conversation — called after each AI response
export async function extractAndStoreFacts(messages: ChatMessage[]): Promise<void> {
  // Only process last 4 messages to keep it lightweight
  const recent = messages.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n');
  if (recent.length < 20) return;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen/qwen3.8-27b',
        messages: [{
          role: 'user',
          content: `From this conversation extract personal facts the USER shared. Return ONLY valid JSON, nothing else:\n{"problems":[],"people":[],"goals":[],"recent_event":null,"mood":null}\n\nRules: problems = things stressing them (max 3 short strings). people = names of real people they mentioned. goals = things they want to do. recent_event = something happening soon. mood = one word emotion.\nIf nothing found, return empty arrays and nulls.\n\nConversation:\n${recent}`,
        }],
        temperature: 0.1, max_tokens: 200,
      }),
    });

    if (!res.ok) return;
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return;

    // Parse JSON — handle common LLM formatting issues
    const jsonStr = text.replace(/```json\n?|```/g, '').trim();
    let parsed: any;
    try { parsed = JSON.parse(jsonStr); } catch { return; }

    const today = new Date().toISOString().split('T')[0];
    const existing = loadMiraMemory();
    const newFacts: MiraFact[] = [];

    if (Array.isArray(parsed.problems)) {
      parsed.problems.forEach((p: string) => {
        if (p && typeof p === 'string' && p.length > 3 && !existing.some(f => f.text === p)) {
          newFacts.push({ type: 'problem', text: p, date: today });
        }
      });
    }
    if (Array.isArray(parsed.people)) {
      parsed.people.forEach((p: string) => {
        if (p && typeof p === 'string' && p.length > 1 && !existing.some(f => f.text === p)) {
          newFacts.push({ type: 'person', text: p, date: today });
        }
      });
    }
    if (Array.isArray(parsed.goals)) {
      parsed.goals.forEach((g: string) => {
        if (g && typeof g === 'string' && g.length > 3 && !existing.some(f => f.text === g)) {
          newFacts.push({ type: 'goal', text: g, date: today });
        }
      });
    }
    if (parsed.recent_event && typeof parsed.recent_event === 'string' && parsed.recent_event.length > 3) {
      if (!existing.some(f => f.text === parsed.recent_event)) {
        newFacts.push({ type: 'event', text: parsed.recent_event, date: today });
      }
    }
    if (parsed.mood && typeof parsed.mood === 'string') {
      newFacts.push({ type: 'mood', text: parsed.mood, date: today });
    }

    if (newFacts.length > 0) {
      saveMiraMemory([...existing, ...newFacts]);
    }
  } catch { /* silent fail — memory is non-critical */ }
}

// Format memory for injection into system prompt
export function formatDeepMemory(facts: MiraFact[]): string {
  if (facts.length === 0) return '';

  const problems = facts.filter(f => f.type === 'problem').slice(-3);
  const people = facts.filter(f => f.type === 'person').slice(-3);
  const goals = facts.filter(f => f.type === 'goal').slice(-2);
  const events = facts.filter(f => f.type === 'event').slice(-1);
  const moods = facts.filter(f => f.type === 'mood').slice(-1);

  const lines: string[] = [];
  if (problems.length) lines.push(`they've been dealing with: ${problems.map(f => f.text).join(', ')}`);
  if (people.length) lines.push(`people in their life: ${people.map(f => f.text).join(', ')}`);
  if (goals.length) lines.push(`their goals: ${goals.map(f => f.text).join(', ')}`);
  if (events.length) lines.push(`upcoming: ${events[0].text}`);
  if (moods.length) lines.push(`recent mood: ${moods[0].text}`);

  if (lines.length === 0) return '';
  return `\nDEEP MEMORY (things you know about them from past conversations):\n${lines.map(l => `- ${l}`).join('\n')}\nReference these naturally when relevant — never list them all at once. Act like you just remember.\n`;
}

// ─── 2. DYNAMIC GREETING ───

export async function generateDynamicGreeting(profile: UserProfile): Promise<string> {
  const name = profile.displayName && profile.displayName !== 'Friend' ? profile.displayName : '';
  const hour = new Date().getHours();
  const dayName = new Date().toLocaleDateString('en', { weekday: 'long' });
  const timeLabel = hour < 6 ? 'very early morning' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'late night';

  const lastMood = profile.moodHistory.length > 0 ? profile.moodHistory[profile.moodHistory.length - 1] : null;
  const streak = profile.streak || 0;

  // Check active program
  let programInfo = '';
  try {
    const prog = localStorage.getItem('nm_program');
    if (prog) {
      const p = JSON.parse(prog);
      const progNames: Record<string, string> = { anxiety: 'Anxiety Reset', confidence: 'Confidence Builder', sleep: 'Sleep Repair' };
      programInfo = `They're on day ${p.currentDay} of their ${progNames[p.programId] || 'wellness'} program.`;
    }
  } catch {}

  // Load deep memory for context
  const memory = loadMiraMemory();
  const recentProblems = memory.filter(f => f.type === 'problem').slice(-2).map(f => f.text).join(', ');

  const prompt = `Generate a greeting for ${name || 'a friend'}. It's ${timeLabel} on ${dayName}. ${lastMood ? `Their last mood was "${lastMood.emotion}" (${lastMood.mood}/5).` : ''} ${streak > 1 ? `They have a ${streak} day streak.` : ''} ${programInfo} ${recentProblems ? `They've been dealing with: ${recentProblems}.` : ''} Make it feel like a friend who actually knows them and remembers things. One sentence. Lowercase. Casual. No AI phrases.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen/qwen3.8-27b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9, max_tokens: 60,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) return text.replace(/^["']|["']$/g, '').trim();
    }
  } catch {}

  // Fallback
  return `hey${name ? ` ${name}` : ''} :) how's your ${timeLabel} going?`;
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
    // Only show if generated this week (within last 7 days)
    const genDate = new Date(data.dateGenerated);
    if (Date.now() - genDate.getTime() > 7 * 86400000) return null;
    return data;
  } catch { return null; }
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

  // Generate AI insight
  let aiInsight = "you showed up for yourself this week. that counts.";
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen/qwen3.8-27b',
        messages: [{
          role: 'user',
          content: `As Mira (a caring friend), write a 2-sentence weekly reflection for someone whose mood average was ${moodAvg}/5 (trend: ${moodTrend}), who journaled ${journalCount} times, and has a ${profile.streak || 0} day streak. Be genuine and specific. Lowercase. No AI cliches.`,
        }],
        temperature: 0.8, max_tokens: 80,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) aiInsight = text.replace(/^["']|["']$/g, '').trim();
    }
  } catch {}

  const wrapped: WeeklyWrapped = {
    dateGenerated: new Date().toISOString().split('T')[0],
    messageCount, moodAvg, moodTrend, journalCount,
    streakDays: profile.streak || 0,
    aiInsight, weekMoods,
  };

  localStorage.setItem('nm_weekly_wrapped', JSON.stringify(wrapped));
  return wrapped;
}

export function isWrappedDay(): boolean {
  return new Date().getDay() === 0; // Sunday
}
