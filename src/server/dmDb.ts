import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DMS_FILE = path.join(DATA_DIR, 'dms.json');

export interface DMMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

interface DMConversation {
  participants: [string, string];
  messages: DMMessage[];
}

interface StoredDMs {
  conversations: Record<string, DMConversation>;
}

let cache: StoredDMs | null = null;

async function ensureDir() {
  try { await mkdir(DATA_DIR, { recursive: true }); } catch { /* exists */ }
}

async function load(): Promise<StoredDMs> {
  if (cache) return cache;
  try {
    const raw = await readFile(DMS_FILE, 'utf-8');
    cache = JSON.parse(raw);
  } catch {
    cache = { conversations: {} };
  }
  return cache;
}

async function save(data: StoredDMs): Promise<void> {
  cache = data;
  await ensureDir();
  await writeFile(DMS_FILE, JSON.stringify(data, null, 2));
}

function getKey(userIdA: string, userIdB: string): string {
  return [userIdA, userIdB].sort().join('|');
}

export async function sendDM(fromId: string, toId: string, text: string): Promise<DMMessage> {
  const data = await load();
  const key = getKey(fromId, toId);
  if (!data.conversations[key]) {
    data.conversations[key] = { participants: [fromId, toId].sort() as [string, string], messages: [] };
  }
  const message: DMMessage = {
    id: crypto.randomUUID(),
    senderId: fromId,
    text: text.trim().slice(0, 500),
    timestamp: Date.now(),
  };
  data.conversations[key].messages.push(message);
  if (data.conversations[key].messages.length > 200) {
    data.conversations[key].messages = data.conversations[key].messages.slice(-200);
  }
  await save(data);
  return message;
}

export async function getDMHistory(userIdA: string, userIdB: string, limit = 50): Promise<DMMessage[]> {
  const data = await load();
  const key = getKey(userIdA, userIdB);
  const conv = data.conversations[key];
  if (!conv) return [];
  return conv.messages.slice(-limit);
}
