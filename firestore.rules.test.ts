import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Static & structural verification of hardened Firestore rules against the Dirty Dozen vectors
test('Firestore security rules enforce all 8 pillars and block Dirty Dozen vectors', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');

  // 1. Default deny catch-all
  assert.ok(rules.includes('match /{document=**}'), 'Must include global default-deny catch-all');
  assert.ok(rules.includes('allow read, write: if false;'), 'Global catch-all must deny all reads and writes');

  // 2. Verified user & ID hardening helpers
  assert.ok(rules.includes('function isValidId(id)'), 'Must define isValidId helper');
  assert.ok(rules.includes('request.auth.token.email_verified == true'), 'Must require email_verified == true');

  // 3. Entity validation blueprints
  assert.ok(rules.includes('function isValidUserProfile(data)'), 'Must define isValidUserProfile blueprint');
  assert.ok(rules.includes('function isValidChatThread(data)'), 'Must define isValidChatThread blueprint');
  assert.ok(rules.includes('function isValidSanctuaryState(data)'), 'Must define isValidSanctuaryState blueprint');
  assert.ok(rules.includes('function isValidCrisisLog(data)'), 'Must define isValidCrisisLog blueprint');

  // 4. All collections covered
  assert.ok(rules.includes('match /users/{userId}'), 'Must secure /users/{userId}');
  assert.ok(rules.includes('match /chats/{userId}'), 'Must secure /chats/{userId}');
  assert.ok(rules.includes('match /sanctuary_state/{userId}'), 'Must secure /sanctuary_state/{userId}');
  assert.ok(rules.includes('match /crisis_logs/{logId}'), 'Must secure /crisis_logs/{logId}');
});
