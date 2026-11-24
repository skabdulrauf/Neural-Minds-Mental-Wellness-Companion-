import { UserProfile } from './types';

export interface BadgeDef {
  id: string;
  emoji: string;
  title: string;
  description: string;
  check: (profile: UserProfile, extras: BadgeExtras) => boolean;
}

export interface BadgeExtras {
  breathingSessions: number;
  sleepStoriesOpened: number;
  faithVisits: number;
  newsReads: number;
  sectionsVisited: string[];
  panicUsed: boolean;
  programCompleted: boolean;
}

export const BADGES: BadgeDef[] = [
  { id: 'first_step', emoji: '🌱', title: 'First Step', description: 'Send your first message to Mira',
    check: (p) => (p.messageCount || 0) >= 1 },
  { id: 'streak_3', emoji: '🔥', title: '3 Day Streak', description: 'Use the app 3 days in a row',
    check: (p) => (p.streak || 0) >= 3 },
  { id: 'streak_7', emoji: '💎', title: 'Week Warrior', description: '7 day streak',
    check: (p) => (p.streak || 0) >= 7 },
  { id: 'breath_master', emoji: '🧘', title: 'Breath Master', description: 'Complete 5 breathing exercises',
    check: (_p, e) => e.breathingSessions >= 5 },
  { id: 'journal_keeper', emoji: '📓', title: 'Journal Keeper', description: 'Write 5 journal entries',
    check: (p) => (p.journalEntries?.length || 0) >= 5 },
  { id: 'sleep_seeker', emoji: '🌙', title: 'Sleep Seeker', description: 'Open Sleep Stories 3 times',
    check: (_p, e) => e.sleepStoriesOpened >= 3 },
  { id: 'faith_explorer', emoji: '🕌', title: 'Faith Explorer', description: 'Visit Faith section 3 times',
    check: (_p, e) => e.faithVisits >= 3 },
  { id: 'go_getter', emoji: '💪', title: 'Go-Getter', description: 'Complete a full 7-day program',
    check: (_p, e) => e.programCompleted },
  { id: 'world_watcher', emoji: '🌍', title: 'World Watcher', description: 'Read news 5 times',
    check: (_p, e) => e.newsReads >= 5 },
  { id: 'crisis_survivor', emoji: '❤️', title: 'Crisis Survivor', description: 'Used panic button and felt better',
    check: (_p, e) => e.panicUsed },
  { id: 'mood_tracker', emoji: '🌟', title: 'Mood Tracker', description: 'Log mood 7 days in a row',
    check: (p) => {
      // Check last 7 days all have mood entries
      const now = Date.now();
      for (let i = 0; i < 7; i++) {
        const date = new Date(now - i * 86400000).toISOString().split('T')[0];
        if (!p.moodHistory.some(m => m.date === date)) return false;
      }
      return true;
    }},
  { id: 'all_rounder', emoji: '🏆', title: 'All-Rounder', description: 'Visit every section at least once',
    check: (_p, e) => {
      const required = ['chat','dashboard','breathing','grounding','journal','sounds','stories','toolkit','faith','news','coaching','professionals'];
      return required.every(s => e.sectionsVisited.includes(s));
    }},
];

// Load/save badge extras (counters for things not in profile)
export function loadBadgeExtras(): BadgeExtras {
  try {
    const raw = localStorage.getItem('nm_badge_extras');
    const saved = raw ? JSON.parse(raw) : {};
    return {
      breathingSessions: saved.breathingSessions || 0,
      sleepStoriesOpened: saved.sleepStoriesOpened || 0,
      faithVisits: saved.faithVisits || 0,
      newsReads: saved.newsReads || 0,
      sectionsVisited: saved.sectionsVisited || [],
      panicUsed: saved.panicUsed || false,
      programCompleted: saved.programCompleted || false,
    };
  } catch {
    return { breathingSessions: 0, sleepStoriesOpened: 0, faithVisits: 0, newsReads: 0, sectionsVisited: [], panicUsed: false, programCompleted: false };
  }
}

export function saveBadgeExtras(extras: BadgeExtras) {
  localStorage.setItem('nm_badge_extras', JSON.stringify(extras));
}

export function loadUnlockedBadges(): Set<string> {
  try {
    const raw = localStorage.getItem('nm_badges');
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

export function saveUnlockedBadges(badges: Set<string>) {
  localStorage.setItem('nm_badges', JSON.stringify([...badges]));
}

// Check all badges against current state, return newly unlocked ones
export function checkBadges(profile: UserProfile, extras: BadgeExtras, currentUnlocked: Set<string>): string[] {
  const newlyUnlocked: string[] = [];
  for (const badge of BADGES) {
    if (!currentUnlocked.has(badge.id) && badge.check(profile, extras)) {
      newlyUnlocked.push(badge.id);
    }
  }
  return newlyUnlocked;
}
