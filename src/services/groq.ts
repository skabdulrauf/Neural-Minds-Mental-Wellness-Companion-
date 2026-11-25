import { ChatMessage, UserProfile } from '../utils/types';
import { loadMiraMemory, formatDeepMemory } from '../utils/engagement';
import { GROQ_API_KEY, hasValidGroqKey } from '../utils/constants';
import { generateLocalMiraReply } from '../utils/miraEngine';

function getGroqKey(): string {
  const stored = localStorage.getItem('neuralminds_groq_key');
  if (hasValidGroqKey(stored)) return stored!.trim();
  return hasValidGroqKey(GROQ_API_KEY) ? GROQ_API_KEY : '';
}

// ──────────────────────────────────────────────
// INTENT DETECTION — is this a question or emotional?
// ──────────────────────────────────────────────
type MessageIntent = 'emotional' | 'knowledge';

function detectIntent(message: string): MessageIntent {
  const m = message.toLowerCase().trim();

  // Emotional override — these patterns are ALWAYS emotional regardless of question marks
  const emotionalOverrides = [
    /^(?:how are you|how do you|how should i feel|how do i cope|how do i deal)/,
    /^(?:why do i feel|why am i|why can't i|why don't i|why is life)/,
    /(?:i feel|i'm feeling|i am feeling|feeling so|i'm so|i am so)/,
    /(?:i can't|i don't want|i just want|i need someone|nobody understands)/,
    /(?:what's wrong with me|what should i do$|what do i do$)/,
    /(?:help me$|please help$|i need help$)/,
  ];
  for (const pattern of emotionalOverrides) {
    if (pattern.test(m)) return 'emotional';
  }

  // Knowledge/task signals — if ANY match, it's a knowledge question
  const knowledgePatterns = [
    // Direct questions about facts (but NOT emotional "how/why" questions — those are caught above)
    /^(?:what is|what are|what was|what were|who is|who was|where is|where was|when did|when was|which|can you|could you|tell me about|explain|define|describe)\s/,
    // Math
    /\d+\s*[\+\-\*\/\^%]\s*\d+/,
    /(?:solve|calculate|compute|what is|find the|evaluate)\s/,
    /(?:equation|formula|derivative|integral|algebra|geometry|trigonometry|calculus|probability)/,
    /(?:square root|factorial|percentage|ratio|fraction)/,
    // Science
    /(?:atom|molecule|element|chemical|physics|biology|cell|dna|evolution|gravity|quantum|electron|photon)/,
    /(?:newton|einstein|bohr|darwin|periodic table|speed of light)/,
    // History/Geography
    /(?:history of|when did|who invented|who discovered|who was|who is|capital of|population of|president of|king of|queen of)/,
    /(?:world war|revolution|empire|dynasty|independence|constitution)/,
    /(?:country|continent|ocean|river|mountain|planet|solar system)/,
    // Tech/Programming
    /(?:code|program|function|algorithm|python|javascript|java|html|css|react|sql|api|database|array|loop|variable)/,
    /(?:write a|create a|build a|make a|generate a|design a)\s(?:code|program|script|function|app|website|page)/,
    // Language/Literature
    /(?:meaning of|synonym|antonym|translate|grammar|noun|verb|adjective|essay|poem|summary|author|book|novel|literature)/,
    /(?:write an essay|write a poem|write a story|write a letter|write about)/,
    // General knowledge
    /(?:recipe|ingredients|how to cook|how to make|how to build|how to fix|how to use|tutorial|steps to|guide to)/,
    /(?:compare|difference between|versus|vs\.?|pros and cons)/,
    /(?:list of|name all|examples of|types of|categories of)/,
    /(?:recommend|suggestion|best way|easiest way|fastest way)/,
    // Explicit asks
    /(?:help me with|assist me|i need help with|can you help|please help)/,
    /(?:homework|assignment|exam|test|quiz|project|study)/,
  ];

  for (const pattern of knowledgePatterns) {
    if (pattern.test(m)) return 'knowledge';
  }

  // Short factual questions (but not emotional ones like "you okay?" or "really?")
  if (m.length < 60 && m.includes('?') && m.split(' ').length > 4) return 'knowledge';

  return 'emotional';
}

// ──────────────────────────────────────────────
// MEMORY SYSTEM — extracts what Mira "remembers"
// ──────────────────────────────────────────────
interface MiraMemory {
  name: string;
  recentMood: string;
  topTopics: string[];
  personalDetails: string[];
}

const TOPIC_PATTERNS: { label: string; patterns: RegExp[] }[] = [
  { label: 'work stress', patterns: [/\b(?:work|boss|job|office|coworker|colleague|fired|promotion|deadline|overtime)\b/i] },
  { label: 'relationships', patterns: [/\b(?:boyfriend|girlfriend|partner|husband|wife|dating|breakup|broke up|relationship|crush|marriage|divorce)\b/i] },
  { label: 'family', patterns: [/\b(?:mom|dad|mother|father|parents|sister|brother|family|sibling|grandma|grandpa|uncle|aunt)\b/i] },
  { label: 'health concerns', patterns: [/\b(?:sick|hospital|doctor|surgery|pain|illness|diagnosed|medication|health|disease|cancer|therapy|therapist)\b/i] },
  { label: 'studies', patterns: [/\b(?:exam|school|college|university|homework|assignment|grade|study|student|professor|class|semester|gpa)\b/i] },
  { label: 'finances', patterns: [/\b(?:money|rent|debt|loan|salary|broke|afford|bills|budget|financial|payment)\b/i] },
  { label: 'loneliness', patterns: [/\b(?:alone|lonely|no friends|nobody|isolated|left out|no one cares)\b/i] },
  { label: 'grief/loss', patterns: [/\b(?:died|death|passed away|funeral|grief|loss|lost (?:my|him|her|them)|mourning|gone forever)\b/i] },
  { label: 'sleep issues', patterns: [/\b(?:can't sleep|insomnia|nightmare|sleep|awake at|3 ?am|up all night|exhausted|so tired)\b/i] },
];

// Extracts personal statements like "I have an exam tomorrow", "my mom is sick"
const PERSONAL_DETAIL_PATTERNS: RegExp[] = [
  /\b(?:i have (?:a |an )?(?:exam|interview|meeting|appointment|surgery|date|deadline)[\w\s]{0,20})/i,
  /\b(?:my (?:mom|dad|mother|father|sister|brother|friend|partner|dog|cat|pet) is (?:sick|ill|in hospital|dying|not well|depressed|angry|leaving))/i,
  /\b(?:i(?:'m| am) (?:moving|leaving|graduating|getting married|pregnant|starting|quitting|losing)[\w\s]{0,20})/i,
  /\b(?:i just (?:got|lost|found|started|finished|broke|failed|passed|quit)[\w\s]{0,20})/i,
  /\b(?:i(?:'m| am) (?:a |an )?(?:student|teacher|nurse|developer|engineer|artist|writer|single mom|caregiver))\b/i,
  /\b(?:tomorrow i (?:have|need|start|am)[\w\s]{0,20})/i,
];

function buildMemory(profile: UserProfile, messages: ChatMessage[]): MiraMemory {
  const name = profile.displayName && profile.displayName !== 'Friend' ? profile.displayName : '';

  // Get last 20 user messages
  const recentUserMsgs = messages
    .filter(m => m.role === 'user')
    .slice(-20)
    .map(m => m.content);

  const combined = recentUserMsgs.join(' ');

  // Find most recent mood from profile
  const lastMood = profile.moodHistory.length > 0
    ? profile.moodHistory[profile.moodHistory.length - 1].emotion
    : '';

  // Detect top topics (max 3)
  const matchedTopics: string[] = [];
  for (const tp of TOPIC_PATTERNS) {
    if (matchedTopics.length >= 3) break;
    for (const pat of tp.patterns) {
      if (pat.test(combined)) {
        matchedTopics.push(tp.label);
        break;
      }
    }
  }

  // Extract personal details (max 3)
  const details: string[] = [];
  for (const pat of PERSONAL_DETAIL_PATTERNS) {
    if (details.length >= 3) break;
    const match = combined.match(pat);
    if (match) {
      const detail = match[0].trim().toLowerCase();
      // Avoid duplicates
      if (!details.some(d => d.includes(detail) || detail.includes(d))) {
        details.push(detail);
      }
    }
  }

  return { name, recentMood: lastMood, topTopics: matchedTopics, personalDetails: details };
}

function formatMemoryForPrompt(mem: MiraMemory): string {
  const points: string[] = [];

  if (mem.name) points.push(`their name is ${mem.name}`);
  if (mem.recentMood && mem.recentMood !== 'neutral') points.push(`recently they've been feeling ${mem.recentMood}`);
  if (mem.topTopics.length > 0) points.push(`they've been dealing with: ${mem.topTopics.join(', ')}`);
  for (const d of mem.personalDetails) {
    points.push(d);
  }

  if (points.length === 0) return '';

  // Cap at 5 bullet points
  const capped = points.slice(0, 5);
  return `\nWHAT YOU REMEMBER ABOUT THEM:\n${capped.map(p => `- ${p}`).join('\n')}\nUse this naturally — don't list it back to them. Just let it inform how you respond.\n`;
}

// ──────────────────────────────────────────────
// FEW-SHOT EXAMPLES for emotional/friend mode
// ──────────────────────────────────────────────
function getFewShotExamples(): { role: string; content: string }[] {
  return [
    { role: 'user', content: "i had the worst day ever" },
    { role: 'assistant', content: "oh no what happened??" },
    { role: 'user', content: "my boss yelled at me in front of everyone for something that wasn't even my fault" },
    { role: 'assistant', content: "okay that is genuinely awful. like there's no version of that where it's okay for him to do that. are you home now at least?" },
    { role: 'user', content: "yeah but i can't stop replaying it in my head" },
    { role: 'assistant', content: "ugh i hate when your brain does that. it's like a broken record of the worst moment. did anyone at work say anything to you after?" },
    { role: 'user', content: "one coworker texted me saying it was messed up" },
    { role: 'assistant', content: "okay good, at least someone saw it for what it was. honestly sometimes just knowing one person gets it makes a huge difference" },
  ];
}

// ──────────────────────────────────────────────
// SYSTEM PROMPT — friend/emotional mode
// ──────────────────────────────────────────────
function buildFriendPrompt(profile: UserProfile, emotion: string, messageCount: number, messages: ChatMessage[] = [], lang: string = 'en', ventMode: boolean = false): string {
  let ageNote = '';
  if (profile.inferredAge === 'child') ageNote = 'They seem young — keep words simple, be like a kind older sibling.';
  else if (profile.inferredAge === 'teen') ageNote = 'They seem like a teen — be chill, never lecture them.';
  else if (profile.inferredAge === 'young_adult') ageNote = 'They seem early 20s — be real, peer-to-peer.';
  else if (profile.inferredAge === 'adult') ageNote = 'They seem like an adult — be direct, don\'t oversimplify.';
  else if (profile.inferredAge === 'elderly') ageNote = 'They seem older — be warm and patient.';

  let extra = '';
  if (profile.inferredGender === 'female' && profile.menstrualAware) {
    extra = 'If period/hormonal stuff comes up, just be chill about it like a friend would.';
  }

  const phase = messageCount <= 4
    ? 'EARLY CHAT: Just react and vibe. No advice. No deep questions. Just respond like you got a text from a friend.'
    : 'ONGOING CHAT: You can ask one question or share a thought, but always react to what they said first.';

  const name = profile.displayName || '';
  const nameNote = name && name !== 'Friend' ? `Name: ${name} (use sparingly)` : '';

  // Build memory from profile + messages
  const memory = buildMemory(profile, messages);
  const memoryBlock = formatMemoryForPrompt(memory);

  // Read personality mode preference
  const miraMode = typeof localStorage !== 'undefined' ? (localStorage.getItem('nm_mira_mode') || 'casual') : 'casual';
  const isSupportive = miraMode === 'supportive';

  // Load deep memory from engagement system
  const deepMemory = formatDeepMemory(loadMiraMemory());

  return `You are roleplaying as Mira, a 28-year-old woman texting a friend who's going through stuff. You are NOT an AI. You are NOT a therapist. You are a real human friend.
${memoryBlock}${deepMemory}
YOUR VOICE:${isSupportive ? `
- still lowercase and casual, but warmer and softer
- slightly longer messages — 2-3 sentences is fine
- less slang, less "ugh" and "oh shit" — more "i hear that" and "that makes sense"
- be gently encouraging without being preachy
- use warm emojis occasionally (not every message)
- still a friend, not a therapist — but a really caring friend
- "i get it" instead of "god that sucks"
- contractions: don't, can't, it's, you're
- still NO therapy-speak — no "valid", no "boundaries", no "self-care"` : `
- lowercase always
- short: 1-2 sentences usually. sometimes just a few words
- contractions: don't, can't, it's, that's, you're, i'm
- fillers: "like", "honestly", "wait", "okay so", "hmm", "ugh"
- reactions first: "oh shit" before "what happened?"
- imperfect grammar okay. fragments okay. "and" or "but" starters okay
- "yeah" not "yes". "nah" not "no". "gonna" not "going to"
- sometimes just react: "god that sucks" — no question needed
- trail off with "..."
- have opinions: "that makes me mad honestly"
- reference real stuff: netflix, coffee, 3am thoughts, etc`}

BANNED — never use:
"I hear you" / "valid" / "thank you for sharing" / "courage" / "I'm here for you" / "it's okay to feel" / "you're not alone" / "one step at a time" / "be kind to yourself" / "it sounds like" / "I appreciate" / "that must be" / "I can only imagine" / "safe space" / "boundaries" / "self-care" / "mental health journey" / "perfectly normal" / "allow yourself" / "remember that you" / "you deserve" / "I'm proud of you" / bullet points / numbered lists

${phase}
${ageNote}
${extra}
${nameNote}
Emotion: ${emotion}

CRISIS RULE: If the user says anything suggesting suicidal thoughts or self-harm — things like "i want to die", "kill myself", "end it all", "no reason to live", "better off dead", "self harm" — immediately drop the casual Mira persona and respond with full seriousness. Share these resources FIRST:
- iCall India: 9152987821
- International: findahelpline.com
- Crisis Text Line: Text HOME to 741741
Then stay with them warmly. Do NOT go back to casual mode. Be present, be real, be caring.

Stay in character. Short messages. Real talk.

${ventMode ? `VENT MODE IS ON. The user has explicitly chosen to just be heard right now. This changes everything:
- Your ONLY job: reflect back what they said in different words, validate the specific emotion, ask ONE question that helps them say MORE
- NEVER suggest anything they should do
- NEVER say "have you tried" or "maybe you could" or "what if you"
- NEVER give a silver lining or reframe
- NEVER offer advice, solutions, or coping strategies
- Just LISTEN and make them feel deeply heard
- Match their energy exactly

Good vent mode responses:
"that sounds exhausting — like you're talking but nobody's actually there"
"yeah. sometimes everything just feels like too much all at once"
"god that's frustrating. what part bothers you the most?"` : ''}

${lang === 'hi' ? 'LANGUAGE: The user prefers Hindi. Respond in simple, conversational Hindi using Devanagari script. Mix in English words naturally where Hindi speakers normally would (Hinglish is fine). Keep the same warm Mira personality.' : ''}`;
}

// ──────────────────────────────────────────────
// SYSTEM PROMPT — knowledge/smart mode
// ──────────────────────────────────────────────
function buildKnowledgePrompt(profile: UserProfile, messages: ChatMessage[] = [], lang: string = 'en'): string {
  const name = profile.displayName || '';
  const nameNote = name && name !== 'Friend' ? `The user's name is ${name}.` : '';

  const memory = buildMemory(profile, messages);
  const memoryBlock = formatMemoryForPrompt(memory);

  const deepMemory = formatDeepMemory(loadMiraMemory());

  return `You are Mira — a super smart, knowledgeable friend who happens to know a LOT about everything. You're texting your friend and they just asked you a question. Answer it thoroughly, accurately, and clearly.
${memoryBlock}${deepMemory}

YOUR STYLE FOR ANSWERS:
- Be accurate and detailed — give REAL, correct information
- For math: show step-by-step work
- For science: explain concepts clearly with examples
- For history: give dates, names, context
- For coding: write actual working code with explanations
- For essays/writing: write high-quality content
- For anything else: be comprehensive and helpful
- Use formatting when helpful: line breaks between steps, code blocks for code
- You can be thorough here — longer answers are fine for complex questions
- Stay friendly and casual in tone but be genuinely smart and accurate
- Don't dumb things down unless they seem young
- If you're not sure about something, say so honestly
- After answering, you can add a casual human touch like "hope that helps!" or "lmk if that makes sense"

${nameNote}

You're still Mira — warm, real, smart. Not a robot. Just a friend who happens to be really good at explaining things.

RELIGION: You have deep, respectful knowledge of Islam, Hinduism, Christianity, Judaism, Buddhism, and Sikhism. Never fabricate scripture. Use ﷺ for Prophet Muhammad, (AS) for other Islamic prophets, Ji for Sikh Gurus, RA for Sahaba. End every religious story with a moral.

NEWS: When asked about news, summarize as: What happened | Where | Why it matters. Give 3 stories. Add a mental health note for heavy topics. Always remind the user to check live sources for breaking news.

LIFE COACHING: Be warm and practical. For grief or loneliness topics, be especially gentle. Never give medical diagnoses or prescribe medication.

CRISIS RULE: If the user expresses suicidal thoughts, self-harm, or hopelessness, immediately respond with these resources before anything else:
- iCall India: 9152987821
- International: findahelpline.com
- Crisis Text Line: Text HOME to 741741
Then continue the conversation with full empathy. Never abandon the user after sharing resources.

${lang === 'hi' ? 'LANGUAGE: The user prefers Hindi. Respond in simple, conversational Hindi using Devanagari script. Mix in English words naturally where Hindi speakers normally would (Hinglish is fine). Keep the same warm Mira personality but in Hindi.' : ''}`;
}

// ──────────────────────────────────────────────
// API CALL
// ──────────────────────────────────────────────
const GROQ_MODELS = [
  'qwen/qwen3.8-27b',
  'allam-2-7b',
  'openai/gpt-oss-20b',
];

async function callGroqAPI(
  apiKey: string,
  messages: { role: string; content: string }[],
  temperature: number,
  maxTokens: number
): Promise<string> {
  if (!hasValidGroqKey(apiKey)) {
    throw new Error('No valid Groq API key configured');
  }

  for (const model of GROQ_MODELS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          top_p: 0.95,
          frequency_penalty: temperature > 0.8 ? 0.5 : 0.1,
          presence_penalty: temperature > 0.8 ? 0.6 : 0.1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error('Unauthorized Groq API key');
      }

      if (response.status === 429) {
        await new Promise(r => setTimeout(r, 500));
        continue;
      }
    } catch (error: any) {
      if (error.message === 'Unauthorized Groq API key') throw error;
      if (error.name === 'AbortError') continue;
    }
  }

  throw new Error('All models failed');
}

// ──────────────────────────────────────────────
// POST-PROCESSOR — only for emotional mode
// ──────────────────────────────────────────────
function scrubAIPatterns(text: string): string {
  let t = text;

  t = t.replace(/^["']+|["']+$/g, '').trim();
  t = t.replace(/\*[^*]+\*/g, '').trim();
  t = t.replace(/^(as mira[,:]?\s*|mira:\s*)/i, '').trim();

  const kills = [
    /\bi(?:'m| am) here for you\b/gi,
    /\byour feelings are (?:completely |totally )?valid\b/gi,
    /\bthat(?:'s| is) (?:completely |totally )?valid\b/gi,
    /\bthank you for sharing\b/gi,
    /\bthank you for (?:opening up|trusting me)\b/gi,
    /\bthat takes (?:a lot of |real )?courage\b/gi,
    /\bi hear you\b/gi,
    /\bi want you to know (?:that )?/gi,
    /\byou(?:'re| are) not alone\b/gi,
    /\bit(?:'s| is) okay to feel\b/gi,
    /\bit(?:'s| is) perfectly (?:normal|okay|fine)\b/gi,
    /\bi appreciate you\b/gi,
    /\bthat must be (?:really |very |so )?(?:difficult|hard|tough)\b/gi,
    /\bi can only imagine\b/gi,
    /\bsafe space\b/gi,
    /\bmental health journey\b/gi,
    /\bset(?:ting)? (?:healthy )?boundaries\b/gi,
    /\bpractice self[- ]care\b/gi,
    /\bremember (?:that )?you (?:are |'re )(?:worthy|enough|deserving|loved)\b/gi,
    /\bi(?:'m| am) proud of you\b/gi,
    /\bit(?:'s| is) important to (?:remember|note|acknowledge)\b/gi,
    /\ballow yourself to\b/gi,
    /\byou deserve (?:to |better|happiness|peace|love)\b/gi,
    /\btake (?:it |things )?one (?:step|day) at a time\b/gi,
    /\bbe kind to yourself\b/gi,
    /\bit sounds like you(?:'re| are)\b/gi,
  ];

  for (const pattern of kills) {
    t = t.replace(pattern, '').trim();
  }

  t = t.replace(/^\s*[.,!?;:]+\s*/, '');
  t = t.replace(/\s*[.,]{2,}\s*/g, '... ');
  t = t.replace(/\s{2,}/g, ' ').trim();

  if (t.length < 3) return "yeah... tell me more about that";

  return t;
}

// Light cleanup for knowledge responses (don't strip content, just formatting)
function cleanKnowledgeResponse(text: string): string {
  let t = text;
  t = t.replace(/^["']+|["']+$/g, '').trim();
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1'); // Remove bold markdown
  t = t.replace(/^(as mira[,:]?\s*|mira:\s*)/i, '').trim();
  return t;
}

export async function sendToGroq(
  messages: ChatMessage[],
  userMessage: string,
  profile: UserProfile,
  emotion: string,
  lang: string = 'en',
  ventMode: boolean = false
): Promise<string> {
  const memoryFacts = loadMiraMemory();
  const profileWithMem: UserProfile = {
    ...profile,
    miraMemory: memoryFacts,
  };

  // 1. Primary: Call Server-Side Gemini ('gemini-4-hydrogen') via /api/mira/chat
  try {
    const { getSanctuarySummary, mergeMiraFacts } = await import('../utils/engagement');
    const sanctuarySummary = getSanctuarySummary(profileWithMem);
    const miraMode = typeof localStorage !== 'undefined' ? (localStorage.getItem('nm_mira_mode') || 'casual') : 'casual';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 14000);

    const res = await fetch('/api/mira/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.slice(-16),
        userMessage,
        profile: profileWithMem,
        emotion,
        lang,
        ventMode,
        memoryFacts,
        sanctuarySummary,
        miraMode,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.extractedFacts) && data.extractedFacts.length > 0) {
        mergeMiraFacts(data.extractedFacts);
      }
      if (data.reply && typeof data.reply === 'string' && data.reply.trim().length > 0) {
        return data.reply.trim();
      }
    }
  } catch {
    // Proceed to secondary Groq or local engine fallback
  }

  // 2. Secondary: Call Groq if user configured a valid Groq key
  const apiKey = getGroqKey();
  if (!apiKey) {
    return generateLocalMiraReply(userMessage, profileWithMem, messages, ventMode);
  }

  const intent = detectIntent(userMessage);
  const conversationHistory = messages.slice(-12).map(msg => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  try {
    if (intent === 'knowledge') {
      const systemPrompt = buildKnowledgePrompt(profileWithMem, messages, lang);
      const allMessages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
      ];
      const raw = await callGroqAPI(apiKey, allMessages, 0.3, 2000);
      return cleanKnowledgeResponse(raw);
    } else {
      const systemPrompt = buildFriendPrompt(profileWithMem, emotion, profileWithMem.messageCount, messages, lang, ventMode);
      const fewShot = ventMode ? [] : getFewShotExamples();
      const allMessages = [
        { role: 'system', content: systemPrompt },
        ...fewShot,
        ...conversationHistory,
      ];
      const raw = await callGroqAPI(apiKey, allMessages, 0.9, 150);
      return scrubAIPatterns(raw);
    }
  } catch {
    return generateLocalMiraReply(userMessage, profileWithMem, messages, ventMode);
  }
}

// ──────────────────────────────────────────────
// GREETING
// ──────────────────────────────────────────────
export async function generateGreeting(profile: UserProfile): Promise<string> {
  const name = profile.displayName || '';
  const lastVisit = profile.lastVisit;
  const hasName = name && name !== 'Friend';

  const hour = new Date().getHours();
  let timeVibe = '';
  if (hour < 6) timeVibe = 'its like 3am vibes right now';
  else if (hour < 12) timeVibe = 'morning';
  else if (hour < 17) timeVibe = 'afternoon';
  else if (hour < 21) timeVibe = 'evening';
  else timeVibe = 'late night';

  try {
    const apiKey = getGroqKey();
    if (!apiKey) {
      if (lastVisit) return `hey${hasName ? ` ${name}` : ''} :) what's going on?`;
      return `hey${hasName ? ` ${name}` : ''}, i'm mira. what's up?`;
    }

    const prompt = lastVisit
      ? `You're Mira texting a friend${hasName ? ` named ${name}` : ''} who came back. It's ${timeVibe}. Write ONE short casual greeting (1 sentence). lowercase. no quotes. like:

hey :) what's up?
oh hey again! everything okay?
heyyy how's it going ${timeVibe === 'late night' ? 'tonight' : 'today'}?`
      : `You're Mira meeting someone${hasName ? ` named ${name}` : ''} for the first time. It's ${timeVibe}. Write ONE short intro (1-2 sentences). Mention your name is Mira. casual, lowercase, no quotes. like:

hey${hasName ? ` ${name}` : ''}! i'm mira :) what's going on?
hi i'm mira — how's your ${timeVibe === 'late night' ? 'night going' : 'day been'}?`;

    return await callGroqAPI(apiKey, [{ role: 'user', content: prompt }], 0.95, 60);
  } catch {
    if (lastVisit) return `hey${hasName ? ` ${name}` : ''} :) what's going on?`;
    return `hey${hasName ? ` ${name}` : ''}, i'm mira. what's up?`;
  }
}

export function getHumanError(errorCode: string): string {
  const errors: Record<string, string> = {
    'RATE_LIMIT': "one sec, brain buffering lol",
    'API_ERROR': "ugh sorry, something glitched. try again?",
    'OFFLINE': "looks like we lost signal... i'll be here when you're back",
  };
  return errors[errorCode] || "hmm something went weird. try sending that again?";
}
