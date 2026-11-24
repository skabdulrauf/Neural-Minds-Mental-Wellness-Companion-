import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { PHQ9_QUESTIONS, interpretPHQ9 } from '../utils/crisis';

interface PHQ9ModalProps {
  onClose: () => void;
  onComplete: (score: number) => void;
}

const OPTIONS = [
  { value: 0, label: 'Not at all', desc: 'Rarely or never' },
  { value: 1, label: 'Several days', desc: 'A few days a week' },
  { value: 2, label: 'More than half the days', desc: 'Most days' },
  { value: 3, label: 'Nearly every day', desc: 'Almost always' },
];

export default function PHQ9Modal({ onClose, onComplete }: PHQ9ModalProps) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>(new Array(9).fill(-1));
  const [showResult, setShowResult] = useState(false);

  const totalScore = answers.reduce((sum, a) => sum + Math.max(a, 0), 0);
  const result = interpretPHQ9(totalScore);

  const handleAnswer = (value: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQ] = value;
    setAnswers(newAnswers);

    if (currentQ < 8) {
      setTimeout(() => setCurrentQ(currentQ + 1), 300);
    } else {
      setTimeout(() => setShowResult(true), 500);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-forest-950/40 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="max-w-lg w-full bg-warm-50 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-sand-200 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl text-forest-900">
              {showResult ? 'Your Results' : 'A gentle check-in'}
            </h3>
            <p className="text-sm text-sand-500 mt-0.5">
              {showResult ? 'Here\'s what your responses suggest' : `Question ${currentQ + 1} of 9`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-sand-100 hover:bg-sand-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-sand-600" />
          </button>
        </div>

        {!showResult && (
          <div className="p-6">
            {/* Progress bar */}
            <div className="w-full bg-sand-100 rounded-full h-1.5 mb-6">
              <motion.div
                className="bg-forest-500 h-1.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentQ + 1) / 9) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentQ}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-forest-900 text-lg mb-6 leading-relaxed">
                  {PHQ9_QUESTIONS[currentQ].text}
                </p>

                <div className="space-y-2.5">
                  {OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleAnswer(option.value)}
                      className={`w-full text-left px-5 py-3.5 rounded-2xl border transition-all duration-200 group ${
                        answers[currentQ] === option.value
                          ? 'bg-forest-50 border-forest-300 shadow-sm'
                          : 'bg-white border-sand-200 hover:border-forest-200 hover:bg-forest-50/50'
                      }`}
                    >
                      <p className={`font-medium text-sm ${
                        answers[currentQ] === option.value ? 'text-forest-700' : 'text-forest-900'
                      }`}>
                        {option.label}
                      </p>
                      <p className="text-xs text-sand-500 mt-0.5">{option.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            {currentQ > 0 && (
              <button
                onClick={() => setCurrentQ(currentQ - 1)}
                className="mt-4 flex items-center gap-1.5 text-sm text-sand-500 hover:text-sand-700 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous question
              </button>
            )}
          </div>
        )}

        {showResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 space-y-5"
          >
            <div className="bg-white rounded-2xl p-5 border border-sand-200">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  totalScore <= 4 ? 'bg-forest-100' : totalScore <= 9 ? 'bg-warm-100' : totalScore <= 14 ? 'bg-clay-100' : 'bg-clay-200'
                }`}>
                  <span className="text-lg">
                    {totalScore <= 4 ? '🌿' : totalScore <= 9 ? '🍂' : totalScore <= 14 ? '🌧️' : '💙'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-forest-900">Score: {totalScore}/27</p>
                  <p className="text-sm text-sand-600">{result.severity}</p>
                </div>
              </div>
              <p className="text-sm text-forest-800 leading-relaxed">{result.message}</p>
            </div>

            <p className="text-xs text-sand-500 text-center leading-relaxed">
              This screening is not a diagnosis. It's a gentle way to check in with yourself.
              For a professional evaluation, please consult a mental health provider.
            </p>

            <button
              onClick={() => onComplete(totalScore)}
              className="w-full bg-forest-600 hover:bg-forest-700 text-white py-3.5 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all duration-300"
            >
              <CheckCircle2 className="w-4 h-4" />
              Done
            </button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
