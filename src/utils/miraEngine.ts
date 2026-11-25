import { ChatMessage, UserProfile } from './types';
import { detectEmotion } from './emotions';

export interface DailyFeedBundle {
  checkin: string;
  insight: string;
  challenge: string;
  mood_q: string;
  faith?: string;
}

const EMOTION_RESPONSES: Record<string, string[]> = {
  anxiety: [
    "okay take a slow breath with me first. when everything piles up at once, your nervous system treats every small thing like an emergency. what's the single heaviest thing on your plate right now?",
    "that tight, racing feeling is so exhausting to carry around. you don't have to figure out the whole week tonight — what's one thing we can take off your shoulders for the next hour?",
    "i get why your head is spinning. when you're overwhelmed, even tiny decisions feel huge. tell me what happened today that tipped it over the edge.",
  ],
  sadness: [
    "i'm really glad you told me instead of sitting with that alone. you don't have to put a silver lining on it right now — some days just hurt. do you want to talk about what brought it on, or just sit together for a bit?",
    "that heavy, drained feeling is real. please don't beat yourself up for having a low day. what's been weighing on your heart the most today?",
    "ugh, i'm sorry today feels like that. sometimes the bravest thing is just admitting that it sucks right now. i'm right here — tell me as much or as little as you want.",
  ],
  exhaustion: [
    "Honestly that sounds like deep burnout, not just 'being tired'. when you've been running on empty for weeks, rest isn't a reward — it's maintenance. have you had even ten quiet minutes to yourself today?",
    "your body and brain are clearly asking for a pause. you've been carrying so much lately. what's draining your battery the fastest right now?",
    "no wonder you're wiped out. anyone dealing with that much pressure would feel depleted. what would a genuinely restful evening look like for you tonight?",
  ],
  loneliness: [
    "feeling disconnected even when people are around is one of the hardest kinds of lonely. i'm right here with you tonight. when did that feeling start creeping in today?",
    "you matter, and your presence here matters. loneliness can make your brain tell you stories that nobody cares, Vision gets super narrow when we feel isolated. tell me what's going on.",
    "i'm here, and i'm listening for real. what do you wish someone in your life understood about what you're going through right now?",
  ],
  anger: [
    "honestly? you have every right to be frustrated about that. it makes complete sense that crossed a line for you. what part of it bothers you the most?",
    "ugh, that would make me mad too. when people don't respect your effort or time, it stings. vent it all out — i'm listening.",
    "that's genuinely unfair. don't let anyone make you feel crazy for having a normal reaction to a frustrating situation. what happened next?",
  ],
  hopelessness: [
    "when you're in the middle of a dark tunnel, your brain convinces you it goes on forever. i promise you don't have to carry all of tomorrow right now — let's just focus on getting through the next ten minutes together. i'm right here with you.",
    "it sounds like you've been hurting for a long time and you're exhausted from trying. you don't have to fix everything tonight. just stay here and talk to me — what feels heaviest right now?",
  ],
  joy: [
    "wait i love hearing this!! hold onto that feeling for a second — you earned this good moment. what was the best part of it?",
    "that makes me so happy to hear! honestly we need to celebrate the good days just as much as we unpack the hard ones. tell me everything!",
  ],
  calm: [
    "i love a quiet, steady day. there's something really grounding about things just feeling okay. what's been helping you feel more settled lately?",
    "honestly peaceful days are underrated. glad you're in a good headspace today — anything on your mind you want to reflect on?",
  ],
  gratitude: [
    "noticing the good things while life is busy is such a superpower. what made that stand out to you today?",
    "that's genuinely lovely. pausing to appreciate moments like that shifts the whole energy of a day.",
  ],
  neutral: [
    "i'm here and listening. tell me more about what's been going through your mind today.",
    "gotcha. how do you actually feel about it underneath the surface?",
    "i'm following — unpack that a little more for me. what's been the hardest part of it?",
  ],
};

const VENT_RESPONSES: string[] = [
  "that sounds completely exhausting — like you're pouring everything out and nobody is actually meeting you halfway. what else happened?",
  "yeah. sometimes everything just feels like too much all at once. keep going, i'm listening to every word.",
  "god that's frustrating. you shouldn't have to carry all of that by yourself. what part of it stings the most?",
  "i hear how heavy that is. let it all out — no advice, no fixing, i'm just right here with you.",
];

function tryEvaluateMathExpression(input: string): string | null {
  const cleaned = input
    .replace(/what is|calculate|solve|compute|evaluate|equals|\?/gi, '')
    .trim();
  if (!/^[\d\s+\-*/().^%]+$/.test(cleaned) || !/\d/.test(cleaned)) return null;
  try {
    const jsExpr = cleaned.replace(/\^/g, '**');
    const fn = new Function(`"use strict"; return (${jsExpr});`);
    const result = fn();
    if (typeof result === 'number' && Number.isFinite(result)) {
      return Number.isInteger(result) ? String(result) : result.toFixed(4).replace(/\.?0+$/, '');
    }
  } catch {}
  return null;
}

export function generateLocalMiraReply(
  userMessage: string,
  profile: UserProfile,
  messages: ChatMessage[],
  ventMode: boolean = false
): string {
  const clean = userMessage.trim();
  const lower = clean.toLowerCase();
  const name = profile.displayName && profile.displayName !== 'Friend' ? profile.displayName : '';
  const storedMemory = Array.isArray(profile.miraMemory) ? profile.miraMemory : [];

  if (ventMode) {
    const idx = (clean.length + messages.length) % VENT_RESPONSES.length;
    return VENT_RESPONSES[idx];
  }

  // 1. Direct questions about what Mira remembers about the user
  if (/\b(what do you remember|do you remember me|my memory|what do you know about me|who am i)\b/i.test(lower)) {
    if (storedMemory.length > 0) {
      const highlights = storedMemory.slice(-4).map(f => f.text).join(', ');
      return `of course i remember${name ? `, ${name}` : ''}! i've got ${storedMemory.length} things saved in our memory vault — including: ${highlights}. you can also tap the "Memory Vault" button right above our chat anytime to view, pin, or edit everything i remember about your journey.`;
    }
    return `i remember your name is ${name || 'my friend'} and you're on a ${profile.streak || 1}-day sanctuary streak! as we talk more (or if you add notes in the Memory Vault button at the top of chat), i'll keep track of the people, goals, triggers, and wins that matter to you.`;
  }

  // 2. Math & calculations
  const mathAns = tryEvaluateMathExpression(clean);
  if (mathAns !== null) {
    return `that comes out to **${mathAns}**. if you're grinding through study or problem sets right now, remember to unclench your shoulders and take a quick 60-second reset in *Breathe & Ground* whenever your brain starts feeling fatigued!`;
  }

  // 3. Coding / Computer Science / Tech questions
  if (/\b(code|javascript|typescript|python|react|algorithm|function|bug|debug|programming|sql|html|css|api)\b/i.test(lower)) {
    return `i'd love to help you think through that technical problem! when you're debugging or architecting code, cognitive overload happens fast because working memory can only hold about 4 chunks at once. break the logic into one pure input-to-output step first, test that assumption in isolation, and if screen fatigue hits, try turning on *10Hz Alpha Focus Beats* in our **Sounds & Sleep** mixer while you code. tell me the exact snippet or error you're looking at!`;
  }

  // 4. Science / Neuroscience / Psychology / CBT questions
  if (/\b(neuroscience|amygdala|dopamine|serotonin|cortisol|vagus nerve|cbt|cognitive|psychology|brain|nervous system|panic attack|how does anxiety work)\b/i.test(lower)) {
    return `here's the neuroscience behind it: when your brain perceives uncertainty or threat, the **amygdala** triggers a sympathetic fight-or-flight surge (releasing cortisol and adrenaline) faster than your prefrontal cortex can rationalize it. the fastest biological override is a slow exhale twice as long as your inhale (like **4-7-8 Breathing** in our *Breathe & Ground* tab), which stimulates the vagus nerve and releases acetylcholine to slow your heart rate within 30 seconds. pair that with our **CBT Thought Reframer** in *Wellness Studio* to shift blood flow back to your logical brain.`;
  }

  // 5. Study / Focus / Pomodoro / Exam prep
  if (/\b(how to focus|procrastinat|study tip|memorize|concentrate|pomodoro|burnout from studying)\b/i.test(lower)) {
    return `when a task feels overwhelming, your brain avoids it to protect you from discomfort — procrastinating is actually an emotion-regulation issue, not laziness. try the **3-Minute Rule**: shrink the first action until it takes under 180 seconds, put on *Alpha Focus Beats* or *Rainfall* in **Sounds & Sleep**, and use our **Student Mode** inside *Wellness Studio* to structure a gentle focus sprint without burning out.`;
  }

  // 6. App features / Navigation help
  if (/\b(what can you do|how does this app work|features|tools in this app|neuralminds)\b/i.test(lower)) {
    return `i'm your companion across the entire **NeuralMinds Sanctuary**! you can ask me literally anything — from deep emotional unpacking, CBT reframing, and neuroscience to study help, coding, or life decisions — and i'll also connect you with our tools:\n• **Breathe & Ground**: 4-7-8 somatic breathing, 5-4-3-2-1 sensory grounding & 60-sec resets\n• **Journal & Garden**: AI-reflected journaling, Gratitude Garden & Future Letters\n• **Sounds & Sleep**: Multi-layered Web Audio soundscape synthesizer & bedtime stories\n• **Wellness Studio**: CBT Thought Reframer, 7-Day Programs, First Aid Kit & Faith Wisdom\n• **Care & Helplines**: Live Google Maps support finder for nearby hospitals, clinics & therapists.`;
  }

  // 7. Handle direct greetings
  if (/^(hi|hey|hello|sup|yo|good morning|good evening)\b/i.test(lower) && clean.split(/\s+/).length <= 5) {
    const memHint = storedMemory.length > 0 ? ` i still remember you mentioned "${storedMemory[storedMemory.length - 1].text}" —` : '';
    return `hey${name ? ` ${name}` : ''}! good to see you here.${memHint} how has your day honestly been feeling so far, or what's on your mind?`;
  }

  // 8. Handle sleep / insomnia mentions
  if (/\b(can't sleep|insomnia|awake|tired|exhausted|sleep)\b/i.test(lower)) {
    return "nighttime magnifies every worry ten times over. when your body is tired but your mind won't clock out, it's brutal. try turning on our synthesized *Rainfall + Delta 2.5Hz Sleep Wave* in **Sounds & Sleep** or listening to a guided *Sleep Story* while we talk — what's the thought that keeps looping when you close your eyes?";
  }

  // 9. Handle work / school / deadline stress
  if (/\b(work|boss|job|deadline|exam|study|school|college|project|career)\b/i.test(lower)) {
    return "carrying that kind of pressure non-stop wears you down fast. there's a big difference between caring about your work and letting it consume your peace. what's the part that feels most out of your control right now?";
  }

  // 10. Handle relationship / family friction
  if (/\b(partner|boyfriend|girlfriend|friend|mom|dad|family|parents|relationship|argument|fight)\b/i.test(lower)) {
    return "relationship tension hits so much deeper because it's with people who are supposed to feel like home. did something specific happen between you two recently, or has it been building up?";
  }

  // 11. General "what is / how to / explain / why" knowledge inquiries
  if (/^(what is|what are|how do|how can|explain|tell me about|why does|why do|can you help me with)\b/i.test(lower)) {
    return `that's a really thoughtful question about "${clean.slice(0, 60)}". here's the core perspective: break it down into what you can directly influence today versus noise you can release. when your mind is exploring big questions or decisions, staying grounded makes your intuition 10x clearer. tell me what sparked this question for you today so i can tailor it specifically to your situation!`;
  }

  const emotion = detectEmotion(clean);
  const pool = EMOTION_RESPONSES[emotion] || EMOTION_RESPONSES.neutral;
  const idx = (clean.length + messages.length) % pool.length;
  const baseReply = pool[idx];

  // If we have stored memories and the message is longer, weave in subtle continuity
  if (storedMemory.length > 0 && messages.length > 3 && clean.length > 25) {
    const relevantFact = storedMemory.find(f => f.type === 'problem' || f.type === 'goal');
    if (relevantFact && !baseReply.includes(relevantFact.text)) {
      return `${baseReply} (and i'm keeping in mind what you shared about ${relevantFact.text} too.)`;
    }
  }

  return baseReply;
}

export function getCuratedDailyFeed(userName: string, faithPref: string | null, dayOffset: number = 0): DailyFeedBundle {
  const name = userName && userName !== 'Friend' ? userName.toLowerCase() : 'friend';
  const dayName = new Date().toLocaleDateString('en', { weekday: 'long' }).toLowerCase();

  const checkins = [
    `hey ${name}, happy ${dayName}. before you dive into everything the world wants from you today, unclench your jaw and drop your shoulders for two seconds. we're taking today one room at a time.`,
    `good to see you, ${name}. whatever weight you carried into this ${dayName}, you don't have to solve all of it in the next hour. start gentle and let yourself breathe first.`,
    `hey ${name} — just checking in on your ${dayName}. remember that doing your best looks different depending on how much energy you woke up with today.`,
  ];

  const insights = [
    "Wait, really? Naming an emotion out loud — psychologists call it 'affect labeling' — literally reduces activity in your brain's amygdala within seconds. Simply saying 'I notice I'm feeling anxious right now' shifts blood flow from your survival brain back to your prefrontal cortex.",
    "Your brain cannot easily tell the difference between a real physical threat and a vividly imagined future worry. However, a slow exhale that is twice as long as your inhale physically stimulates the vagus nerve, forcing your heart rate to slow down within 30 seconds.",
    "The 'Zeigarnik Effect' explains why unfinished tasks haunt your mind at 2 AM: your working memory keeps open loops active until they are externalized. Writing down just three bullet points on paper tells your brain the thought is safely stored, allowing it to release the loop.",
  ];

  const challenges = [
    "Step away from all screens for 7 minutes today and look at something far in the distance — a tree line, clouds, or a quiet street. Let your eyes and nervous system exit 'close-focus alert mode'.",
    "Send a two-sentence voice note or text to someone you appreciate with zero expectation of a conversation — just 'hey, thought of you today and hope your week is going okay.'",
    "Write down one thing you've been procrastinating on because of anxiety, and break the very first step down until it takes less than 3 minutes to start.",
  ];

  const questions = [
    "What is one expectation you're holding yourself to today that you would never demand from a close friend?",
    "If your energy level today were a weather forecast, what would it be — and what kind of shelter does it need?",
    "What is one small boundary that would protect your peace over the next 24 hours?",
  ];

  const faithReflections: Record<string, string> = {
    islam: '"Verily, with hardship comes ease." (Quran 94:6) — Notice that the verse repeats twice in Surah Ash-Sharh, reminding us that no single difficulty can outlast the multiple doors of relief that follow patience and trust.',
    hinduism: '"You have a right to perform your prescribed duties, but you are not entitled to the fruits of your actions." (Bhagavad Gita 2.47) — Release the anxiety of controlling every outcome today; peace lives in sincere effort.',
    christianity: '"Peace I leave with you; my peace I give you. Do not let your hearts be troubled and do not be afraid." (John 14:27) — Even when circumstances feel uncertain, you are invited to rest in a stillness deeper than worry.',
    buddhism: '"No mud, no lotus." (Thich Nhat Hanh) — The very difficulties you are navigating right now are the soil from which your deepest compassion and resilience grow.',
    judaism: '"The whole world is a very narrow bridge, and the main thing is to have no fear at all." (Rabbi Nachman of Breslov) — Walk steady across today\'s bridge one step at a time.',
    sikhism: '"Chardi Kala" — The practice of maintaining a state of joyful, resilient optimism even through adversity, trusting in divine wisdom and community.',
  };

  const daySeed = new Date().getDate() + dayOffset;
  return {
    checkin: checkins[daySeed % checkins.length],
    insight: insights[daySeed % insights.length],
    challenge: challenges[daySeed % challenges.length],
    mood_q: questions[daySeed % questions.length],
    faith: faithPref && faithReflections[faithPref] ? faithReflections[faithPref] : undefined,
  };
}

export function getCuratedJournalReflection(entryText: string): string {
  const emotion = detectEmotion(entryText);
  if (emotion === 'anxiety') {
    return "i read every word. i notice how much pressure you're holding inside your chest right now — writing it out onto the page is the first step in taking its power away. if you looked at this entry as a caring friend, what's one thing you'd tell yourself to let go of tonight?";
  }
  if (emotion === 'sadness' || emotion === 'loneliness' || emotion === 'grief') {
    return "thank you for trusting the page with something this tender. there's so much honesty in what you wrote, even in the parts that ache. what is one small comfort you can give yourself in the next hour?";
  }
  if (emotion === 'joy' || emotion === 'gratitude' || emotion === 'calm') {
    return "i love reading entries like this. capturing the moments where life feels a little lighter builds a real anchor you can look back on later. what do you think helped create this space for you today?";
  }
  return "reading this, i can see how deeply you're thinking through where you are right now. putting messy thoughts into actual words changes how we carry them. what felt most important to get off your chest as you wrote that?";
}

export function getCuratedProgramLesson(programId: string, dayNumber: number): string {
  const lessons: Record<string, string[]> = {
    anxiety: [
      "Anxiety isn't a personal flaw or a sign that you're broken — it's an ancient survival alarm system that's simply working overtime. When your brain senses uncertainty, your amygdala sounds the alarm before your logical mind even gets a vote. Your heart speeds up and your breathing gets shallow because your body thinks it needs to outrun danger. Today's shift is simple: when you feel that wave rise, instead of fighting yourself for feeling anxious, pause and say, 'My alarm system is trying to protect me, even though I'm safe right now.'",
      "Triggers aren't weaknesses; they are data points. Often anxiety feels like it ambushes us out of nowhere, but there is almost always a subtle cue first — an unread email late at night, skipping lunch, a specific tone of voice, or doomscrolling before bed. When you start spotting your patterns with curiosity instead of self-criticism, the fog lifts. You move from 'Why am I freaking out?' to 'Oh, my nervous system always reacts when I'm overtired and overcommitted.'",
      "Your breath is the remote control for your nervous system. While you can't consciously command your heart rate to drop by willpower alone, extending your exhale activates the vagus nerve — the main brake pedal of your parasympathetic system. When your exhale is longer than your inhale (like in 4-7-8 breathing), it sends a direct biological signal to your brain: 'No predator is chasing us. Stand down.'",
      "Anxious thoughts are masters of disguise — they wear the costume of facts. Psychologists call these cognitive distortions: catastrophizing (jumping to the worst-case disaster), mind-reading (assuming someone is upset with you), or all-or-nothing thinking. Today, treat your anxious thoughts like hypotheses, not verdicts. Ask: 'What is the actual evidence for this thought, and what is a more balanced middle truth?'",
      "When a storm hits, you don't want to be designing an umbrella from scratch. A personal safety net is a pre-decided menu of small anchors you built while calm: one breathing rhythm, one grounding object, two safe people you can text without explaining everything, and one comforting environment. Having your safety net ready removes decision fatigue when your mind feels flooded.",
      "Anxiety and sleep have a two-way relationship: daytime stress follows you under the covers, and a restless night lowers your emotional resilience the next morning. The secret to breaking the loop isn't forcing yourself to sleep — it's creating a 20-minute runway before bed where your brain isn't absorbing new problems or blue light.",
      "You made it through all seven days. Notice that resilience doesn't mean you never feel a spike of worry again — it means that when the wave comes, you know how to surf it instead of drowning in it. Keep using your breath, question catastrophic thoughts gently, and remember how capable you are of returning to calm.",
    ],
    confidence: [
      "Real confidence isn't being the loudest person in the room or pretending you never have doubts. True self-confidence is quiet self-trust: knowing that even if something feels hard or uncertain, you will have your own back through it. It isn't a trait some people are born with — it's a muscle built by keeping small promises to yourself.",
      "Everyone has an inner critic, and strangely enough, that harsh voice usually started as a clumsy bodyguard trying to keep you safe from embarrassment or rejection. The problem is that bullying yourself never builds lasting growth. Today, notice the exact phrases your inner critic uses, and practice answering it with the voice of a grounded, honest ally.",
      "Your brain tracks evidence. When you set massive, impossible standards and fall short, your brain logs a defeat. When you honor small wins — finishing one focused block, speaking up once, drinking water, taking a walk — dopamine reinforces agency. Momentum is built from micro-proofs that your actions matter.",
      "Your posture and physiology send continuous feedback loops to your emotional brain. When we feel insecure, we instinctively shrink: shoulders curl in, gaze drops, breathing stays shallow. Deliberately taking up space and softening your shoulders signals safety and presence back to your nervous system.",
      "Every time you say 'yes' to something that drains you when you meant 'no', you chip away at your self-respect. Setting a boundary doesn't require an angry speech or a ten-paragraph apology. A warm, clear 'I won't be able to take that on right now' honors both your capacity and your integrity.",
      "Perfectionism wears the mask of high standards, but underneath it is the fear of judgment. Waiting until you feel 100% ready before starting keeps you stuck on the sidelines. Embrace 'good enough to begin' — action cures the self-doubt that overthinking feeds.",
      "Over these seven days, you've practiced self-trust, boundaries, and celebrating small wins. Confidence isn't a finish line where doubt disappears forever — it's the daily practice of moving forward with kindness toward yourself.",
    ],
    sleep: [
      "Poor sleep rarely starts the moment your head hits the pillow — it builds across the day. Late caffeine, constant notifications, and carrying unprocessed stress into bed keep your cortisol elevated when melatonin should be rising. Tonight isn't about forcing sleep; it's about gently signaling to your body that the workday is truly over.",
      "Your bedroom environment cues your brain's circadian clock. A slightly cool room, warm dim lighting in the final hour, and keeping your phone out of arm's reach remove the micro-triggers that keep your brain scanning for alerts.",
      "Your mind cannot slam on the brakes from 60 mph to zero in two minutes. A 25-minute wind-down ritual — dimming lamps, gentle stretching, or listening to rain sounds — acts as a bridge between doing mode and resting mode.",
      "When the house goes quiet, your brain finally has bandwidth to bring up every unfinished worry. Keep a 'brain dump' notepad beside you: write down tomorrow's tasks so your mind knows it doesn't have to stand guard over them all night.",
      "Caffeine has a half-life of roughly 5 to 6 hours, meaning a 4 PM coffee is still half-active in your bloodstream at 10 PM. Protecting your afternoon window gives your natural adenosine sleep pressure room to build.",
      "Gentle daytime movement — even a 15-minute walk in natural daylight — anchors your circadian rhythm and helps your core body temperature drop smoothly at night, deepening slow-wave rest.",
      "You've completed your 7-Day Sleep Repair journey. Better rest comes from rhythm, not perfection. Trust your body's ability to rest when you give it a calm runway each evening.",
    ],
  };

  const progLessons = lessons[programId] || lessons.anxiety;
  return progLessons[Math.max(0, Math.min(dayNumber - 1, progLessons.length - 1))];
}
