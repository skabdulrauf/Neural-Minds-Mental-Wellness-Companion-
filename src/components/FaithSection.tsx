import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, RefreshCw, ExternalLink, BookOpen, Star, Music, Calendar, MessageCircle, History, Heart, Scroll, Sun, Brain, Save, Sparkles, Check } from 'lucide-react';
import { UserProfile } from '../utils/types';

type Religion = 'islam' | 'hinduism' | 'christianity' | 'judaism' | 'buddhism' | 'sikhism' | 'explore' | null;

interface FaithTopic {
  id: string;
  icon: React.ReactNode;
  title: string;
  prompt: string;
  links?: { label: string; url: string }[];
  comfortTopic?: boolean; // auto-suggested when user is distressed
}

interface FaithSectionProps {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
}

const RELIGIONS: { id: Religion; emoji: string; name: string; color: string }[] = [
  { id: 'islam', emoji: '☪️', name: 'Islam', color: 'from-emerald-50 to-green-100' },
  { id: 'hinduism', emoji: '🕉️', name: 'Hinduism', color: 'from-orange-50 to-amber-100' },
  { id: 'christianity', emoji: '✝️', name: 'Christianity', color: 'from-blue-50 to-indigo-100' },
  { id: 'judaism', emoji: '✡️', name: 'Judaism', color: 'from-sky-50 to-blue-100' },
  { id: 'buddhism', emoji: '☸️', name: 'Buddhism', color: 'from-yellow-50 to-amber-100' },
  { id: 'sikhism', emoji: '🪯', name: 'Sikhism', color: 'from-orange-50 to-yellow-100' },
  { id: 'explore', emoji: '🔵', name: 'Explore All', color: 'from-violet-50 to-purple-100' },
];

// Reflection of the Day prompts per religion
const REFLECTION_PROMPTS: Record<string, string> = {
  islam: 'Share one short, uplifting Quranic verse or hadith. Give the Arabic transliteration and English meaning. 2-3 sentences only. End with a brief reflection.',
  hinduism: 'Share one short, uplifting verse from the Bhagavad Gita or Upanishads. Give the Sanskrit transliteration and English meaning. 2-3 sentences only.',
  christianity: 'Share one short, uplifting Bible verse. Give the reference and text. 2-3 sentences only. End with a reflection.',
  judaism: 'Share one short, uplifting verse from the Torah or Psalms. Give the reference, Hebrew transliteration, and meaning. 2-3 sentences only.',
  buddhism: 'Share one short, uplifting teaching from the Dhammapada or a Buddhist sutra. 2-3 sentences only. End with a reflection.',
  sikhism: 'Share one short, uplifting verse from the Guru Granth Sahib Ji. Give the Gurmukhi transliteration and English meaning. 2-3 sentences only.',
  explore: 'Share one short, uplifting spiritual teaching that resonates across all faiths — about compassion, inner peace, or human kindness. 2-3 sentences only.',
};

// Comfort topics auto-suggested when mood is low
const COMFORT_TOPICS: Record<string, FaithTopic> = {
  islam: { id: 'comfort-islam', icon: <Heart className="w-5 h-5" />, title: 'Surah Ad-Duha — Light After Darkness', comfortTopic: true, prompt: 'Share and explain Surah Ad-Duha from the Quran. Explain its context — it was revealed to Prophet Muhammad ﷺ during a difficult time when revelation had paused and he felt abandoned. Explain each verse simply. Show how this Surah is a message of comfort: that Allah has not forgotten us, that after hardship comes ease. Make it deeply comforting. 3-4 paragraphs.' },
  hinduism: { id: 'comfort-hinduism', icon: <Heart className="w-5 h-5" />, title: 'Bhagavad Gita Chapter 2 — The Soul Never Perishes', comfortTopic: true, prompt: 'Share and explain the key verses from Bhagavad Gita Chapter 2, especially verses 2.11-2.14 and 2.22-2.23 where Krishna comforts Arjuna about impermanence, the eternal soul, and why grief is natural but temporary. Make it deeply comforting for someone going through pain. 3-4 paragraphs.' },
  christianity: { id: 'comfort-christianity', icon: <Heart className="w-5 h-5" />, title: 'Psalm 23 — The Lord Is My Shepherd', comfortTopic: true, prompt: 'Share the full text of Psalm 23 and explain each verse in simple, comforting language. Show how this psalm has been a source of comfort for millions. Explain "Even though I walk through the valley of the shadow of death, I will fear no evil." Make it deeply comforting. 3-4 paragraphs.' },
  judaism: { id: 'comfort-judaism', icon: <Heart className="w-5 h-5" />, title: 'Psalm 121 — My Help Comes From The Lord', comfortTopic: true, prompt: 'Share and explain Psalm 121 (Shir LaMaalot). Show how it has been a pillar of comfort in Jewish tradition. Explain each verse simply. Make it deeply comforting for someone in distress. 3-4 paragraphs.' },
  buddhism: { id: 'comfort-buddhism', icon: <Heart className="w-5 h-5" />, title: 'Metta Sutta — Loving-Kindness', comfortTopic: true, prompt: 'Share the essence of the Metta Sutta (Loving-Kindness discourse). Guide someone through sending loving-kindness to themselves first, then to others. Explain how self-compassion is central to Buddhist teaching. Make it warm and comforting. 3-4 paragraphs.' },
  sikhism: { id: 'comfort-sikhism', icon: <Heart className="w-5 h-5" />, title: 'Sukhmani Sahib — Psalm of Peace', comfortTopic: true, prompt: 'Share and explain the opening verses of Sukhmani Sahib Ji by Guru Arjan Dev Ji. Explain how this Bani is specifically meant for peace of mind and healing from anxiety. Include transliteration and meaning. Make it deeply comforting. 3-4 paragraphs.' },
  explore: { id: 'comfort-explore', icon: <Heart className="w-5 h-5" />, title: 'Comfort From Every Faith', comfortTopic: true, prompt: 'Share one short comforting verse or teaching from each of the 6 major religions for someone going through a difficult time. Make each one feel like a warm embrace. 4-5 paragraphs.' },
};

const TOPICS: Record<string, FaithTopic[]> = {
  islam: [
    { id: 'prophets', icon: <Star className="w-5 h-5" />, title: 'Stories of the Prophets', prompt: 'Tell an engaging, respectful, and accurate story about one of the 25 prophets mentioned in the Quran. Choose randomly from: Prophet Muhammad ﷺ, Prophet Ibrahim (AS), Prophet Musa (AS), Prophet Isa (AS), Prophet Yusuf (AS), Prophet Nuh (AS), Prophet Dawud (AS), or Prophet Sulaiman (AS). Use authentic Islamic sources. Include the moral/lesson at the end. Use honorifics: ﷺ for Prophet Muhammad, (AS) for other prophets. 3-4 paragraphs.' },
    { id: 'sahaba', icon: <Heart className="w-5 h-5" />, title: 'Sahaba Stories', prompt: 'Tell an inspiring and authentic story about one of the Sahaba (companions of Prophet Muhammad ﷺ). Choose randomly from: Abu Bakr (RA), Umar ibn Al-Khattab (RA), Ali ibn Abi Talib (RA), Bilal ibn Rabah (RA), Khadijah (RA), Aisha (RA), or Salman Al-Farisi (RA). Use (RA) honorific. Include the moral. 3-4 paragraphs.' },
    { id: 'quran-guide', icon: <Music className="w-5 h-5" />, title: 'Quran Listening Guide', prompt: 'Recommend a Surah from the Quran for someone to listen to right now. Briefly explain what the Surah is about, its significance, and how many verses it has. 2-3 paragraphs.', links: [{ label: 'Quran.com — Listen with Translation', url: 'https://quran.com' }, { label: 'MP3Quran.net — Full Recitations', url: 'https://mp3quran.net' }] },
    { id: 'daily-reminder', icon: <Sun className="w-5 h-5" />, title: 'Daily Islamic Reminder', prompt: 'Share one of the following: an authentic hadith from Sahih Bukhari or Sahih Muslim, or a beautiful Quranic verse, or a meaningful dua. Include the Arabic transliteration, English translation, and source. Add a short reflection. 2-3 paragraphs.' },
    { id: 'history', icon: <History className="w-5 h-5" />, title: 'Islamic History', prompt: 'Tell an engaging story from early Islamic history. Choose randomly from: the Battle of Badr, the Battle of Uhud, the Hijra to Medina, the Treaty of Hudaybiyyah, the Conquest of Makkah, or the story of a great Muslim scholar. Include historical context and lessons. 3-4 paragraphs.' },
    { id: 'mental-health-islam', icon: <Brain className="w-5 h-5" />, title: 'Mental Health in Islam', prompt: 'Explain how Islam approaches mental health and emotional wellbeing. Discuss the Prophet Muhammad ﷺ\'s teachings about sadness, patience (sabr), trusting Allah (tawakkul), the power of dua for anxiety, the Quran as healing (shifa), and the importance of seeking professional help in Islamic scholarship. Include specific hadith references. Be warm and non-judgmental. 3-4 paragraphs.' },
  ],
  hinduism: [
    { id: 'mahabharata', icon: <Scroll className="w-5 h-5" />, title: 'Mahabharata Stories', prompt: 'Narrate an engaging episode from the Mahabharata. Choose randomly. End with the moral. 3-4 paragraphs.' },
    { id: 'ramayana', icon: <BookOpen className="w-5 h-5" />, title: 'Ramayana Stories', prompt: 'Tell a beautiful episode from the Ramayana. End with the moral. 3-4 paragraphs.' },
    { id: 'gods', icon: <Star className="w-5 h-5" />, title: 'Stories of Gods & Goddesses', prompt: 'Tell a story about a Hindu deity from the Puranas. End with the spiritual meaning. 3-4 paragraphs.' },
    { id: 'gita', icon: <Heart className="w-5 h-5" />, title: 'Bhagavad Gita Wisdom', prompt: 'Share one meaningful shloka from the Bhagavad Gita. Provide Sanskrit transliteration, English translation, chapter and verse number, and life lesson. 2-3 paragraphs.' },
    { id: 'music-guide', icon: <Music className="w-5 h-5" />, title: 'Devotional Music Guide', prompt: 'Recommend a devotional bhajan or stotra. Explain its meaning and significance. 2 paragraphs.', links: [{ label: 'YouTube — Devotional Music', url: 'https://www.youtube.com/results?search_query=hindu+devotional+bhajan' }, { label: 'JioSaavn — Bhajan Playlists', url: 'https://www.jiosaavn.com/featured/devotional-top-50/CNMUie5rJvI_' }] },
    { id: 'festivals', icon: <Calendar className="w-5 h-5" />, title: 'Hindu Festivals', prompt: 'Explain the significance of a major Hindu festival. Include mythology, celebrations, and meaning. 3-4 paragraphs.' },
    { id: 'mental-health-hinduism', icon: <Brain className="w-5 h-5" />, title: 'Mental Health in Hinduism', prompt: 'Explain how Hinduism approaches mental health and emotional wellbeing. Discuss the concept of the mind (manas) in the Upanishads, how the Bhagavad Gita addresses Arjuna\'s anxiety and depression, the role of yoga and meditation as healing practices, the concept of dharma in maintaining balance, and Ayurvedic approaches to mental wellness. Be warm and practical. 3-4 paragraphs.' },
  ],
  christianity: [
    { id: 'bible-stories', icon: <BookOpen className="w-5 h-5" />, title: 'Bible Stories', prompt: 'Tell an engaging story from the Bible. Include scriptural reference and moral. 3-4 paragraphs.' },
    { id: 'jesus', icon: <Star className="w-5 h-5" />, title: 'Life of Jesus Christ', prompt: 'Tell a story from the life of Jesus Christ. Include scriptural references. 3-4 paragraphs.' },
    { id: 'saints', icon: <Heart className="w-5 h-5" />, title: 'Saints & Their Stories', prompt: 'Tell the inspiring story of a Christian saint. Include their life, faith journey, and lesson. 3-4 paragraphs.' },
    { id: 'verse', icon: <Sun className="w-5 h-5" />, title: 'Bible Verse of the Day', prompt: 'Share one meaningful Bible verse with full reference, context, and practical reflection. 2-3 paragraphs.' },
    { id: 'gospel-guide', icon: <Music className="w-5 h-5" />, title: 'Gospel Music Guide', prompt: 'Recommend a gospel song or hymn. Explain its message. 2 paragraphs.', links: [{ label: 'YouTube — Praise & Worship', url: 'https://www.youtube.com/results?search_query=praise+and+worship+songs' }, { label: 'Spotify — Gospel', url: 'https://open.spotify.com/genre/gospel' }] },
    { id: 'prayers', icon: <MessageCircle className="w-5 h-5" />, title: 'Christian Prayers', prompt: 'Share a meaningful Christian prayer. Include full text and when to use it. 2-3 paragraphs.' },
    { id: 'mental-health-christianity', icon: <Brain className="w-5 h-5" />, title: 'Mental Health in Christianity', prompt: 'Explain how Christianity approaches mental health. Discuss Jesus\'s compassion for the suffering, the Psalms as emotional expression (including David\'s depression), the role of Christian community in healing, what the Bible says about anxiety (Philippians 4:6-7), and how modern Christian counseling integrates faith and therapy. Be warm. 3-4 paragraphs.' },
  ],
  judaism: [
    { id: 'torah', icon: <Scroll className="w-5 h-5" />, title: 'Torah Stories', prompt: 'Tell an engaging story from the Torah. Include moral lesson. 3-4 paragraphs.' },
    { id: 'holidays', icon: <Calendar className="w-5 h-5" />, title: 'Jewish Holidays', prompt: 'Explain a major Jewish holiday. Include history, observance, and meaning. 3-4 paragraphs.' },
    { id: 'talmud', icon: <BookOpen className="w-5 h-5" />, title: 'Talmud Wisdom', prompt: 'Share a meaningful teaching from the Talmud with practical application. 2-3 paragraphs.' },
    { id: 'prayers', icon: <MessageCircle className="w-5 h-5" />, title: 'Jewish Prayers & Blessings', prompt: 'Share a Jewish prayer or blessing with Hebrew transliteration, meaning, and significance. 2-3 paragraphs.' },
    { id: 'mental-health-judaism', icon: <Brain className="w-5 h-5" />, title: 'Mental Health in Judaism', prompt: 'Explain how Judaism approaches mental health. Discuss the concept of pikuach nefesh (saving a life — including mental health), Maimonides\' writings on emotional wellbeing, the Talmud\'s acknowledgment of depression, the role of community (kehillah) in support, and how Jewish law permits breaking Shabbat for mental health emergencies. Be warm. 3-4 paragraphs.' },
  ],
  buddhism: [
    { id: 'buddha', icon: <Star className="w-5 h-5" />, title: 'Life of the Buddha', prompt: 'Tell a story from the life of Siddhartha Gautama. Include spiritual lesson. 3-4 paragraphs.' },
    { id: 'dharma', icon: <BookOpen className="w-5 h-5" />, title: 'Buddhist Teachings (Dharma)', prompt: 'Explain a key Buddhist teaching clearly and practically. 3-4 paragraphs.' },
    { id: 'jataka', icon: <Heart className="w-5 h-5" />, title: 'Jataka Tales', prompt: 'Tell one of the Jataka Tales with moral. 3-4 paragraphs.' },
    { id: 'meditation', icon: <Sun className="w-5 h-5" />, title: 'Meditation Guidance', prompt: 'Guide someone through a simple Buddhist mindfulness meditation. 3-4 paragraphs.' },
    { id: 'chants', icon: <Music className="w-5 h-5" />, title: 'Buddhist Chants Guide', prompt: 'Recommend a Buddhist chant or mantra with meaning. 2-3 paragraphs.', links: [{ label: 'YouTube — Buddhist Chants', url: 'https://www.youtube.com/results?search_query=buddhist+meditation+chant' }] },
    { id: 'mental-health-buddhism', icon: <Brain className="w-5 h-5" />, title: 'Mental Health in Buddhism', prompt: 'Explain how Buddhism approaches mental health. Discuss the Buddha\'s teachings on suffering (dukkha) as a starting point for healing, mindfulness as therapy, the concept of the "monkey mind," how meditation practice parallels modern CBT and mindfulness-based therapy, and the Buddhist approach to self-compassion (karuna). Be warm and practical. 3-4 paragraphs.' },
  ],
  sikhism: [
    { id: 'gurus', icon: <Star className="w-5 h-5" />, title: 'Stories of the 10 Gurus', prompt: 'Tell an inspiring story about one of the 10 Sikh Gurus. Use "Ji" honorific. Include teaching and lesson. 3-4 paragraphs.' },
    { id: 'gurbani', icon: <BookOpen className="w-5 h-5" />, title: 'Gurbani Wisdom', prompt: 'Share a meaningful Shabad from the Guru Granth Sahib Ji with transliteration, translation, and meaning. 2-3 paragraphs.' },
    { id: 'history', icon: <History className="w-5 h-5" />, title: 'Sikh History', prompt: 'Tell a story from Sikh history with context and lesson. 3-4 paragraphs.' },
    { id: 'kirtan', icon: <Music className="w-5 h-5" />, title: 'Kirtan Guide', prompt: 'Recommend a Shabad Kirtan with meaning. 2 paragraphs.', links: [{ label: 'SikhNet — Gurbani Kirtan', url: 'https://www.sikhnet.com/gurbani' }, { label: 'YouTube — Shabad Kirtan', url: 'https://www.youtube.com/results?search_query=gurbani+kirtan+shabad' }] },
    { id: 'langar', icon: <Heart className="w-5 h-5" />, title: 'Langar Philosophy', prompt: 'Explain the philosophy and significance of Langar in Sikhism. Discuss how Guru Nanak Dev Ji started this tradition, what it means to serve food to everyone regardless of caste, creed, gender, or wealth. Explain how Langar embodies equality (pangat), selfless service (seva), and community. Share how Langar operates in modern Gurdwaras worldwide. Include the spiritual lesson. 3-4 paragraphs.' },
    { id: 'chardi-kala', icon: <Sun className="w-5 h-5" />, title: 'Chardi Kala Philosophy', prompt: 'Explain the Sikh concept of Chardi Kala — eternal optimism and resilience in the face of adversity. Discuss its roots in Gurbani, how Sikhs maintained Chardi Kala through centuries of persecution, the daily Ardas prayer that includes Chardi Kala, and how this philosophy applies to modern mental health and resilience. Include examples from Sikh history. 3-4 paragraphs.' },
    { id: 'mental-health-sikhism', icon: <Brain className="w-5 h-5" />, title: 'Mental Health in Sikhism', prompt: 'Explain how Sikhism approaches mental health. Discuss the concept of haumai (ego) as a source of suffering, the healing power of Naam Simran (meditation on God\'s name), Gurbani as therapy for the mind, the role of Sangat (community) in support, and how Chardi Kala (eternal optimism) is a Sikh approach to resilience. Be warm. 3-4 paragraphs.' },
  ],
  explore: [
    { id: 'compare', icon: <MessageCircle className="w-5 h-5" />, title: 'What Religions Share', prompt: 'Explain what the major world religions share in common. Focus on compassion, charity, prayer, community. Never rank or compare negatively. 3-4 paragraphs.' },
    { id: 'golden-rule', icon: <Heart className="w-5 h-5" />, title: 'The Golden Rule', prompt: 'Show how "treat others as you wish to be treated" appears in every major religion with exact quotes and sources. 3-4 paragraphs.' },
    { id: 'peace', icon: <Sun className="w-5 h-5" />, title: 'Prayers for Peace', prompt: 'Share a prayer or teaching about peace from each of the 6 major religions with sources. 4-5 paragraphs.' },
    { id: 'mental-health-all', icon: <Brain className="w-5 h-5" />, title: 'Mental Health Across Faiths', prompt: 'Explain how each major religion (Islam, Christianity, Hinduism, Buddhism, Judaism, Sikhism) approaches mental health and emotional wellbeing. Give one key teaching or practice from each faith. Show that seeking help is supported by all traditions. 4-5 paragraphs.' },
  ],
};

import { GROQ_API_KEY } from '../utils/constants';
const API_KEY = GROQ_API_KEY;
const SYSTEM_PROMPT = 'You are a respectful, knowledgeable, and compassionate Religious Companion. You support all faiths equally without bias. Always be deeply respectful. Never mock, compare negatively, or rank religions. Use appropriate honorifics: ﷺ for Prophet Muhammad, (AS) for other prophets in Islam, "Ji" in Sikhism. Never fabricate religious texts — only share what is authentically known. If unsure, say "I recommend verifying this with a qualified religious scholar." Keep stories engaging, age-appropriate, and meaningful. End with a moral or reflection.';

async function callFaithAI(prompt: string, signal?: AbortSignal): Promise<string> {
  const models = ['qwen/qwen3.8-27b', 'allam-2-7b', 'openai/gpt-oss-20b'];
  for (const model of models) {
    if (signal?.aborted) break;
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }], temperature: 0.8, max_tokens: 1200 }),
        signal,
      });
      if (res.ok && !signal?.aborted) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text.replace(/^["']|["']$/g, '').trim();
      }
    } catch { /* next */ }
  }
  return '';
}

export default function FaithSection({ profile, setProfile }: FaithSectionProps) {
  const [religion, setReligion] = useState<Religion>(() => {
    const saved = localStorage.getItem('nm_faith_religion');
    return (saved as Religion) || null;
  });
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTopic, setActiveTopic] = useState<FaithTopic | null>(null);
  const [reflection, setReflection] = useState('');
  const [reflectionLoading, setReflectionLoading] = useState(false);
  const [mood, setMood] = useState<number | null>(null);
  const [showComfort, setShowComfort] = useState(false);
  const [saved, setSaved] = useState(false);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; if (abortRef.current) abortRef.current.abort(); };
  }, []);

  // Load reflection when religion is selected
  useEffect(() => {
    if (religion && religion !== 'explore' && !activeTopic) {
      loadReflection();
    }
  }, [religion]);

  const loadReflection = async () => {
    if (!religion || reflectionLoading) return;
    setReflectionLoading(true);
    setReflection('');
    const prompt = REFLECTION_PROMPTS[religion] || REFLECTION_PROMPTS.explore;
    const text = await callFaithAI(prompt);
    if (mountedRef.current) {
      setReflection(text || '');
      setReflectionLoading(false);
    }
  };

  const selectReligion = (r: Religion) => {
    setReligion(r);
    if (r) localStorage.setItem('nm_faith_religion', r);
    setActiveTopic(null);
    setContent('');
    setSaved(false);
    setMood(null);
    setShowComfort(false);
    setReflection('');
  };

  const handleMood = (m: number) => {
    setMood(m);
    if (m <= 2 && religion) {
      setShowComfort(true);
    } else {
      setShowComfort(false);
    }
  };

  const loadContent = async (topic: FaithTopic) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setActiveTopic(topic);
    setContent('');
    setLoading(true);
    setSaved(false);

    const text = await callFaithAI(topic.prompt, ctrl.signal);

    if (mountedRef.current && !ctrl.signal.aborted) {
      setContent(text || 'Could not generate content. Please try again.');
      setLoading(false);
    }
  };

  const saveToJournal = () => {
    if (!content || saved) return;
    const today = new Date().toISOString().split('T')[0];
    const prompt = `${activeTopic?.title || 'Faith Reflection'} (${RELIGIONS.find(r => r.id === religion)?.name || 'Spiritual'})`;
    const updated = {
      ...profile,
      journalEntries: [...(profile.journalEntries || []), { date: today, content, prompt }],
    };
    setProfile(updated);
    setSaved(true);
  };

  const topics = religion ? TOPICS[religion] || [] : [];
  const religionInfo = RELIGIONS.find(r => r.id === religion);
  const comfortTopic = religion ? COMFORT_TOPICS[religion] : null;

  // ─── RELIGION SELECTOR ───
  if (!religion) {
    return (
      <div className="h-full overflow-y-auto p-5 pb-24 md:pb-8">
        <div className="max-w-md mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <span className="text-4xl mb-4 block">🙏</span>
            <h2 className="font-serif text-2xl text-forest-900 mb-2">Faith & Spirituality</h2>
            <p className="text-sand-500 text-sm">choose your path to explore</p>
          </motion.div>

          <div className="grid grid-cols-2 gap-3">
            {RELIGIONS.map((r, i) => (
              <motion.button key={r.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => selectReligion(r.id)}
                className={`text-left p-4 rounded-2xl bg-gradient-to-br ${r.color} border border-sand-200 hover:shadow-md transition-all active:scale-[0.97]`}>
                <span className="text-3xl block mb-2">{r.emoji}</span>
                <p className="font-medium text-forest-900 text-sm">{r.name}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── TOPIC LIST / CONTENT VIEW ───
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2 border-b border-sand-200 flex items-center gap-3">
        <button onClick={() => activeTopic ? (setActiveTopic(null), setContent(''), setSaved(false)) : selectReligion(null)}
          className="w-8 h-8 rounded-lg bg-sand-100 hover:bg-sand-200 flex items-center justify-center transition-colors">
          <ArrowLeft className="w-4 h-4 text-sand-600" />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xl">{religionInfo?.emoji}</span>
          <p className="font-serif text-lg text-forest-900 truncate">
            {activeTopic ? activeTopic.title : religionInfo?.name}
          </p>
        </div>
        {activeTopic && (
          <button onClick={() => loadContent(activeTopic)} disabled={loading}
            className="text-sand-500 hover:text-forest-600 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-8">
        <div className="max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            {!activeTopic ? (
              <motion.div key="topics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Mood check */}
                {mood === null && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-warm-50 to-forest-50 rounded-xl border border-sand-200 px-4 py-3 mb-4 flex items-center justify-between gap-3">
                    <p className="text-sm text-forest-800">how are you feeling?</p>
                    <div className="flex gap-1">
                      {[{ v: 1, e: '😢' }, { v: 2, e: '😔' }, { v: 3, e: '😐' }, { v: 4, e: '🙂' }, { v: 5, e: '😊' }].map(m => (
                        <button key={m.v} onClick={() => handleMood(m.v)}
                          className="w-9 h-9 rounded-lg hover:bg-white/70 flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95">
                          {m.e}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Comfort suggestion for low mood */}
                {showComfort && comfortTopic && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                    className="mb-4">
                    <p className="text-xs text-sand-500 mb-2">💚 we noticed you might need comfort...</p>
                    <button onClick={() => loadContent(comfortTopic)}
                      className="w-full text-left bg-forest-50 border border-forest-200 rounded-xl p-4 hover:shadow-sm transition-all active:scale-[0.98]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-forest-100 flex items-center justify-center text-forest-600">
                          {comfortTopic.icon}
                        </div>
                        <div>
                          <p className="font-medium text-forest-900 text-sm">{comfortTopic.title}</p>
                          <p className="text-xs text-forest-600">recommended for you right now</p>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                )}

                {/* Reflection of the Day */}
                {(reflection || reflectionLoading) && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-gradient-to-br from-warm-50 to-sand-50 rounded-2xl border border-warm-200 p-5 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-warm-500" />
                      <span className="text-xs font-medium text-warm-600 uppercase tracking-wider">Reflection of the Day</span>
                    </div>
                    {reflectionLoading ? (
                      <div className="flex items-center gap-2 py-2">
                        <Loader2 className="w-4 h-4 text-warm-400 animate-spin" />
                        <span className="text-sm text-sand-500">loading reflection...</span>
                      </div>
                    ) : (
                      <p className="text-forest-900 text-sm leading-relaxed italic">{reflection}</p>
                    )}
                  </motion.div>
                )}

                {/* Topic list */}
                <div className="space-y-2">
                  {topics.map((topic, i) => (
                    <motion.button key={topic.id}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => loadContent(topic)}
                      className="w-full flex items-center gap-3 bg-white rounded-xl border border-sand-200 p-4 hover:border-forest-200 hover:shadow-sm transition-all active:scale-[0.98] text-left">
                      <div className="w-10 h-10 rounded-xl bg-forest-50 flex items-center justify-center text-forest-600 flex-shrink-0">
                        {topic.icon}
                      </div>
                      <p className="font-medium text-forest-900 text-sm">{topic.title}</p>
                    </motion.button>
                  ))}
                </div>

                <button onClick={() => selectReligion(null)}
                  className="w-full mt-6 text-sm text-sand-500 hover:text-forest-600 transition-colors">
                  ← choose a different faith
                </button>
              </motion.div>
            ) : (
              /* Content display */
              <motion.div key="content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {loading ? (
                  <div className="text-center py-16">
                    <Loader2 className="w-8 h-8 text-forest-400 animate-spin mx-auto mb-3" />
                    <p className="text-sand-500 text-sm">preparing your reading...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-sand-200 p-6">
                      <p className="text-forest-900 text-[15px] leading-[1.85] whitespace-pre-wrap">{content}</p>
                    </div>

                    {/* External links */}
                    {activeTopic.links && activeTopic.links.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-sand-500 uppercase tracking-wider">Listen & Explore</p>
                        {activeTopic.links.map(link => (
                          <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-between bg-white rounded-xl border border-sand-200 p-3.5 hover:border-forest-200 hover:shadow-sm transition-all group">
                            <p className="text-sm font-medium text-forest-800">{link.label}</p>
                            <ExternalLink className="w-4 h-4 text-sand-400 group-hover:text-forest-600" />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button onClick={() => loadContent(activeTopic)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-forest-600 hover:bg-forest-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
                        <RefreshCw className="w-4 h-4" /> Another One
                      </button>
                      <button onClick={saveToJournal} disabled={saved || !content}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          saved
                            ? 'bg-forest-50 text-forest-600 border border-forest-200'
                            : 'bg-warm-50 hover:bg-warm-100 text-warm-700 border border-warm-200'
                        }`}>
                        {saved ? <><Check className="w-4 h-4" /> Saved</> : <><Save className="w-4 h-4" /> Save to Journal</>}
                      </button>
                    </div>

                    <button onClick={() => { setActiveTopic(null); setContent(''); setSaved(false); }}
                      className="w-full flex items-center justify-center gap-1.5 bg-sand-100 hover:bg-sand-200 text-sand-700 py-2.5 rounded-xl text-sm font-medium transition-colors">
                      ← Back to Topics
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
