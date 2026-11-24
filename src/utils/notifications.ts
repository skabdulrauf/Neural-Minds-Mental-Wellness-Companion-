import { UserProfile, AppView } from './types';

export interface AppNotification {
  id: string;
  message: string;
  action: { label: string; view: AppView };
  emoji: string;
}

export function generateNotifications(profile: UserProfile): AppNotification[] {
  const notifs: AppNotification[] = [];
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0=Sun

  // Already dismissed today
  const dismissed = getDismissed();

  // CHECK 1 — Mood check-in reminder
  const moodToday = profile.moodHistory.some(m => m.date === today);
  if (!moodToday && !dismissed.has('mood_checkin')) {
    notifs.push({
      id: 'mood_checkin',
      message: "Hey! You haven't checked in today. How are you feeling? 🌸",
      action: { label: 'Check in now', view: 'dashboard' },
      emoji: '🌸',
    });
  }

  // CHECK 2 — Streak at risk (past 8pm and last active was yesterday)
  if (hour >= 20 && profile.lastActiveDate) {
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
    if (profile.lastActiveDate === yesterday && (profile.streak || 0) >= 2 && !dismissed.has('streak_risk')) {
      notifs.push({
        id: 'streak_risk',
        message: `Don't break your ${profile.streak} day streak! Mira misses you 🔥`,
        action: { label: 'Chat with Mira', view: 'chat' },
        emoji: '🔥',
      });
    }
  }

  // CHECK 3 — Program reminder
  try {
    const progRaw = localStorage.getItem('nm_program');
    if (progRaw && !dismissed.has('program_reminder')) {
      const prog = JSON.parse(progRaw);
      if (prog.programId && prog.currentDay <= 7) {
        const progNames: Record<string, string> = {
          anxiety: '7-Day Anxiety Reset',
          confidence: '7-Day Confidence Builder',
          sleep: '7-Day Sleep Repair',
        };
        notifs.push({
          id: 'program_reminder',
          message: `Your Day ${prog.currentDay} of ${progNames[prog.programId] || 'your program'} is waiting for you 💪`,
          action: { label: 'Continue program', view: 'programs' },
          emoji: '💪',
        });
      }
    }
  } catch {}

  // CHECK 4 — Weekly check-in (Sunday)
  if (dayOfWeek === 0 && profile.moodHistory.length > 0 && !dismissed.has('weekly_summary')) {
    notifs.push({
      id: 'weekly_summary',
      message: 'Your weekly wellness summary is ready 📊',
      action: { label: 'View dashboard', view: 'dashboard' },
      emoji: '📊',
    });
  }

  // CHECK 5 — Positive reinforcement (mood improving 3 days in a row)
  if (profile.moodHistory.length >= 3 && !dismissed.has('mood_improving')) {
    const last3 = profile.moodHistory.slice(-3);
    if (last3.length === 3 &&
        typeof last3[0].mood === 'number' &&
        typeof last3[1].mood === 'number' &&
        typeof last3[2].mood === 'number' &&
        last3[1].mood > last3[0].mood &&
        last3[2].mood > last3[1].mood) {
      notifs.push({
        id: 'mood_improving',
        message: "Your mood has been improving! You're doing great 🌟",
        action: { label: 'See your journey', view: 'dashboard' },
        emoji: '🌟',
      });
    }
  }

  return notifs.slice(0, 3);
}

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem('nm_notif_dismissed');
    if (!raw) return new Set();
    const data = JSON.parse(raw);
    // Only keep today's dismissals
    const today = new Date().toISOString().split('T')[0];
    if (data.date !== today) return new Set();
    return new Set(data.ids || []);
  } catch { return new Set(); }
}

export function dismissNotification(id: string) {
  const today = new Date().toISOString().split('T')[0];
  const current = getDismissed();
  current.add(id);
  localStorage.setItem('nm_notif_dismissed', JSON.stringify({ date: today, ids: [...current] }));
}
