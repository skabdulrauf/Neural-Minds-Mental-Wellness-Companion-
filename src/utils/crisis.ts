import { CrisisResource, UserProfile } from './types';

const CRISIS_KEYWORDS = [
  'kill myself', 'end my life', 'want to die', 'suicide',
  'hurt myself', 'self harm', 'self-harm', 'cut myself',
  'no reason to live', "don't want to exist", 'dont want to exist',
  'better off dead', 'overdose', 'end it all', 'take my life',
  'goodbye forever', 'killing myself', 'suicidal',
  'wanna die', 'want 2 die', 'no point in living', 'rather be dead',
];

export function detectCrisis(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return CRISIS_KEYWORDS.some(keyword => lower.includes(keyword));
}

// ─── REAL VERIFIED CRISIS LINES ───
export const INDIA_CRISIS_RESOURCES: CrisisResource[] = [
  { name: 'iCall (TISS)', phone: '9152987821', description: 'Mon-Sat 8am-10pm • Trained psychologists' },
  { name: 'Vandrevala Foundation', phone: '1860-2662-345', description: '24/7 • Hindi, English, and more' },
  { name: 'AASRA', phone: '9820466627', description: '24/7 • Crisis intervention' },
  { name: 'Snehi', phone: '044-24640050', description: '24/7 • Emotional support' },
];

export const INTERNATIONAL_CRISIS_RESOURCES: CrisisResource[] = [
  { name: 'Crisis Text Line (US)', phone: 'Text HOME to 741741', description: '24/7 text-based crisis support' },
  { name: 'Samaritans (UK)', phone: '116 123', description: '24/7 • Free from any phone' },
  { name: 'Lifeline (Australia)', phone: '13 11 14', description: '24/7 • Crisis support and prevention' },
];

// Inline crisis resources text for chat bubble
export function getCrisisInlineText(): string {
  return `hey — i want to make sure you're okay. if things feel really heavy right now, there are people you can talk to right now:

📞 iCall: 9152987821 (Mon-Sat 8am-10pm)
📞 Vandrevala Foundation: 1860-2662-345 (24/7)
📞 AASRA: 9820466627 (24/7)
📞 Snehi: 044-24640050 (24/7)
🌍 iCall chat: icallhelpline.org

you don't have to do this alone. i'm here too.`;
}

// ─── SAFETY CHECK-IN ───
// Returns true if user's mood has been 1 or 2 for 3+ consecutive days
export function shouldShowSafetyCheckin(profile: UserProfile): boolean {
  if (profile.moodHistory.length < 3) return false;

  // Check if already shown today
  const today = new Date().toISOString().split('T')[0];
  const lastShown = localStorage.getItem('nm_safety_checkin_date');
  if (lastShown === today) return false;

  const last3 = profile.moodHistory.slice(-3);
  const allLow = last3.every(m => typeof m.mood === 'number' && m.mood <= 2);

  // Also check they're from 3 consecutive recent days
  if (!allLow) return false;

  const now = Date.now();
  const threeDaysAgo = new Date(now - 3 * 86400000).toISOString().split('T')[0];
  const recentEnough = last3.every(m => m.date >= threeDaysAgo);

  return allLow && recentEnough;
}

export function markSafetyCheckinShown() {
  localStorage.setItem('nm_safety_checkin_date', new Date().toISOString().split('T')[0]);
}

// ─── POST-CRISIS CHECK-IN ───
export function recordPanicUse() {
  localStorage.setItem('nm_last_panic', Date.now().toString());
}

export function shouldShowPostCrisisCheckin(): boolean {
  const lastPanic = localStorage.getItem('nm_last_panic');
  if (!lastPanic) return false;

  const elapsed = Date.now() - parseInt(lastPanic, 10);
  const tenMinutes = 10 * 60 * 1000;

  // Show if 10+ minutes have passed and we haven't sent the check-in yet
  if (elapsed >= tenMinutes) {
    const checkInSent = localStorage.getItem('nm_post_crisis_sent');
    if (checkInSent === lastPanic) return false; // already sent for this panic event
    return true;
  }
  return false;
}

export function markPostCrisisCheckinSent() {
  const lastPanic = localStorage.getItem('nm_last_panic');
  if (lastPanic) localStorage.setItem('nm_post_crisis_sent', lastPanic);
}

// ─── OTHER EXISTING EXPORTS ───
export const DISTRESSED_EMOTIONS = [
  'sadness', 'despair', 'hopelessness', 'anxiety', 'panic',
  'anger', 'grief', 'loneliness', 'shame', 'guilt', 'fear',
  'overwhelmed', 'exhaustion', 'exhausted', 'worthless', 'helpless',
  'confusion',
];

export function isDistressedEmotion(emotion: string): boolean {
  return DISTRESSED_EMOTIONS.some(e => emotion.toLowerCase().includes(e));
}

export const PHQ9_QUESTIONS = [
  { id: 1, text: "Over the last 2 weeks, how often have you had little interest or pleasure in doing things?" },
  { id: 2, text: "How often have you been feeling down, depressed, or hopeless?" },
  { id: 3, text: "How often have you had trouble falling or staying asleep, or sleeping too much?" },
  { id: 4, text: "How often have you felt tired or had little energy?" },
  { id: 5, text: "How often have you had a poor appetite or been overeating?" },
  { id: 6, text: "How often have you felt bad about yourself — or that you're a failure?" },
  { id: 7, text: "How often have you had trouble concentrating on things?" },
  { id: 8, text: "How often have you been moving or speaking noticeably slowly, or been fidgety and restless?" },
  { id: 9, text: "How often have you had thoughts that you'd be better off dead or of hurting yourself?" },
];

export function interpretPHQ9(score: number): { severity: string; message: string } {
  if (score <= 4) return { severity: 'Minimal', message: "Your responses suggest you're doing relatively well." };
  if (score <= 9) return { severity: 'Mild', message: "Some mild difficulties. These feelings are real, and support is available." };
  if (score <= 14) return { severity: 'Moderate', message: "Moderate difficulty. Speaking with a professional could really help." };
  if (score <= 19) return { severity: 'Moderately Severe', message: "You're going through a difficult time. Please consider reaching out to a professional." };
  return { severity: 'Severe', message: "Please reach out to a professional — you deserve support through this." };
}
