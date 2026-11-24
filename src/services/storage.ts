import { ChatMessage, UserProfile } from '../utils/types';

const DB_NAME = 'neuralminds_db';
const DB_VERSION = 2;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('chats')) {
        db.createObjectStore('chats', { keyPath: 'sessionId' });
      }
      if (!db.objectStoreNames.contains('profiles')) {
        db.createObjectStore('profiles', { keyPath: 'sessionId' });
      }
    };
  });
}

// ── SESSION MANAGEMENT ──
export interface LocalSession {
  id: string;
  name: string;
  email?: string;
  photoURL?: string;
  provider: 'google' | 'local';
  createdAt: number;
  lastActive: number;
}

export async function getActiveSession(): Promise<LocalSession | null> {
  const activeId = localStorage.getItem('neuralminds_active_session');
  if (!activeId) return null;
  try {
    const db = await openDB();
    const tx = db.transaction('sessions', 'readonly');
    return new Promise((resolve) => {
      const req = tx.objectStore('sessions').get(activeId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

export async function createLocalSession(name: string): Promise<LocalSession> {
  const session: LocalSession = {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    name: name || 'Friend', provider: 'local',
    createdAt: Date.now(), lastActive: Date.now(),
  };
  try {
    const db = await openDB();
    const tx = db.transaction('sessions', 'readwrite');
    tx.objectStore('sessions').put(session);
  } catch {}
  localStorage.setItem('neuralminds_active_session', session.id);
  return session;
}

export async function createGoogleSession(user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }): Promise<LocalSession> {
  const session: LocalSession = {
    id: `google_${user.uid}`,
    name: user.displayName || 'Friend',
    email: user.email || undefined,
    photoURL: user.photoURL || undefined,
    provider: 'google',
    createdAt: Date.now(), lastActive: Date.now(),
  };
  try {
    const db = await openDB();
    const tx = db.transaction('sessions', 'readwrite');
    tx.objectStore('sessions').put(session);
  } catch {}
  localStorage.setItem('neuralminds_active_session', session.id);
  return session;
}

export async function getAllSessions(): Promise<LocalSession[]> {
  try {
    const db = await openDB();
    const tx = db.transaction('sessions', 'readonly');
    return new Promise((resolve) => {
      const req = tx.objectStore('sessions').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch { return []; }
}

export function clearActiveSession(): void {
  localStorage.removeItem('neuralminds_active_session');
}

export async function updateSession(session: LocalSession): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('sessions', 'readwrite');
    tx.objectStore('sessions').put(session);
  } catch {}
  localStorage.setItem('neuralminds_active_session', session.id);
}

// ── CHAT HISTORY ──
export async function saveLocalChatHistory(sessionId: string, messages: ChatMessage[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('chats', 'readwrite');
    tx.objectStore('chats').put({ sessionId, messages: messages.slice(-500), updatedAt: Date.now() });
  } catch {}
}

export async function loadLocalChatHistory(sessionId: string): Promise<ChatMessage[]> {
  try {
    const db = await openDB();
    const tx = db.transaction('chats', 'readonly');
    return new Promise((resolve) => {
      const req = tx.objectStore('chats').get(sessionId);
      req.onsuccess = () => resolve(req.result?.messages || []);
      req.onerror = () => resolve([]);
    });
  } catch { return []; }
}

// ── PROFILE ──
export async function saveLocalProfile(sessionId: string, profile: Partial<UserProfile>): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction('profiles', 'readwrite');
    tx.objectStore('profiles').put({ sessionId, ...profile, updatedAt: Date.now() });
  } catch {}
}

export async function loadLocalProfile(sessionId: string): Promise<Partial<UserProfile> | null> {
  try {
    const db = await openDB();
    const tx = db.transaction('profiles', 'readonly');
    return new Promise((resolve) => {
      const req = tx.objectStore('profiles').get(sessionId);
      req.onsuccess = () => {
        if (req.result) {
          const { sessionId: _s, updatedAt: _u, ...rest } = req.result;
          resolve(rest);
        } else resolve(null);
      };
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

// ── DOWNLOAD HELPER ──
// Uses Blob + createObjectURL (the standard, reliable approach)
function downloadFile(content: string, filename: string, mime: string): boolean {
  try {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // Delay revoke so the browser has time to start the download
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
    return true;
  } catch {
    // Fallback: open content in new tab so user can copy/save manually
    try {
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`<pre style="white-space:pre-wrap;font-family:monospace;padding:20px;">${content.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>`);
        w.document.title = filename;
      }
    } catch { /* last resort — nothing we can do */ }
    return false;
  }
}

// ── EXPORT: JSON ──
export function exportChatAsJSON(messages: ChatMessage[], userName: string): boolean {
  if (messages.length === 0) return false;
  const data = {
    exported: new Date().toISOString(),
    user: userName,
    messageCount: messages.length,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
      time: new Date(m.timestamp).toISOString(),
      emotion: m.emotion || undefined,
    })),
  };
  return downloadFile(JSON.stringify(data, null, 2), `neuralminds-chat-${Date.now()}.json`, 'application/json');
}

// ── EXPORT: TXT ──
export function exportChatAsTXT(messages: ChatMessage[], userName: string): boolean {
  if (messages.length === 0) return false;
  const lines = [
    'NeuralMinds Chat Export',
    `User: ${userName}`,
    `Exported: ${new Date().toLocaleString()}`,
    `Messages: ${messages.length}`,
    '─'.repeat(40),
    '',
  ];
  for (const m of messages) {
    const time = new Date(m.timestamp).toLocaleString();
    const sender = m.role === 'user' ? userName : 'Mira';
    lines.push(`[${time}] ${sender}:`);
    lines.push(m.content);
    if (m.emotion) lines.push(`  (mood: ${m.emotion})`);
    lines.push('');
  }
  return downloadFile(lines.join('\n'), `neuralminds-chat-${Date.now()}.txt`, 'text/plain');
}

// ── GMAIL ──
function buildEmailBody(messages: ChatMessage[], userName: string, maxChars: number = 0): string {
  const lines: string[] = [];
  lines.push('NeuralMinds Chat Backup');
  lines.push(`Date: ${new Date().toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
  lines.push(`User: ${userName}`);
  lines.push(`Messages: ${messages.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const m of messages) {
    const time = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = new Date(m.timestamp).toLocaleDateString('en', { month: 'short', day: 'numeric' });
    const sender = m.role === 'user' ? userName : 'Mira';
    lines.push(`[${date} ${time}] ${sender}:`);
    lines.push(m.content);
    if (m.emotion && m.role === 'user') lines.push(`  (mood: ${m.emotion})`);
    lines.push('');

    // Check length limit for Gmail URL
    if (maxChars > 0) {
      const currentLen = lines.join('\n').length;
      if (currentLen > maxChars) {
        lines.push(`... and ${messages.length} messages total.`);
        lines.push('Download the full backup from the app for the complete history.');
        break;
      }
    }
  }

  lines.push('---');
  lines.push('Sent from NeuralMinds');
  return lines.join('\n');
}

// Opens Gmail compose in current tab (not popup — avoids popup blockers)
export function sendChatToGmail(messages: ChatMessage[], userName: string, userEmail?: string): void {
  if (messages.length === 0) return;
  const subject = `NeuralMinds Chat Backup - ${new Date().toLocaleDateString()}`;
  // Gmail URLs have a practical limit of ~7500 chars for the body param
  const body = buildEmailBody(messages, userName, 5000);
  const to = userEmail || '';

  // Use window.location instead of window.open to avoid popup blockers
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  // Open in current tab's context using a link click
  const a = document.createElement('a');
  a.href = gmailUrl;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => document.body.removeChild(a), 100);
}

// ── GOOGLE DRIVE ──
// Downloads file + opens Drive (both via link clicks to avoid popup blockers)
export function saveToGoogleDrive(messages: ChatMessage[], userName: string): void {
  if (messages.length === 0) return;
  const data = {
    app: 'NeuralMinds',
    exported: new Date().toISOString(),
    user: userName,
    messageCount: messages.length,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
      time: new Date(m.timestamp).toISOString(),
      emotion: m.emotion || undefined,
    })),
  };

  // Step 1: Download the file
  downloadFile(
    JSON.stringify(data, null, 2),
    `neuralminds-backup-${new Date().toISOString().slice(0, 10)}.json`,
    'application/json'
  );

  // Step 2: Open Drive via link click (avoids popup blocker)
  setTimeout(() => {
    const a = document.createElement('a');
    a.href = 'https://drive.google.com/drive/my-drive';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 100);
  }, 300);
}
