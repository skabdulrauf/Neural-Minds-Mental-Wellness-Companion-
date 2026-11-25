# NeuralMinds Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict PII & Wellness Data Isolation**: Every document in `/users/{userId}`, `/chats/{userId}`, and `/sanctuary_state/{userId}` belongs strictly to the authenticated user whose `request.auth.uid == userId` and `request.resource.data.uid == request.auth.uid`.
2. **Verified Account Mandate**: All standard write operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **Path Variable Hardening**: Every document ID path variable (`userId`, `logId`) must match `^[a-zA-Z0-9_\-]+$` with length `<= 128`.
4. **Strict Key & Boundary Enforcement**:
   - No shadow fields are permitted (`keys().hasOnly(...)`).
   - All string fields have explicit `.size() <= MAX` limits.
   - All array fields have explicit `.size() <= MAX` limits.
   - Owner `uid` is immutable across updates (`incoming().uid == existing().uid`).

## 2. The "Dirty Dozen" Payloads (Adversarial Test Vectors)
1. **Unauthenticated Profile Read**: `auth = null`, `GET /users/user_1` -> `PERMISSION_DENIED`
2. **Cross-User Profile Read (PII Leak)**: `auth.uid = 'attacker_1'`, `GET /users/victim_1` -> `PERMISSION_DENIED`
3. **Unverified Email Write**: `auth.uid = 'user_1', email_verified = false`, `SET /users/user_1` -> `PERMISSION_DENIED`
4. **Identity Spoofing on User Create**: `auth.uid = 'user_1'`, `SET /users/user_1` with `{ uid: 'victim_1', displayName: 'Spoof', updatedAt: 100 }` -> `PERMISSION_DENIED`
5. **Shadow Field Injection on User Profile**: `SET /users/user_1` with `{ uid: 'user_1', displayName: 'Alex', updatedAt: 100, isAdmin: true }` -> `PERMISSION_DENIED`
6. **Oversized DisplayName Resource Poisoning**: `SET /users/user_1` with `displayName` length 500 (> 120) -> `PERMISSION_DENIED`
7. **Unbounded MoodHistory Array Flooding**: `SET /users/user_1` with `moodHistory` length 500 (> 365) -> `PERMISSION_DENIED`
8. **Cross-User Chat Hijack**: `auth.uid = 'attacker_1'`, `SET /chats/victim_1` -> `PERMISSION_DENIED`
9. **Immutable UID Mutation on Chat Update**: `UPDATE /chats/user_1` changing `uid` to `'user_2'` -> `PERMISSION_DENIED`
10. **Oversized SanctuaryState Program JSON**: `SET /sanctuary_state/user_1` with `activeProgramJson` > 20,000 chars -> `PERMISSION_DENIED`
11. **Malformed Document ID Poisoning**: `SET /crisis_logs/bad$id!with*chars` -> `PERMISSION_DENIED`
12. **Crisis Log Deletion Attempt**: `DELETE /crisis_logs/user_1_1700000000` -> `PERMISSION_DENIED` (Crisis logs are append-only)
