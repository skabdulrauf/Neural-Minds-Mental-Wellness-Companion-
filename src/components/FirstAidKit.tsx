import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Check, ChevronRight, ArrowLeft, ExternalLink, Phone } from 'lucide-react';

interface KitData {
  song: string; songLink: string;
  person: string; personPhone: string;
  place: string;
  laugh: string;
  reason: string;
  letterToSelf: string;
  whatWorks: string[];
  customWorks: string[];
  avoid: string[];
}

const DEFAULT_KIT: KitData = {
  song: '', songLink: '', person: '', personPhone: '',
  place: '', laugh: '', reason: '', letterToSelf: '',
  whatWorks: [], customWorks: [], avoid: [],
};

const WHAT_WORKS_OPTIONS = [
  'Going for a walk', 'Calling someone', 'Crying it out',
  'Watching comfort show', 'Eating something good', 'Breathing exercises',
  'Journaling', 'Prayer/spirituality', 'Music', 'Sleep',
];

function loadKit(): KitData {
  try { const r = localStorage.getItem('nm_firstaid_kit'); return r ? { ...DEFAULT_KIT, ...JSON.parse(r) } : DEFAULT_KIT; } catch { return DEFAULT_KIT; }
}
function saveKit(kit: KitData) { localStorage.setItem('nm_firstaid_kit', JSON.stringify(kit)); }

export function getKitCompletion(): number {
  const kit = loadKit();
  let filled = 0;
  let total = 8;
  if (kit.song) filled++;
  if (kit.person) filled++;
  if (kit.place) filled++;
  if (kit.laugh) filled++;
  if (kit.reason) filled++;
  if (kit.letterToSelf) filled++;
  if (kit.whatWorks.length > 0 || kit.customWorks.length > 0) filled++;
  if (kit.avoid.length > 0) filled++;
  return Math.round((filled / total) * 100);
}

export default function FirstAidKit() {
  const [kit, setKit] = useState<KitData>(loadKit);
  const [mode, setMode] = useState<'menu' | 'build' | 'open'>('menu');
  const [openStep, setOpenStep] = useState(0);
  const [newCustom, setNewCustom] = useState('');
  const [newAvoid, setNewAvoid] = useState('');

  const update = (partial: Partial<KitData>) => {
    const updated = { ...kit, ...partial };
    setKit(updated);
    saveKit(updated);
  };

  const toggleWork = (item: string) => {
    const list = kit.whatWorks.includes(item) ? kit.whatWorks.filter(w => w !== item) : [...kit.whatWorks, item];
    update({ whatWorks: list });
  };

  const addCustomWork = () => {
    if (!newCustom.trim()) return;
    update({ customWorks: [...kit.customWorks, newCustom.trim()] });
    setNewCustom('');
  };

  const addAvoid = () => {
    if (!newAvoid.trim()) return;
    update({ avoid: [...kit.avoid, newAvoid.trim()] });
    setNewAvoid('');
  };

  const completion = getKitCompletion();
  const allWorks = [...kit.whatWorks, ...kit.customWorks];

  // ─── MENU ───
  if (mode === 'menu') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
            <span className="text-4xl mb-3 block">🧰</span>
            <h2 className="font-serif text-2xl text-forest-900 mb-1">My First Aid Kit</h2>
            <p className="text-sand-500 text-sm">built by you on good days, for your hard days</p>
          </motion.div>

          {/* Completion */}
          <div className="bg-white rounded-2xl border border-sand-200 p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-forest-900">kit readiness</p>
              <span className="text-xs text-sand-500">{completion}%</span>
            </div>
            <div className="w-full bg-sand-100 rounded-full h-2">
              <motion.div className="bg-forest-500 h-2 rounded-full" initial={{ width: 0 }}
                animate={{ width: `${completion}%` }} transition={{ duration: 0.8 }} />
            </div>
            {completion < 50 && (
              <p className="text-xs text-warm-600 mt-2">fill this on a good day so it's ready when you need it 💛</p>
            )}
          </div>

          <div className="space-y-3">
            <motion.button initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => setMode('build')}
              className="w-full bg-white rounded-2xl border border-sand-200 p-5 text-left hover:border-forest-200 hover:shadow-sm transition-all active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-forest-50 flex items-center justify-center text-2xl">🛠️</div>
                <div>
                  <p className="font-medium text-forest-900">Build My Kit</p>
                  <p className="text-xs text-sand-500">fill it in on a good day</p>
                </div>
              </div>
            </motion.button>

            <motion.button initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              onClick={() => { setMode('open'); setOpenStep(0); }}
              className="w-full bg-gradient-to-r from-clay-50 to-warm-50 rounded-2xl border border-clay-200 p-5 text-left hover:shadow-sm transition-all active:scale-[0.98]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-clay-100 flex items-center justify-center text-2xl">🆘</div>
                <div>
                  <p className="font-medium text-forest-900">Open My Kit</p>
                  <p className="text-xs text-clay-600">for when you need it now</p>
                </div>
              </div>
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // ─── BUILD MODE ───
  if (mode === 'build') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
          <button onClick={() => setMode('menu')} className="text-sm text-sand-500 hover:text-forest-600 mb-4 flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> back
          </button>
          <h3 className="font-serif text-xl text-forest-900 mb-1">Build Your Kit</h3>
          <p className="text-sand-500 text-sm mb-5">fill these in honestly — future you will thank you</p>

          {/* Section A */}
          <div className="space-y-4 mb-6">
            <p className="text-[10px] font-bold text-forest-700 uppercase tracking-wider">Things That Help Me</p>

            <div>
              <label className="text-xs text-sand-600 mb-1 block">song that always makes me feel better</label>
              <input value={kit.song} onChange={e => update({ song: e.target.value })} placeholder="song name..."
                className="w-full px-3 py-2.5 bg-white border border-sand-200 rounded-xl text-sm text-forest-900 placeholder:text-sand-400 focus:border-forest-400 transition-all mb-1" />
              <input value={kit.songLink} onChange={e => update({ songLink: e.target.value })} placeholder="youtube/spotify link (optional)"
                className="w-full px-3 py-2 bg-sand-50 border border-sand-200 rounded-lg text-xs text-forest-900 placeholder:text-sand-400 focus:border-forest-400" />
            </div>

            <div>
              <label className="text-xs text-sand-600 mb-1 block">person i can always call</label>
              <div className="flex gap-2">
                <input value={kit.person} onChange={e => update({ person: e.target.value })} placeholder="name"
                  className="flex-1 px-3 py-2.5 bg-white border border-sand-200 rounded-xl text-sm placeholder:text-sand-400 focus:border-forest-400" />
                <input value={kit.personPhone} onChange={e => update({ personPhone: e.target.value })} placeholder="phone" type="tel"
                  className="w-32 px-3 py-2.5 bg-white border border-sand-200 rounded-xl text-sm placeholder:text-sand-400 focus:border-forest-400" />
              </div>
            </div>

            <div>
              <label className="text-xs text-sand-600 mb-1 block">place that calms me</label>
              <input value={kit.place} onChange={e => update({ place: e.target.value })} placeholder="my bedroom, the park near home..."
                className="w-full px-3 py-2.5 bg-white border border-sand-200 rounded-xl text-sm placeholder:text-sand-400 focus:border-forest-400" />
            </div>

            <div>
              <label className="text-xs text-sand-600 mb-1 block">thing that always makes me laugh</label>
              <input value={kit.laugh} onChange={e => update({ laugh: e.target.value })} placeholder="a video, a memory, a person..."
                className="w-full px-3 py-2.5 bg-white border border-sand-200 rounded-xl text-sm placeholder:text-sand-400 focus:border-forest-400" />
            </div>

            <div>
              <label className="text-xs text-sand-600 mb-1 block">my reason to keep going</label>
              <input value={kit.reason} onChange={e => update({ reason: e.target.value })} placeholder="this is just for you..."
                className="w-full px-3 py-2.5 bg-white border border-sand-200 rounded-xl text-sm placeholder:text-sand-400 focus:border-forest-400" />
            </div>

            <div>
              <label className="text-xs text-sand-600 mb-1 block">what i want to remember on bad days</label>
              <textarea value={kit.letterToSelf} onChange={e => update({ letterToSelf: e.target.value })}
                placeholder="write a message to your struggling self..."
                rows={4}
                className="w-full px-3 py-2.5 bg-white border border-sand-200 rounded-xl text-sm placeholder:text-sand-400 resize-none focus:border-forest-400" />
            </div>
          </div>

          {/* Section B */}
          <div className="mb-6">
            <p className="text-[10px] font-bold text-forest-700 uppercase tracking-wider mb-3">What Works For Me</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {WHAT_WORKS_OPTIONS.map(item => (
                <button key={item} onClick={() => toggleWork(item)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    kit.whatWorks.includes(item) ? 'bg-forest-600 text-white' : 'bg-sand-100 text-sand-600 hover:bg-sand-200'
                  }`}>
                  {kit.whatWorks.includes(item) ? '✓ ' : ''}{item}
                </button>
              ))}
              {kit.customWorks.map(item => (
                <span key={item} className="px-3 py-1.5 rounded-full text-xs font-medium bg-forest-600 text-white">✓ {item}</span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newCustom} onChange={e => setNewCustom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addCustomWork(); }}
                placeholder="add your own..." className="flex-1 px-3 py-2 bg-sand-50 border border-sand-200 rounded-lg text-xs placeholder:text-sand-400 focus:border-forest-400" />
              <button onClick={addCustomWork} disabled={!newCustom.trim()}
                className="px-3 py-2 bg-forest-600 hover:bg-forest-700 disabled:bg-sand-300 text-white rounded-lg"><Plus className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          {/* Section C */}
          <div className="mb-6">
            <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-3">Things To Avoid When I'm Low</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {kit.avoid.map(item => (
                <span key={item} className="px-3 py-1.5 rounded-full text-xs font-medium bg-clay-100 text-clay-700">⚠️ {item}</span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newAvoid} onChange={e => setNewAvoid(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addAvoid(); }}
                placeholder="social media, certain people, alcohol..." className="flex-1 px-3 py-2 bg-sand-50 border border-sand-200 rounded-lg text-xs placeholder:text-sand-400 focus:border-clay-400" />
              <button onClick={addAvoid} disabled={!newAvoid.trim()}
                className="px-3 py-2 bg-clay-500 hover:bg-clay-600 disabled:bg-sand-300 text-white rounded-lg"><Plus className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          <button onClick={() => setMode('menu')}
            className="w-full bg-forest-600 hover:bg-forest-700 text-white py-3 rounded-2xl font-medium transition-colors flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Kit saved
          </button>
        </div>
      </div>
    );
  }

  // ─── OPEN MODE (bad day walkthrough) ───
  const openSections = [
    // Step 0: Mira greets
    () => (
      <motion.div key="s0" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="w-16 h-16 bg-forest-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-breathe">
          <span className="text-2xl">🌿</span>
        </div>
        <p className="text-forest-900 leading-relaxed mb-2">
          hey. you opened your kit. that took strength.
        </p>
        <p className="text-sand-500 text-sm mb-6">
          you built this for yourself. it was you on a good day helping you on a hard day.
        </p>
        <button onClick={() => setOpenStep(1)}
          className="bg-forest-600 hover:bg-forest-700 text-white px-6 py-3 rounded-2xl font-medium transition-colors flex items-center gap-2 mx-auto">
          let's go through it <ChevronRight className="w-4 h-4" />
        </button>
      </motion.div>
    ),
    // Step 1: Reason + letter
    () => (
      <motion.div key="s1" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        {kit.reason && (
          <div className="bg-warm-50 rounded-2xl border border-warm-200 p-5">
            <p className="text-xs text-warm-600 font-medium mb-2">YOUR REASON</p>
            <p className="font-serif text-lg text-forest-900 italic">{kit.reason}</p>
          </div>
        )}
        {kit.letterToSelf && (
          <div className="bg-white rounded-2xl border border-sand-200 p-5">
            <p className="text-xs text-sand-500 font-medium mb-2">A MESSAGE FROM YOU ON A GOOD DAY</p>
            <p className="text-forest-900 text-sm leading-relaxed whitespace-pre-wrap">{kit.letterToSelf}</p>
          </div>
        )}
        <button onClick={() => setOpenStep(2)}
          className="w-full bg-forest-600 hover:bg-forest-700 text-white py-3 rounded-2xl font-medium flex items-center justify-center gap-2">
          next <ChevronRight className="w-4 h-4" />
        </button>
      </motion.div>
    ),
    // Step 2: Song + laugh + place
    () => (
      <motion.div key="s2" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <p className="text-sm text-sand-500 mb-2">things that help you:</p>
        {kit.song && (
          <div className="bg-white rounded-xl border border-sand-200 p-4 flex items-center justify-between">
            <div><p className="text-xs text-sand-500">🎵 your song</p><p className="text-sm text-forest-900 font-medium">{kit.song}</p></div>
            {kit.songLink && <a href={kit.songLink} target="_blank" rel="noopener noreferrer" className="text-forest-600"><ExternalLink className="w-4 h-4" /></a>}
          </div>
        )}
        {kit.place && (
          <div className="bg-white rounded-xl border border-sand-200 p-4">
            <p className="text-xs text-sand-500">🏡 your calm place</p><p className="text-sm text-forest-900">{kit.place}</p>
          </div>
        )}
        {kit.laugh && (
          <div className="bg-white rounded-xl border border-sand-200 p-4">
            <p className="text-xs text-sand-500">😂 makes you laugh</p><p className="text-sm text-forest-900">{kit.laugh}</p>
          </div>
        )}
        {kit.person && (
          <div className="bg-forest-50 rounded-xl border border-forest-200 p-4 flex items-center justify-between">
            <div><p className="text-xs text-forest-600">📞 your person</p><p className="text-sm text-forest-900 font-medium">{kit.person}</p></div>
            {kit.personPhone && <a href={`tel:${kit.personPhone}`} className="bg-forest-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"><Phone className="w-3 h-3" /> Call</a>}
          </div>
        )}
        <button onClick={() => setOpenStep(3)}
          className="w-full bg-forest-600 hover:bg-forest-700 text-white py-3 rounded-2xl font-medium flex items-center justify-center gap-2">
          next <ChevronRight className="w-4 h-4" />
        </button>
      </motion.div>
    ),
    // Step 3: What works + what to avoid
    () => (
      <motion.div key="s3" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        {allWorks.length > 0 && (
          <div>
            <p className="text-xs text-forest-700 font-medium mb-2">WHAT WORKS FOR YOU</p>
            <div className="flex flex-wrap gap-2">
              {allWorks.map(w => (
                <span key={w} className="px-3 py-1.5 rounded-full text-xs bg-forest-100 text-forest-700">✓ {w}</span>
              ))}
            </div>
          </div>
        )}
        {kit.avoid.length > 0 && (
          <div>
            <p className="text-xs text-clay-600 font-medium mb-2">AVOID RIGHT NOW</p>
            <div className="flex flex-wrap gap-2">
              {kit.avoid.map(a => (
                <span key={a} className="px-3 py-1.5 rounded-full text-xs bg-clay-100 text-clay-700">⚠️ {a}</span>
              ))}
            </div>
          </div>
        )}
        <div className="bg-forest-50 rounded-2xl border border-forest-200 p-5 text-center">
          <p className="text-forest-800 text-sm leading-relaxed">
            you've got this. one moment at a time. 💚
          </p>
        </div>
        <button onClick={() => setMode('menu')}
          className="w-full bg-forest-600 hover:bg-forest-700 text-white py-3 rounded-2xl font-medium transition-colors">
          i feel a little better
        </button>
      </motion.div>
    ),
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-5 pb-24 md:pb-8 max-w-lg mx-auto">
        <button onClick={() => setMode('menu')} className="text-sm text-sand-500 hover:text-forest-600 mb-4 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> back
        </button>
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i <= openStep ? 'bg-forest-500' : 'bg-sand-200'}`} />
          ))}
        </div>
        {openSections[openStep]?.()}
      </div>
    </div>
  );
}
