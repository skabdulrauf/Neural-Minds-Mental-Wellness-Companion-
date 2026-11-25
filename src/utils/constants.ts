// ─── CENTRAL APP CONFIGURATION ───
// API key uses Vite env var at build time, falls back to a public demo key.
// Set VITE_GROQ_API_KEY in your .env, Vercel/Netlify env vars, or GitHub Secrets.

export const APP_NAME = 'NeuralMinds';

const rawKey = (import.meta?.env?.VITE_GROQ_API_KEY as string) || '';
export const GROQ_API_KEY = rawKey.trim().startsWith('gsk_') ? rawKey.trim() : '';

export function hasValidGroqKey(key?: string | null): boolean {
  const k = (key ?? GROQ_API_KEY).trim();
  return k.length > 20 && k.startsWith('gsk_');
}

export const GROQ_MODELS = [
  'qwen/qwen3.8-27b',
  'allam-2-7b',
  'openai/gpt-oss-20b',
] as const;

export const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
