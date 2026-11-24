import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Flame, TrendingUp, Brain, Calendar, Check } from 'lucide-react';
import { UserProfile } from '../utils/types';
import { getEmotionColor, getEmotionEmoji } from '../utils/emotions';
import { loadWeeklyWrapped } from '../utils/engagement';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

interface DashboardProps {
  profile: UserProfile;
  setProfile?: (p: UserProfile) => void;
}

export default function Dashboard({ profile, setProfile }: DashboardProps) {
  const weeklyWrapped = useMemo(() => loadWeeklyWrapped(), []);

  const moodData = useMemo(() => {
    const validHistory = profile.moodHistory.filter(m => {
      try {
        const d = new Date(m.date);
        return !isNaN(d.getTime()) && typeof m.mood === 'number';
      } catch {
        return false;
      }
    });
    
    const last14 = validHistory.slice(-14);
    return {
      labels: last14.map(m => {
        const d = new Date(m.date);
        return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
      }),
      datasets: [{
        label: 'Mood',
        data: last14.map(m => m.mood),
        borderColor: '#3d8768',
        backgroundColor: 'rgba(61, 135, 104, 0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointBackgroundColor: '#3d8768',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverRadius: 8,
      }],
    };
  }, [profile.moodHistory]);

  const emotionFrequency = useMemo(() => {
    const counts: Record<string, number> = {};
    profile.moodHistory.forEach(m => {
      if (m.emotion) {
        counts[m.emotion] = (counts[m.emotion] || 0) + 1;
      }
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return {
      labels: sorted.map(([e]) => e),
      datasets: [{
        data: sorted.map(([, c]) => c),
        backgroundColor: sorted.map(([e]) => getEmotionColor(e)),
        borderWidth: 0,
        hoverOffset: 8,
      }],
    };
  }, [profile.moodHistory]);

  const phq9Data = useMemo(() => {
    const validScores = profile.phq9Scores.filter(s => typeof s === 'number' && !isNaN(s));
    return {
      labels: validScores.map((_, i) => `#${i + 1}`),
      datasets: [{
        label: 'PHQ-9 Score',
        data: validScores,
        backgroundColor: validScores.map(s =>
          s <= 4 ? '#8dc2a8' : s <= 9 ? '#e4ad5e' : s <= 14 ? '#ed8f7a' : '#cd5035'
        ),
        borderRadius: 8,
        borderSkipped: false,
      }],
    };
  }, [profile.phq9Scores]);

  const avgMood = useMemo(() => {
    const validMoods = profile.moodHistory.filter(m => typeof m.mood === 'number' && !isNaN(m.mood));
    if (validMoods.length === 0) return '–';
    return (validMoods.reduce((s, m) => s + m.mood, 0) / validMoods.length).toFixed(1);
  }, [profile.moodHistory]);

  const topEmotion = useMemo(() => {
    if (profile.moodHistory.length === 0) return null;
    const counts: Record<string, number> = {};
    profile.moodHistory.forEach(m => { 
      if (m.emotion) {
        counts[m.emotion] = (counts[m.emotion] || 0) + 1; 
      }
    });
    const entries = Object.entries(counts);
    if (entries.length === 0) return null;
    const top = entries.sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : null;
  }, [profile.moodHistory]);

  const validMoodHistoryLength = profile.moodHistory.filter(m => m.date && m.mood !== undefined).length;

  return (
    <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-5xl mx-auto space-y-6 overflow-y-auto h-full">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="font-serif text-3xl text-forest-900 mb-1">Your Journey</h2>
        <p className="text-sand-500">A reflection of how you've been feeling</p>
      </motion.div>

      {/* Mental Health Score */}
      <MentalHealthScore profile={profile} />

      {/* Daily Mood Check-In Widget */}
      {setProfile && <DailyMoodCheckIn profile={profile} setProfile={setProfile} />}

      {/* Weekly Wrapped */}
      {weeklyWrapped && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-dusk-50 to-forest-50 rounded-2xl border border-dusk-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] font-bold text-dusk-600 uppercase tracking-wider mb-1">Your Week in Review</p>
              <p className="font-serif text-lg text-forest-900">weekly wrapped</p>
            </div>
            <span className="text-2xl">📊</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
            {[
              { v: weeklyWrapped.messageCount, l: 'messages' },
              { v: weeklyWrapped.moodAvg ? `${weeklyWrapped.moodAvg}/5` : '—', l: 'avg mood' },
              { v: weeklyWrapped.journalCount, l: 'journaled' },
              { v: `${weeklyWrapped.streakDays}d`, l: 'streak' },
            ].map((s, i) => (
              <div key={i} className="bg-white/70 rounded-xl p-3 text-center">
                <p className="font-serif text-2xl text-forest-900">{s.v}</p>
                <p className="text-[10px] text-sand-500 mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>

          {weeklyWrapped.weekMoods.length > 0 && (
            <div className="flex items-center justify-between gap-1 mb-4">
              {weeklyWrapped.weekMoods.map((m, i) => (
                <div key={i} className="flex-1 text-center">
                  <div className={`w-5 h-5 rounded-full mx-auto mb-1 ${
                    m.mood <= 1 ? 'bg-clay-500' : m.mood <= 2 ? 'bg-clay-300' : m.mood <= 3 ? 'bg-warm-400' : m.mood <= 4 ? 'bg-forest-300' : 'bg-forest-500'
                  }`} />
                  <p className="text-[9px] text-sand-400">{m.day}</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-xl p-4 border border-sand-100">
            <p className="text-sm text-forest-800 leading-relaxed">{weeklyWrapped.aiInsight}</p>
            <p className="text-xs text-dusk-600 mt-2">trend: {weeklyWrapped.moodTrend}</p>
          </div>
        </motion.div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: <Flame className="w-5 h-5 text-warm-500" />, label: 'Streak', value: `${profile.streak || 0} ${(profile.streak || 0) === 1 ? 'day' : 'days'}`, bg: 'bg-warm-50', border: 'border-warm-200' },
          { icon: <TrendingUp className="w-5 h-5 text-forest-500" />, label: 'Avg Mood', value: avgMood, bg: 'bg-forest-50', border: 'border-forest-200' },
          { icon: <Brain className="w-5 h-5 text-dusk-500" />, label: 'Messages', value: `${profile.messageCount || 0}`, bg: 'bg-dusk-50', border: 'border-dusk-200' },
          { icon: <Calendar className="w-5 h-5 text-clay-500" />, label: 'Top Feeling', value: topEmotion ? `${getEmotionEmoji(topEmotion)} ${topEmotion}` : '–', bg: 'bg-clay-50', border: 'border-clay-200' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`${stat.bg} border ${stat.border} rounded-2xl p-4`}
          >
            <div className="flex items-center gap-2 mb-2">{stat.icon}</div>
            <p className="font-serif text-2xl text-forest-900">{stat.value}</p>
            <p className="text-xs text-sand-500 mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Mood timeline */}
      {validMoodHistoryLength > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-sand-200 p-6"
        >
          <h3 className="font-serif text-xl text-forest-900 mb-4">Mood Timeline</h3>
          <div className="h-64">
            <Line
              data={moodData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    min: 0, max: 5,
                    ticks: {
                      callback: (val) => {
                        const labels: Record<number, string> = { 1: '😢', 2: '😔', 3: '😐', 4: '🙂', 5: '😊' };
                        return labels[val as number] || '';
                      },
                      font: { size: 16 },
                    },
                    grid: { color: 'rgba(0,0,0,0.04)' },
                    border: { display: false },
                  },
                  x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { font: { size: 11 }, color: '#b39b7a' },
                  },
                },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: '#204538',
                    titleFont: { size: 12 },
                    bodyFont: { size: 13 },
                    padding: 10,
                    cornerRadius: 12,
                  },
                },
              }}
            />
          </div>
        </motion.div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Emotion frequency */}
        {validMoodHistoryLength > 0 && emotionFrequency.labels.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-sand-200 p-6"
          >
            <h3 className="font-serif text-xl text-forest-900 mb-4">Emotion Landscape</h3>
            <div className="h-56 flex items-center justify-center">
              <Doughnut
                data={emotionFrequency}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '65%',
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { padding: 12, usePointStyle: true, pointStyleWidth: 8, font: { size: 11 } },
                    },
                  },
                }}
              />
            </div>
          </motion.div>
        )}

        {/* PHQ-9 history */}
        {profile.phq9Scores.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl border border-sand-200 p-6"
          >
            <h3 className="font-serif text-xl text-forest-900 mb-4">PHQ-9 History</h3>
            <div className="h-56">
              <Bar
                data={phq9Data}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      min: 0, max: 27,
                      grid: { color: 'rgba(0,0,0,0.04)' },
                      border: { display: false },
                      ticks: { font: { size: 11 }, color: '#b39b7a' },
                    },
                    x: {
                      grid: { display: false },
                      border: { display: false },
                      ticks: { font: { size: 11 }, color: '#b39b7a' },
                    },
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: '#204538',
                      cornerRadius: 12,
                      padding: 10,
                    },
                  },
                }}
              />
            </div>
          </motion.div>
        )}
      </div>

      {validMoodHistoryLength === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <div className="w-20 h-20 bg-forest-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📊</span>
          </div>
          <p className="font-serif text-xl text-forest-900 mb-2">Your story starts here</p>
          <p className="text-sand-500 max-w-sm mx-auto">
            As you share and chat with Mira, your emotional journey will be beautifully mapped out here.
          </p>
        </motion.div>
      )}

      {/* Download Report Button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        <button onClick={() => window.print()}
          className="w-full bg-white hover:bg-forest-50 border border-sand-200 hover:border-forest-200 text-forest-700 py-3 rounded-2xl text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
          📄 Download My Wellness Report
        </button>
      </motion.div>

      {/* Hidden printable report */}
      <WellnessReport profile={profile} />
    </div>
  );
}

// ── PRINTABLE WELLNESS REPORT ──
function WellnessReport({ profile }: { profile: UserProfile }) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
  const weekMoods = profile.moodHistory.filter(m => m.date >= weekAgo && typeof m.mood === 'number');
  const avgMood = weekMoods.length > 0 ? (weekMoods.reduce((s, m) => s + m.mood, 0) / weekMoods.length) : 0;
  
  // Trend
  const firstHalf = weekMoods.slice(0, Math.ceil(weekMoods.length / 2));
  const secondHalf = weekMoods.slice(Math.ceil(weekMoods.length / 2));
  const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((s, m) => s + m.mood, 0) / firstHalf.length : 0;
  const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((s, m) => s + m.mood, 0) / secondHalf.length : 0;
  const trend = secondAvg > firstAvg + 0.3 ? 'Improving ↑' : secondAvg < firstAvg - 0.3 ? 'Declining ↓' : 'Stable →';

  // Score calculation (same as MentalHealthScore)
  const moodPts = weekMoods.length > 0 ? Math.round((avgMood / 5) * 30) : 0;
  const journalPts = Math.min((profile.journalEntries || []).filter(j => j.date >= weekAgo).length * 5, 20);
  const streakPts = Math.min((profile.streak || 0) * 3, 20);
  const latestPhq = profile.phq9Scores.length > 0 ? profile.phq9Scores[profile.phq9Scores.length - 1] : -1;
  const phqPts = latestPhq >= 0 ? Math.max(0, Math.round(20 - (latestPhq / 27) * 20)) : 0;
  const activityPts = Math.min(weekMoods.length * 2, 10);
  const totalScore = Math.min(moodPts + journalPts + streakPts + phqPts + activityPts, 100);

  const scoreLabel = totalScore <= 33 ? 'Needs attention' : totalScore <= 60 ? 'Managing' : totalScore <= 80 ? 'Doing well' : 'Thriving';
  const phqLabel = latestPhq < 0 ? 'Not assessed' : latestPhq <= 4 ? 'Minimal' : latestPhq <= 9 ? 'Mild' : latestPhq <= 14 ? 'Moderate' : latestPhq <= 19 ? 'Moderately Severe' : 'Severe';

  const moodEmoji = (v: number) => v <= 1 ? '😢' : v <= 2 ? '😔' : v <= 3 ? '😐' : v <= 4 ? '🙂' : '😊';

  return (
    <div id="wellness-report" className="hidden print:block">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #wellness-report, #wellness-report * { visibility: visible !important; }
          #wellness-report {
            position: fixed !important;
            left: 0; top: 0; right: 0;
            width: 100% !important;
            padding: 40px !important;
            background: white !important;
            font-family: 'Inter', system-ui, sans-serif !important;
            color: #1b392f !important;
            font-size: 13px !important;
            line-height: 1.6 !important;
          }
          .report-header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #3d8768; padding-bottom: 20px; }
          .report-title { font-size: 28px; font-weight: 700; color: #255644; margin: 0; font-family: 'DM Serif Display', Georgia, serif; }
          .report-subtitle { font-size: 14px; color: #725e4d; margin: 4px 0 0; }
          .report-meta { font-size: 11px; color: #b39b7a; margin-top: 8px; }
          .report-section { margin-bottom: 24px; }
          .report-section h3 { font-size: 16px; font-weight: 700; color: #255644; margin: 0 0 10px; padding-bottom: 6px; border-bottom: 1px solid #e5ded0; }
          .report-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .report-stat { background: #f0f7f4; border-radius: 8px; padding: 12px; }
          .report-stat-value { font-size: 24px; font-weight: 700; color: #255644; }
          .report-stat-label { font-size: 11px; color: #725e4d; }
          .report-table { width: 100%; border-collapse: collapse; }
          .report-table th { text-align: left; padding: 6px 8px; background: #f0f7f4; font-size: 11px; font-weight: 600; color: #255644; }
          .report-table td { padding: 6px 8px; border-bottom: 1px solid #f2efe8; font-size: 12px; }
          .report-footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5ded0; text-align: center; font-size: 10px; color: #b39b7a; }
          .report-score-big { font-size: 48px; font-weight: 700; text-align: center; }
          @page { margin: 1cm; }
        }
      `}</style>

      {/* Header */}
      <div className="report-header">
        <p className="report-title">NeuralMinds</p>
        <p className="report-subtitle">Personal Wellness Report</p>
        <p className="report-meta">
          {profile.displayName || 'User'} • {now.toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Section 1: Mental Health Score */}
      <div className="report-section">
        <h3>Mental Health Score</h3>
        <p className="report-score-big" style={{ color: totalScore <= 33 ? '#cd5035' : totalScore <= 60 ? '#e4ad5e' : '#3d8768' }}>
          {totalScore > 0 ? totalScore : '—'} <span style={{ fontSize: '16px', color: '#b39b7a' }}>/100</span>
        </p>
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#725e4d' }}>{scoreLabel}</p>
      </div>

      {/* Section 2: Mood Summary */}
      <div className="report-section">
        <h3>Mood Summary — Last 7 Days</h3>
        {weekMoods.length > 0 ? (
          <>
            <table className="report-table">
              <thead><tr><th>Date</th><th>Mood</th><th>Feeling</th></tr></thead>
              <tbody>
                {weekMoods.map(m => (
                  <tr key={m.date}>
                    <td>{new Date(m.date + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                    <td>{moodEmoji(m.mood)} {m.mood}/5</td>
                    <td>{m.emotion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: '8px', fontSize: '12px' }}>
              <strong>Average:</strong> {avgMood.toFixed(1)}/5 &nbsp;•&nbsp; <strong>Trend:</strong> {trend}
            </p>
          </>
        ) : (
          <p style={{ color: '#b39b7a', fontSize: '12px' }}>No mood data recorded this week.</p>
        )}
      </div>

      {/* Section 3: Activity Summary */}
      <div className="report-section">
        <h3>Activity Summary</h3>
        <div className="report-grid">
          <div className="report-stat">
            <p className="report-stat-value">{profile.messageCount || 0}</p>
            <p className="report-stat-label">Messages with Mira</p>
          </div>
          <div className="report-stat">
            <p className="report-stat-value">{(profile.journalEntries || []).length}</p>
            <p className="report-stat-label">Journal entries</p>
          </div>
          <div className="report-stat">
            <p className="report-stat-value">{profile.streak || 0}</p>
            <p className="report-stat-label">Day streak</p>
          </div>
          <div className="report-stat">
            <p className="report-stat-value">{profile.moodHistory.length}</p>
            <p className="report-stat-label">Total mood logs</p>
          </div>
        </div>
      </div>

      {/* Section 4: PHQ-9 */}
      <div className="report-section">
        <h3>PHQ-9 Depression Screening</h3>
        {latestPhq >= 0 ? (
          <div className="report-grid">
            <div className="report-stat">
              <p className="report-stat-value">{latestPhq}/27</p>
              <p className="report-stat-label">Latest Score</p>
            </div>
            <div className="report-stat">
              <p className="report-stat-value" style={{ fontSize: '16px' }}>{phqLabel}</p>
              <p className="report-stat-label">Severity Level</p>
            </div>
          </div>
        ) : (
          <p style={{ color: '#b39b7a', fontSize: '12px' }}>PHQ-9 screening not yet completed.</p>
        )}
      </div>

      {/* Footer */}
      <div className="report-footer">
        <p>This report is for personal wellness tracking only and is not a medical diagnosis.</p>
        <p style={{ marginTop: '4px', fontWeight: 600 }}>Generated by NeuralMinds — Your Wellness Companion</p>
      </div>
    </div>
  );
}

// ── MENTAL HEALTH SCORE ──
function MentalHealthScore({ profile }: { profile: UserProfile }) {
  const [expanded, setExpanded] = useState(false);

  const score = useMemo(() => {
    const now = Date.now();
    const day = 86400000;
    const weekAgo = new Date(now - 7 * day).toISOString().split('T')[0];

    // 1. Mood average this week (30 pts max)
    const weekMoods = profile.moodHistory.filter(m => m.date >= weekAgo && typeof m.mood === 'number');
    const moodAvg = weekMoods.length > 0 ? weekMoods.reduce((s, m) => s + m.mood, 0) / weekMoods.length : 0;
    const moodPts = weekMoods.length > 0 ? Math.round((moodAvg / 5) * 30) : 0;

    // 2. Journal consistency this week (20 pts max)
    const weekJournals = (profile.journalEntries || []).filter(j => j.date >= weekAgo).length;
    const journalPts = Math.min(weekJournals * 5, 20); // 4 entries = full score

    // 3. Streak (20 pts max)
    const streakPts = Math.min((profile.streak || 0) * 3, 20); // 7 days = 21 → cap 20

    // 4. PHQ9 (20 pts max — lower PHQ9 = higher score)
    const latestPhq = profile.phq9Scores.length > 0 ? profile.phq9Scores[profile.phq9Scores.length - 1] : -1;
    const phqPts = latestPhq >= 0 ? Math.max(0, Math.round(20 - (latestPhq / 27) * 20)) : 0;

    // 5. Activity sessions estimate (10 pts max) — use mood entries as proxy for engagement
    const activityPts = Math.min(weekMoods.length * 2, 10);

    const total = moodPts + journalPts + streakPts + phqPts + activityPts;
    const hasData = weekMoods.length > 0 || (profile.journalEntries || []).length > 0 || (profile.streak || 0) > 0;

    return {
      total: Math.min(total, 100),
      hasData,
      breakdown: [
        { label: 'Mood this week', pts: moodPts, max: 30 },
        { label: 'Journal entries', pts: journalPts, max: 20 },
        { label: 'Active streak', pts: streakPts, max: 20 },
        { label: 'PHQ-9 wellness', pts: phqPts, max: 20 },
        { label: 'Daily engagement', pts: activityPts, max: 10 },
      ],
    };
  }, [profile]);

  const ringColor = score.total <= 33 ? '#cd5035' : score.total <= 60 ? '#e4ad5e' : '#3d8768';
  const miraComment = score.total <= 33
    ? "rough patch. i'm here though 💙"
    : score.total <= 60
      ? "you're managing. let's keep going 🌱"
      : score.total <= 80
        ? "doing well! proud of you 🌟"
        : "thriving honestly 🌈";

  const circumference = 2 * Math.PI * 52;
  const strokeDash = score.hasData ? (score.total / 100) * circumference : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-sand-200 p-5">
      <div className="flex items-center gap-6">
        {/* Ring */}
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#e5ded0" strokeWidth="6" />
            {score.hasData && (
              <motion.circle cx="60" cy="60" r="52" fill="none" stroke={ringColor} strokeWidth="6"
                strokeLinecap="round"
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{ strokeDasharray: `${strokeDash} ${circumference}` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-serif text-3xl text-forest-900" style={{ color: score.hasData ? ringColor : undefined }}>
              {score.hasData ? score.total : '—'}
            </p>
            {score.hasData && <p className="text-[9px] text-sand-500">/100</p>}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-sand-500 uppercase tracking-wider mb-1">Mental Health Score</p>
          {score.hasData ? (
            <p className="text-sm text-forest-800 leading-relaxed">{miraComment}</p>
          ) : (
            <p className="text-sm text-sand-500 leading-relaxed">check in daily to build your score</p>
          )}
        </div>
      </div>

      {/* Expandable breakdown */}
      {score.hasData && (
        <div className="mt-3 pt-3 border-t border-sand-100">
          <button onClick={() => setExpanded(!expanded)}
            className="text-xs text-sand-500 hover:text-forest-600 transition-colors w-full text-left">
            {expanded ? '▾ hide breakdown' : '▸ what affects my score?'}
          </button>

          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 space-y-1.5">
              {score.breakdown.map(b => (
                <div key={b.label} className="flex items-center gap-2">
                  <span className="text-xs text-sand-600 w-28 flex-shrink-0">{b.label}</span>
                  <div className="flex-1 bg-sand-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${(b.pts / b.max) * 100}%`, backgroundColor: ringColor }} />
                  </div>
                  <span className="text-[10px] text-sand-500 w-10 text-right">{b.pts}/{b.max}</span>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── DAILY MOOD CHECK-IN WIDGET ──
const MOOD_OPTIONS = [
  { value: 1, emoji: '😔', label: 'Struggling', color: '#cd5035' },
  { value: 2, emoji: '😕', label: 'Low', color: '#ed8f7a' },
  { value: 3, emoji: '😐', label: 'Okay', color: '#e4ad5e' },
  { value: 4, emoji: '🙂', label: 'Good', color: '#8dc2a8' },
  { value: 5, emoji: '😄', label: 'Great', color: '#3d8768' },
];

function DailyMoodCheckIn({ profile, setProfile }: { profile: UserProfile; setProfile: (p: UserProfile) => void }) {
  const today = new Date().toISOString().split('T')[0];
  const todayEntry = profile.moodHistory.find(m => m.date === today);
  const [selected, setSelected] = useState<number | null>(todayEntry?.mood ?? null);
  const [word, setWord] = useState(todayEntry?.emotion || '');
  const [done, setDone] = useState(!!todayEntry);

  const saveMood = (mood: number) => {
    setSelected(mood);
    // If word already entered, save immediately; otherwise wait for word
    if (word.trim()) {
      commitCheckin(mood, word.trim());
    }
  };

  const saveWord = () => {
    if (!word.trim() || !selected) return;
    commitCheckin(selected, word.trim());
  };

  const commitCheckin = (mood: number, emotion: string) => {
    // Remove existing today entry if any, then add new one
    const filtered = profile.moodHistory.filter(m => m.date !== today);
    const updated: UserProfile = {
      ...profile,
      moodHistory: [...filtered, { date: today, mood, emotion }],
    };
    setProfile(updated);
    setDone(true);
  };

  // Last 7 days data for mini chart
  const last7 = useMemo(() => {
    const days: { date: string; mood: number | null; label: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      const entry = profile.moodHistory.find(m => m.date === dateStr);
      days.push({
        date: dateStr,
        mood: entry?.mood ?? null,
        label: d.toLocaleDateString('en', { weekday: 'short' }),
      });
    }
    return days;
  }, [profile.moodHistory]);

  const dotColor = (mood: number | null) => {
    if (mood === null) return 'bg-sand-200';
    if (mood === 1) return 'bg-clay-500';
    if (mood === 2) return 'bg-clay-300';
    if (mood === 3) return 'bg-warm-400';
    if (mood === 4) return 'bg-forest-300';
    return 'bg-forest-500';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
      className="bg-white rounded-2xl border border-sand-200 p-5">
      
      {done ? (
        /* Completed state */
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-forest-50 flex items-center justify-center">
              <Check className="w-5 h-5 text-forest-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-forest-900">today's check-in complete</p>
              <p className="text-xs text-sand-500">
                {MOOD_OPTIONS.find(m => m.value === selected)?.emoji} feeling {word || MOOD_OPTIONS.find(m => m.value === selected)?.label.toLowerCase()}
              </p>
            </div>
          </div>
          <button onClick={() => { setDone(false); }}
            className="text-xs text-sand-400 hover:text-sand-600 transition-colors">edit</button>
        </div>
      ) : (
        /* Check-in form */
        <div className="space-y-4">
          <p className="text-sm font-medium text-forest-900">how are you feeling today?</p>
          
          {/* Emoji buttons */}
          <div className="flex justify-between gap-1">
            {MOOD_OPTIONS.map(m => (
              <button key={m.value} onClick={() => saveMood(m.value)}
                className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all relative">
                <motion.span
                  animate={selected === m.value ? { scale: [1, 1.3, 1.15], } : { scale: 1 }}
                  transition={selected === m.value ? { duration: 0.4 } : {}}
                  className={`text-2xl block ${selected === m.value ? '' : 'opacity-60 hover:opacity-100'}`}>
                  {m.emoji}
                </motion.span>
                <span className={`text-[10px] ${selected === m.value ? 'text-forest-700 font-medium' : 'text-sand-500'}`}>
                  {m.label}
                </span>
                {selected === m.value && (
                  <motion.div layoutId="moodDot" className="absolute -bottom-1 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: m.color }} />
                )}
              </button>
            ))}
          </div>

          {/* Word input — shows after mood selection */}
          {selected && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={word}
                  onChange={e => setWord(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveWord(); }}
                  placeholder="one word that describes today..."
                  maxLength={30}
                  className="flex-1 px-3 py-2.5 bg-sand-50 border border-sand-200 rounded-xl text-sm text-forest-900 placeholder:text-sand-400 focus:border-forest-400 transition-all"
                />
                <button onClick={saveWord} disabled={!word.trim()}
                  className="px-4 py-2.5 bg-forest-600 hover:bg-forest-700 disabled:bg-sand-300 text-white rounded-xl text-sm font-medium transition-colors">
                  save
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Week overview — always visible */}
      <div className="mt-4 pt-3 border-t border-sand-100">
        <p className="text-[11px] text-sand-500 mb-2">your week</p>
        <div className="flex justify-between items-end gap-1">
          {last7.map(day => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className={`w-3.5 h-3.5 rounded-full ${dotColor(day.mood)}`}
                title={day.mood ? `${day.label}: ${MOOD_OPTIONS.find(m => m.value === day.mood)?.label}` : `${day.label}: no data`}
              />
              <span className={`text-[9px] ${day.date === today ? 'text-forest-700 font-semibold' : 'text-sand-400'}`}>
                {day.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
