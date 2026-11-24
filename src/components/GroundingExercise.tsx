import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, RotateCcw, Mic, MicOff } from 'lucide-react';

const STEPS = [
  { count: 5, sense: 'SEE', prompt: 'Name 5 things you can see right now', emoji: '👁️', hint: 'look around slowly — a color, a texture, a shape...', placeholder: 'I see...' },
  { count: 4, sense: 'TOUCH', prompt: 'Name 4 things you can physically feel', emoji: '✋', hint: 'your clothing, the chair, your own hand, something near you', placeholder: 'I feel...' },
  { count: 3, sense: 'HEAR', prompt: 'Name 3 things you can hear', emoji: '👂', hint: 'close your eyes for a moment — what sounds are there?', placeholder: 'I hear...' },
  { count: 2, sense: 'SMELL', prompt: 'Name 2 things you can smell', emoji: '🌸', hint: 'the air, your clothes, something nearby', placeholder: 'I smell...' },
  { count: 1, sense: 'TASTE', prompt: 'Name 1 thing you can taste', emoji: '👅', hint: 'even just the inside of your mouth counts', placeholder: 'I taste...' },
];

export default function GroundingExercise() {
  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState<string[][]>([[], [], [], [], []]);
  const [currentInput, setCurrentInput] = useState('');
  const [completed, setCompleted] = useState(false);
  const [startTime] = useState(Date.now());
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const current = STEPS[step];
  const currentItems = inputs[step];
  const itemsDone = currentItems.length;
  const itemsNeeded = current.count;
  const stepComplete = itemsDone >= itemsNeeded;

  const addItem = () => {
    const text = currentInput.trim();
    if (!text || stepComplete) return;
    const updated = [...inputs];
    updated[step] = [...updated[step], text];
    setInputs(updated);
    setCurrentInput('');

    // Auto-advance if step complete
    if (updated[step].length >= itemsNeeded) {
      if (step < 4) {
        setTimeout(() => setStep(step + 1), 800);
      } else {
        setTimeout(() => setCompleted(true), 800);
      }
    }
  };

  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    const r = new SR();
    r.lang = 'en-US';
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e: any) => {
      const text = e.results[0]?.[0]?.transcript;
      if (text) { setCurrentInput(text); }
    };
    r.onend = () => { recognitionRef.current = null; setIsListening(false); };
    r.onerror = () => { recognitionRef.current = null; setIsListening(false); };
    try { r.start(); recognitionRef.current = r; setIsListening(true); } catch { setIsListening(false); }
  };

  const hasSpeech = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  void startTime; // used in completion screen

  const reset = () => {
    setStep(0);
    setInputs([[], [], [], [], []]);
    setCurrentInput('');
    setCompleted(false);
  };

  // ─── COMPLETION ───
  if (completed) {
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    const tMins = Math.floor(totalTime / 60);
    const tSecs = totalTime % 60;

    return (
      <div className="h-full overflow-y-auto">
        <div className="flex flex-col items-center p-5 pb-24 md:pb-8 max-w-md mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center w-full pt-4">
            <div className="w-20 h-20 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-5 animate-breathe">
              <Check className="w-10 h-10 text-forest-600" />
            </div>
            <h2 className="font-serif text-2xl text-forest-900 mb-2">you're grounded.</h2>
            <p className="text-sand-600 text-sm mb-1">you spent {tMins > 0 ? `${tMins}m ` : ''}{tSecs}s grounding yourself.</p>
            <p className="text-forest-600 text-sm font-medium mb-5">that was real work. 💚</p>

            {/* Summary */}
            <div className="bg-white rounded-2xl border border-sand-200 p-4 mb-5 text-left space-y-2.5">
              {STEPS.map((s, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="text-base flex-shrink-0">{s.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-[11px] text-sand-500 font-medium">{s.sense} — {s.count}</p>
                    <p className="text-sm text-forest-800">{inputs[i].join(', ') || '(skipped)'}</p>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={reset}
              className="flex items-center gap-2 mx-auto text-forest-600 hover:text-forest-700 font-medium transition-colors">
              <RotateCcw className="w-4 h-4" /> try again
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── ACTIVE STEP ───
  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col items-center p-5 pb-24 md:pb-8 max-w-md mx-auto">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-4 pt-2">
          <h2 className="font-serif text-2xl text-forest-900 mb-1">5-4-3-2-1 Grounding</h2>
          <p className="text-sand-500 text-sm">one sense at a time</p>
        </motion.div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-6">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-400 ${
                i < step ? 'bg-forest-500' :
                i === step ? 'bg-forest-100 ring-2 ring-forest-300' :
                'bg-sand-100'
              }`}>
                {i < step ? <Check className="w-4 h-4 text-white" /> : <span className="text-xs">{s.emoji}</span>}
              </div>
              {i < 4 && <div className={`w-4 h-0.5 rounded ${i < step ? 'bg-forest-400' : 'bg-sand-200'} transition-colors duration-500`} />}
            </div>
          ))}
        </div>

        {/* Current step card */}
        <AnimatePresence mode="wait">
          <motion.div key={step}
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="w-full">
            <div className="bg-white rounded-2xl border border-sand-200 p-5 shadow-sm">
              <div className="w-12 h-12 bg-forest-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">{current.emoji}</span>
              </div>
              <p className="font-serif text-xl text-center text-forest-900 mb-1">{current.prompt}</p>
              <p className="text-center text-sand-500 text-xs mb-4">{current.hint}</p>

              {/* Items entered */}
              <div className="space-y-1.5 mb-3">
                {currentItems.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 bg-forest-50 rounded-lg px-3 py-2">
                    <Check className="w-4 h-4 text-forest-500 flex-shrink-0" />
                    <span className="text-sm text-forest-800">{item}</span>
                  </motion.div>
                ))}
              </div>

              {/* Input for next item */}
              {!stepComplete && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentInput}
                    onChange={e => setCurrentInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addItem(); }}
                    placeholder={`${current.placeholder} (${itemsDone + 1}/${itemsNeeded})`}
                    autoFocus
                    className="flex-1 px-3 py-2.5 bg-sand-50 border border-sand-200 rounded-xl text-sm text-forest-900 placeholder:text-sand-400 focus:border-forest-400 transition-all"
                  />
                  {hasSpeech && (
                    <button onClick={toggleVoice}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                        isListening ? 'bg-clay-500 text-white animate-pulse' : 'bg-sand-100 text-sand-500 hover:bg-sand-200'
                      }`}>
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  )}
                  <button onClick={addItem} disabled={!currentInput.trim()}
                    className="w-10 h-10 rounded-xl bg-forest-600 hover:bg-forest-700 disabled:bg-sand-300 text-white flex items-center justify-center flex-shrink-0 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Step complete message */}
              {stepComplete && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-center text-sm text-forest-600 font-medium py-2">
                  {step < 4 ? 'good. moving to the next sense...' : "you're here. you're real. you're grounded. ✨"}
                </motion.p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <p className="text-xs text-sand-400 mt-4">step {step + 1} of 5</p>
      </div>
    </div>
  );
}
