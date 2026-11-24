import { motion } from 'framer-motion';
import { UserProfile } from '../utils/types';
import { BADGES, loadUnlockedBadges } from '../utils/badges';

interface BadgesProps {
  profile: UserProfile;
}

export default function Badges(_props: BadgesProps) {
  const unlocked = loadUnlockedBadges();
  const unlockedCount = unlocked.size;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <span className="text-4xl block mb-3">🏆</span>
          <h2 className="font-serif text-2xl text-forest-900 mb-1">Achievements</h2>
          <p className="text-sand-500 text-sm">{unlockedCount} of {BADGES.length} unlocked</p>
          {/* Progress bar */}
          <div className="w-full max-w-xs mx-auto bg-sand-100 rounded-full h-2 mt-3">
            <motion.div className="bg-warm-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(unlockedCount / BADGES.length) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {BADGES.map((badge, i) => {
            const isUnlocked = unlocked.has(badge.id);
            return (
              <motion.div key={badge.id}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  isUnlocked
                    ? 'bg-gradient-to-br from-warm-50 to-forest-50 border-warm-200 shadow-sm'
                    : 'bg-sand-50/50 border-sand-200 opacity-50'
                }`}
              >
                <span className={`text-3xl block mb-2 ${isUnlocked ? '' : 'grayscale'}`}>
                  {isUnlocked ? badge.emoji : '🔒'}
                </span>
                <p className={`text-sm font-medium ${isUnlocked ? 'text-forest-900' : 'text-sand-500'}`}>
                  {badge.title}
                </p>
                <p className="text-[11px] text-sand-500 mt-0.5 leading-tight">{badge.description}</p>
                {isUnlocked && (
                  <span className="inline-block mt-2 text-[9px] font-bold text-forest-600 bg-forest-50 px-2 py-0.5 rounded-full">
                    ✓ UNLOCKED
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
