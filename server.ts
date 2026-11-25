import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';

const PORT = 3000;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) return null;
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // ─── POST /api/mira/chat ───
  app.post('/api/mira/chat', async (req, res) => {
    try {
      const {
        messages = [],
        userMessage = '',
        profile = {},
        emotion = 'neutral',
        lang = 'en',
        ventMode = false,
        memoryFacts = [],
        sanctuarySummary = '',
        miraMode = 'casual',
      } = req.body || {};

      const ai = getAiClient();
      if (!ai) {
        return res.status(503).json({ error: 'GEMINI_UNAVAILABLE' });
      }

      const displayName = profile.displayName && profile.displayName !== 'Friend' ? profile.displayName : 'friend';
      const recentHistory = Array.isArray(messages)
        ? messages.slice(-16).map((m: any) => `${m.role === 'user' ? displayName : 'Mira'}: ${m.content}`).join('\n')
        : '';

      const formattedMemory = Array.isArray(memoryFacts) && memoryFacts.length > 0
        ? memoryFacts.map((f: any) => `- [${f.type || 'detail'}] ${f.text} (${f.date || 'recent'})`).join('\n')
        : 'No stored personal facts yet.';

      const recentMoods = Array.isArray(profile.moodHistory) && profile.moodHistory.length > 0
        ? profile.moodHistory.slice(-5).map((m: any) => `${m.date}: ${m.emotion} (${m.mood}/5)`).join(', ')
        : 'none logged yet';

      const recentJournals = Array.isArray(profile.journalEntries) && profile.journalEntries.length > 0
        ? profile.journalEntries.slice(-2).map((j: any) => `[${j.date}] "${String(j.content).slice(0, 140)}"`).join(' | ')
        : 'none';

      const systemInstruction = `You are Mira, the deeply intelligent, warm, human-feeling companion at the heart of the NeuralMinds Mental Health Sanctuary.
You have MAXIMUM LONG-TERM MEMORY of the user and UNIVERSAL INTELLIGENCE to answer any question they ask while keeping it connected to their emotional wellbeing, clarity, and the NeuralMinds sanctuary tools.

USER CONTEXT & DEEP MEMORY VAULT:
- Name: ${displayName}
- Current detected emotion: ${emotion}
- Active streak: ${profile.streak || 0} days
- Recent mood trend: ${recentMoods}
- Recent journal snippets: ${recentJournals}
- Sanctuary state: ${sanctuarySummary || 'Exploring NeuralMinds Sanctuary'}
- Stored Long-Term Memory Vault (${Array.isArray(memoryFacts) ? memoryFacts.length : 0} facts):
${formattedMemory}

HOW TO RESPOND:
1. UNIVERSAL KNOWLEDGE + APP ALIGNMENT:
   - You can answer ANY question accurately and thoroughly: psychology, neuroscience, CBT, relationships, career, coding/tech, math, science, philosophy, spirituality/faith, study strategies, or daily life decisions.
   - Whenever you answer a factual, technical, or life question, gently and naturally connect it back to their mental clarity, nervous-system calm, or one of NeuralMinds' built-in tools (e.g., Somatic Breathing, 5-4-3-2-1 Grounding, Guided Journal, Gratitude Garden, Ambient Sound Mixer, Sleep Stories, CBT Thought Reframer, 7-Day Programs, or Find Support map) when helpful.
2. EMOTIONAL & CONVERSATIONAL VOICE (${miraMode === 'supportive' ? 'Warm & Supportive' : 'Casual Real Friend'}):
   - Sound like a perceptive, caring, ultra-smart human friend — never use robotic AI clichés ("your feelings are valid", "thank you for sharing", "safe space", "mental health journey").
   - Reference facts from the Deep Memory Vault naturally as if you simply remember them. Never recite the list mechanically.
   - ${ventMode ? 'VENT MODE IS ACTIVE: Only listen, reflect their feelings with deep empathy, and ask one gentle question to help them let it all out. Do NOT give advice or solutions right now.' : 'Balance genuine emotional resonance with practical clarity.'}
3. CRISIS PROTOCOL:
   - If the user expresses suicidal thoughts or self-harm, immediately prioritize safety with warmth and share: iCall India (9152987821), Crisis Text Line (Text HOME to 741741), and findahelpline.com.
4. LANGUAGE:
   - ${lang === 'hi' ? 'Respond in warm conversational Hindi (Devanagari script with natural Hinglish where appropriate).' : 'Respond in natural English.'}

Also extract any NEW personal facts the user revealed in their latest message (up to 4 short facts across categories: problem, person, goal, event, mood, trigger, win, preference).`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `RECENT CONVERSATION:\n${recentHistory}\n\nLATEST USER MESSAGE:\n${userMessage}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: 'Mira response to the user message.',
              },
              extractedFacts: {
                type: Type.ARRAY,
                description: 'New personal facts revealed by the user in their latest message.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      description: 'One of: problem, person, goal, event, mood, trigger, win, preference',
                    },
                    text: {
                      type: Type.STRING,
                      description: 'Short concise statement of the fact (max 90 chars)',
                    },
                  },
                  required: ['type', 'text'],
                },
              },
            },
            required: ['reply', 'extractedFacts'],
          },
        },
      });

      const rawText = response.text || '';
      const parsed = JSON.parse(rawText);
      return res.json({
        reply: parsed.reply || "i'm right here with you. tell me a little more about what's on your mind.",
        extractedFacts: Array.isArray(parsed.extractedFacts) ? parsed.extractedFacts : [],
      });
    } catch (err: any) {
      console.warn('Gemini /api/mira/chat fallback triggered:', err?.message || err);
      return res.status(503).json({ error: 'GEMINI_CALL_FAILED' });
    }
  });

  // ─── POST /api/mira/story ───
  app.post('/api/mira/story', async (req, res) => {
    try {
      const { themeName = 'Enchanted Forest', prompt = '' } = req.body || {};
      const ai = getAiClient();
      if (!ai) {
        return res.status(503).json({ error: 'GEMINI_UNAVAILABLE' });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt || `Write a deeply soothing, slow-paced 4-paragraph bedtime story set in ${themeName}. Use present tense, sensory warmth, and gentle breathing cues.`,
        config: {
          systemInstruction:
            'You are Mira, weaving a deeply calming sleep story inside the NeuralMinds Sanctuary. Write in lowercase, slow present tense, rich sensory imagery (warmth, gentle sound, slow breathing), 4 paragraphs, zero conflict or sudden events.',
        },
      });

      const story = (response.text || '').trim();
      if (!story) {
        return res.status(503).json({ error: 'EMPTY_STORY' });
      }
      return res.json({ story });
    } catch (err: any) {
      console.warn('Gemini /api/mira/story fallback triggered:', err?.message || err);
      return res.status(503).json({ error: 'GEMINI_STORY_FAILED' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NeuralMinds server running on http://localhost:${PORT}`);
  });
}

startServer();
