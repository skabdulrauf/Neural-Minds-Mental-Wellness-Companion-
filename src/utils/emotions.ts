const EMOTION_KEYWORDS: Record<string, string[]> = {
  joy: ['happy', 'glad', 'great', 'wonderful', 'amazing', 'love', 'excited', 'thrilled', 'grateful', 'blessed', 'fantastic', 'awesome', 'yay', 'delighted'],
  sadness: ['sad', 'down', 'depressed', 'unhappy', 'miserable', 'crying', 'tears', 'cry', 'heartbroken', 'devastated', 'empty', 'numb', 'sorrowful'],
  anxiety: ['anxious', 'worried', 'nervous', 'panic', 'scared', 'fear', 'restless', 'uneasy', 'dread', 'overthinking', 'overwhelm', 'stress', 'freaking out'],
  anger: ['angry', 'mad', 'furious', 'annoyed', 'frustrated', 'irritated', 'rage', 'pissed', 'hate', 'livid', 'resentful'],
  loneliness: ['lonely', 'alone', 'isolated', 'nobody cares', 'no one cares', 'friendless', 'abandoned', 'left out', 'disconnected', 'all alone'],
  hopelessness: ['hopeless', 'pointless', 'meaningless', 'no hope', 'give up', 'nothing matters', 'why bother', 'no future', 'trapped', 'no way out'],
  guilt: ['guilty', 'blame myself', 'my fault', 'regret', 'ashamed', 'shame', 'embarrassed', 'worthless', 'i ruined'],
  grief: ['lost someone', 'died', 'death', 'passed away', 'gone forever', 'miss them', 'grieving', 'mourning', 'funeral', 'lost my'],
  confusion: ['confused', 'uncertain', 'unsure', 'mixed up', 'conflicted', 'torn', 'dont understand', "don't understand"],
  gratitude: ['thankful', 'grateful', 'appreciate', 'fortunate', 'lucky', 'blessed'],
  calm: ['calm', 'peaceful', 'relaxed', 'serene', 'content', 'doing well', 'feeling okay', 'feeling fine', 'feeling good', 'im okay', "i'm okay", 'im fine', "i'm fine", 'im good', "i'm good", 'im alright', "i'm alright"],
  exhaustion: ['tired', 'exhausted', 'drained', 'burnt out', 'burnout', 'fatigued', 'no energy', 'wiped out', 'so tired'],
};

export function detectEmotion(message: string): string {
  const lower = message.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    scores[emotion] = 0;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        // Weight multi-word phrases higher
        const weight = keyword.includes(' ') ? 2 : 1;
        scores[emotion] += weight;
      }
    }
  }

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return 'neutral';

  // Find all emotions with max score and prefer negative ones for safety
  const topEmotions = Object.entries(scores).filter(([, score]) => score === maxScore);
  
  // Priority order for ties (prefer concerning emotions)
  const priority = ['hopelessness', 'grief', 'anxiety', 'sadness', 'loneliness', 'guilt', 'anger', 'exhaustion', 'confusion', 'calm', 'gratitude', 'joy'];
  
  for (const emotion of priority) {
    if (topEmotions.find(([e]) => e === emotion)) {
      return emotion;
    }
  }

  return topEmotions[0]?.[0] || 'neutral';
}

export function classifyRisk(message: string, emotion: string): 'low' | 'moderate' | 'high' | 'critical' {
  const lower = message.toLowerCase();

  const criticalIndicators = ['kill myself', 'end my life', 'suicide', 'want to die', 'take my life', 'overdose'];
  if (criticalIndicators.some(k => lower.includes(k))) return 'critical';

  const highIndicators = ['self harm', 'hurt myself', 'cut myself', 'no reason to live', 'better off dead', 'end it all'];
  if (highIndicators.some(k => lower.includes(k))) return 'high';

  if (['hopelessness', 'grief'].includes(emotion)) return 'moderate';
  if (['sadness', 'anxiety', 'loneliness', 'guilt', 'exhaustion'].includes(emotion)) return 'moderate';

  return 'low';
}

export function getEmotionEmoji(emotion: string): string {
  const map: Record<string, string> = {
    joy: '☀️', sadness: '🌧️', anxiety: '🌊', anger: '🔥', loneliness: '🌑',
    hopelessness: '🌫️', guilt: '💭', grief: '🕊️', confusion: '🌀',
    gratitude: '🌻', calm: '🍃', exhaustion: '🌙', neutral: '✨',
  };
  return map[emotion] || '✨';
}

export function getEmotionColor(emotion: string): string {
  const map: Record<string, string> = {
    joy: '#e4ad5e', sadness: '#5ea384', anxiety: '#ed8f7a', anger: '#cd5035',
    loneliness: '#8f71a1', hopelessness: '#725e4d', guilt: '#a68a6c',
    grief: '#654c6f', confusion: '#b39b7a', gratitude: '#3d8768',
    calm: '#8dc2a8', exhaustion: '#5e4e41', neutral: '#c1af93',
  };
  return map[emotion] || '#c1af93';
}

export function inferAge(messages: string[]): 'child' | 'teen' | 'young_adult' | 'adult' | 'elderly' | undefined {
  const combined = messages.join(' ').toLowerCase();

  const childIndicators = ['school', 'mommy', 'daddy', 'teacher', 'playground', 'cartoon', 'homework', 'recess'];
  const teenIndicators = ['exam', 'college apps', 'parents wont', "parents won't", 'crush', 'social media', 'tiktok', 'instagram', 'snapchat', 'highschool', 'high school', 'prom', 'grade ', 'senior year', 'junior year'];
  const youngAdultIndicators = ['university', 'job hunt', 'career', 'dating apps', 'rent', 'internship', 'graduate', 'graduation', 'student loan', 'roommate', 'first job'];
  const adultIndicators = ['mortgage', 'my kids', 'my children', 'marriage', 'divorce', 'promotion', 'my spouse', 'my husband', 'my wife', 'parenting', 'retirement plan', 'middle aged'];
  const elderlyIndicators = ['retired', 'grandchild', 'grandchildren', 'pension', 'arthritis', 'memory loss', 'old age', 'back in my day', 'when i was young', 'my generation'];

  const scores = {
    child: childIndicators.filter(k => combined.includes(k)).length,
    teen: teenIndicators.filter(k => combined.includes(k)).length,
    young_adult: youngAdultIndicators.filter(k => combined.includes(k)).length,
    adult: adultIndicators.filter(k => combined.includes(k)).length,
    elderly: elderlyIndicators.filter(k => combined.includes(k)).length,
  };

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return undefined;

  return Object.entries(scores).find(([, s]) => s === maxScore)?.[0] as 'child' | 'teen' | 'young_adult' | 'adult' | 'elderly' | undefined;
}

export function inferGender(messages: string[]): 'male' | 'female' | 'non_binary' | 'unknown' {
  const combined = messages.join(' ').toLowerCase();

  const femaleIndicators = ['my period', 'menstrual', 'cramps', 'pms', 'pregnancy', 'pregnant', 'my boyfriend', 'my husband', 'as a woman', 'as a girl', 'she/her', 'my daughter', 'im a woman', "i'm a woman", 'im a girl', "i'm a girl"];
  const maleIndicators = ['my girlfriend', 'my wife', 'as a man', 'as a guy', 'he/him', 'my son', 'im a man', "i'm a man", 'im a guy', "i'm a guy"];
  const nbIndicators = ['non-binary', 'nonbinary', 'they/them', 'enby', 'genderqueer', 'agender', 'genderfluid'];

  const fScore = femaleIndicators.filter(k => combined.includes(k)).length;
  const mScore = maleIndicators.filter(k => combined.includes(k)).length;
  const nbScore = nbIndicators.filter(k => combined.includes(k)).length;

  if (nbScore > 0) return 'non_binary';
  if (fScore > mScore && fScore > 0) return 'female';
  if (mScore > fScore && mScore > 0) return 'male';
  return 'unknown';
}
