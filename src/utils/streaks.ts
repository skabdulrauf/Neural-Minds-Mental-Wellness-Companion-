// ─── STREAK ENGINE ───

export interface StreakData {
  activeDates: string[];    // ISO date strings of meaningful activity
  currentStreak: number;
  bestStreak: number;
  freezesAvailable: number;
  freezesUsed: string[];    // dates where freeze was used
  lastMilestone: number;    // last milestone celebrated (3,7,14,30,100)
}

const STORAGE_KEY = 'nm_streak_data';

export function loadStreakData(): StreakData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { activeDates: [], currentStreak: 0, bestStreak: 0, freezesAvailable: 0, freezesUsed: [], lastMilestone: 0 };
}

export function saveStreakData(data: StreakData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Record today as an active day (called when user does a meaningful action)
export function recordActivity(data: StreakData): StreakData {
  const today = new Date().toISOString().split('T')[0];
  if (data.activeDates.includes(today)) return data; // already recorded

  const updated = { ...data, activeDates: [...data.activeDates, today].slice(-120) }; // keep last 120 days
  return recalculate(updated);
}

// Recalculate streak from active dates
function recalculate(data: StreakData): StreakData {
  const today = new Date().toISOString().split('T')[0];
  const allDates = new Set([...data.activeDates, ...data.freezesUsed]);

  let streak = 0;
  let checkDate = new Date(today + 'T00:00:00');

  // Count backwards from today
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (allDates.has(dateStr)) {
      streak++;
      checkDate = new Date(checkDate.getTime() - 86400000);
    } else {
      break;
    }
  }

  const bestStreak = Math.max(data.bestStreak, streak);

  // Award freezes at milestones
  let freezes = data.freezesAvailable;
  // Award freeze at 7 days (if not already at max)
  if (streak >= 7 && data.freezesAvailable === 0 && data.freezesUsed.length === 0) freezes = 1;
  // Award another at 30 days
  if (streak >= 30 && data.freezesAvailable === 0 && data.freezesUsed.length <= 1) freezes = 1;

  return { ...data, currentStreak: streak, bestStreak, freezesAvailable: freezes };
}

// Use a streak freeze for yesterday
export function useStreakFreeze(data: StreakData): StreakData | null {
  if (data.freezesAvailable <= 0) return null;

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Only useful if yesterday is actually missing
  if (data.activeDates.includes(yesterday) || data.freezesUsed.includes(yesterday)) return null;

  const updated = {
    ...data,
    freezesAvailable: data.freezesAvailable - 1,
    freezesUsed: [...data.freezesUsed, yesterday],
  };

  return recalculate(updated);
}

// Check if streak is at risk (after 8pm and today not yet recorded)
export function isStreakAtRisk(data: StreakData): boolean {
  const hour = new Date().getHours();
  const today = new Date().toISOString().split('T')[0];
  return hour >= 20 && !data.activeDates.includes(today) && data.currentStreak >= 1;
}

// Check for new milestones
export const MILESTONES = [3, 7, 14, 30, 100] as const;

export interface MilestoneInfo {
  days: number;
  message: string;
  fullScreen: boolean; // true for major milestones (7, 30, 100)
  generateMiraMessage: boolean; // true for 7-day milestone
}

export const MILESTONE_MESSAGES: Record<number, MilestoneInfo> = {
  3: { days: 3, message: "3 days! you're building something real 🔥", fullScreen: false, generateMiraMessage: false },
  7: { days: 7, message: "one week! most people quit by day 3. you didn't.", fullScreen: true, generateMiraMessage: true },
  14: { days: 14, message: "two weeks. you're literally rewiring your brain right now.", fullScreen: true, generateMiraMessage: false },
  30: { days: 30, message: "30 days. this is who you are now.", fullScreen: true, generateMiraMessage: false },
  100: { days: 100, message: "100 days. legendary. you've unlocked something most people never do.", fullScreen: true, generateMiraMessage: false },
};

export function checkMilestone(data: StreakData): MilestoneInfo | null {
  for (const m of MILESTONES) {
    if (data.currentStreak >= m && data.lastMilestone < m) {
      return MILESTONE_MESSAGES[m];
    }
  }
  return null;
}

export function markMilestoneCelebrated(data: StreakData, days: number): StreakData {
  return { ...data, lastMilestone: Math.max(data.lastMilestone, days) };
}
