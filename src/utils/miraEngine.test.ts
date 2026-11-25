import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateLocalMiraReply,
  getCuratedDailyFeed,
  getCuratedJournalReflection,
  getCuratedProgramLesson,
} from './miraEngine';
import { detectEmotion, classifyRisk } from './emotions';
import { extractDeterministicFactsFromText } from './engagement';
import { getGuaranteedNearbyFacilities } from '../services/location';
import { SOUND_CHANNELS, SOUNDSCAPE_PRESETS, SANCTUARY_MUSIC_TRACKS } from './soundEngine';
import { UserProfile } from './types';

const mockProfile: UserProfile = {
  displayName: 'Aria',
  concerns: [],
  distressedCount: 0,
  messageCount: 2,
  phq9Scores: [],
  moodHistory: [],
  streak: 4,
  journalEntries: [],
  miraMemory: [
    { type: 'goal', text: 'prepare for software engineering interviews', date: '2026-11-25', pinned: true },
  ],
};

test('detectEmotion and classifyRisk accurately categorize distress and calm', () => {
  assert.equal(detectEmotion('I am so anxious and freaking out about tomorrow'), 'anxiety');
  assert.equal(detectEmotion('Feeling really peaceful and calm today'), 'calm');
  assert.equal(classifyRisk('I feel anxious about my exam', 'anxiety'), 'moderate');
  assert.equal(classifyRisk('Feeling good and relaxed', 'calm'), 'low');
});

test('generateLocalMiraReply returns context-aware empathetic and universal knowledge responses', () => {
  const workReply = generateLocalMiraReply('My boss keeps piling work deadlines on me', mockProfile, [], false);
  assert.ok(workReply.length > 20);
  assert.ok(workReply.toLowerCase().includes('pressure') || workReply.toLowerCase().includes('work'));

  const mathReply = generateLocalMiraReply('What is 144 / 12 + 8?', mockProfile, [], false);
  assert.ok(mathReply.includes('20'));

  const memoryReply = generateLocalMiraReply('What do you remember about me?', mockProfile, [], false);
  assert.ok(memoryReply.includes('prepare for software engineering interviews'));

  const ventReply = generateLocalMiraReply('Everything is frustrating right now', mockProfile, [], true);
  assert.ok(ventReply.length > 20);
});

test('extractDeterministicFactsFromText extracts goals, problems, and events from user messages', () => {
  const facts = extractDeterministicFactsFromText(
    "I'm stressed about my final calculus exam and my goal is to sleep before midnight. I have an interview tomorrow morning."
  );
  assert.ok(facts.some((f) => f.type === 'problem' && f.text.includes('calculus exam')));
  assert.ok(facts.some((f) => f.type === 'goal' && f.text.includes('sleep before midnight')));
  assert.ok(facts.some((f) => f.type === 'event' && f.text.includes('interview tomorrow')));
});

test('getGuaranteedNearbyFacilities returns nearby hospitals and local clinics with phone numbers and addresses', () => {
  const facilities = getGuaranteedNearbyFacilities(19.076, 72.8777, 'Mumbai');
  assert.ok(facilities.length >= 6);
  assert.ok(facilities.some((f) => f.type.toLowerCase().includes('hospital')));
  assert.ok(facilities.some((f) => f.type.toLowerCase().includes('clinic')));
  for (const f of facilities) {
    assert.ok(f.phone && f.phone.length >= 10, `Facility ${f.name} should have a valid phone number`);
    assert.ok(f.address && f.address.length > 5, `Facility ${f.name} should have an address`);
    assert.ok(f.openingHours && f.openingHours.length > 3, `Facility ${f.name} should have opening hours`);
  }
});

test('getCuratedDailyFeed generates non-empty daily cards and optional faith card', () => {
  const bundle = getCuratedDailyFeed('Aria', 'islam', 0);
  assert.ok(bundle.checkin.includes('aria'));
  assert.ok(bundle.insight.length > 30);
  assert.ok(bundle.challenge.length > 20);
  assert.ok(bundle.mood_q.endsWith('?'));
  assert.ok(bundle.faith && bundle.faith.includes('Quran'));
});

test('getCuratedJournalReflection and getCuratedProgramLesson provide tailored content', () => {
  const reflection = getCuratedJournalReflection('I felt really anxious and overwhelmed today.');
  assert.ok(reflection.length > 30);

  const lesson = getCuratedProgramLesson('anxiety', 3);
  assert.ok(lesson.includes('vagus nerve'));
});

test('Sanctuary soundEngine provides real audio streams, multi-track presets, and therapeutic music compositions', () => {
  assert.ok(SOUND_CHANNELS.length >= 10);
  const streamingChannels = SOUND_CHANNELS.filter((c) => Boolean(c.audioUrl));
  assert.ok(streamingChannels.length >= 8, 'At least 8 channels should provide real field-recording stream URLs');
  for (const ch of streamingChannels) {
    assert.ok(ch.audioUrl.startsWith('https://'), `Channel ${ch.id} audioUrl should be HTTPS`);
  }

  assert.ok(SOUNDSCAPE_PRESETS.length >= 4);
  for (const preset of SOUNDSCAPE_PRESETS) {
    const channelIds = Object.keys(preset.mix);
    assert.ok(channelIds.length >= 2, `Preset ${preset.id} should blend multiple channels`);
    for (const id of channelIds) {
      assert.ok(SOUND_CHANNELS.some((c) => c.id === id), `Preset ${preset.id} references valid channel ${id}`);
    }
  }

  assert.ok(SANCTUARY_MUSIC_TRACKS.length >= 6);
  for (const track of SANCTUARY_MUSIC_TRACKS) {
    assert.ok(track.title.length > 3, `Track ${track.id} should have a title`);
    assert.ok(track.keySignature.length > 3, `Track ${track.id} should have a keySignature`);
    assert.ok(track.bpm >= 30 && track.bpm <= 120, `Track ${track.id} should have valid therapeutic BPM`);
  }
});

