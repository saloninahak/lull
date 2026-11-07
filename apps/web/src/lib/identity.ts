import { cleanName } from '@lull/game-logic';

/**
 * who you are, without an account (readme 5.2): a random id that stays on
 * this device, so a refresh puts you back in your seat, and the name you
 * typed last time. localStorage only.
 */

const ID_KEY = 'lull:id';
const NAME_KEY = 'lull:name';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode: it still works for this visit
  }
}

let memoryId: string | null = null;

/**
 * 128 random bits as hex. getRandomValues works on a plain http address on
 * the office network; randomUUID only exists on https or localhost.
 */
function randomId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function playerId(): string {
  const saved = read(ID_KEY);
  if (saved && /^[A-Za-z0-9_-]{8,64}$/.test(saved)) return saved;
  if (!memoryId) {
    memoryId = randomId();
    write(ID_KEY, memoryId);
  }
  return memoryId;
}

export function savedName(): string {
  return read(NAME_KEY) ?? '';
}

/** keeps a cleaned name for next time and returns it, or null if it's empty */
export function saveName(raw: string): string | null {
  const name = cleanName(raw);
  if (name) write(NAME_KEY, name);
  return name;
}
