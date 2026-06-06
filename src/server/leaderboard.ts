import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import type { LeaderboardEntry } from '../shared/types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'leaderboard.json');

interface StoredData {
  entries: Record<string, LeaderboardEntry>;
  version: number;
}

let cache: Record<string, LeaderboardEntry> | null = null;

async function ensureDir() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch {
    // already exists
  }
}

async function load(): Promise<Record<string, LeaderboardEntry>> {
  if (cache) return cache;
  try {
    const raw = await readFile(DATA_FILE, 'utf-8');
    const data: StoredData = JSON.parse(raw);
    cache = data.entries || {};
  } catch {
    cache = {};
  }
  return cache;
}

async function save(data: Record<string, LeaderboardEntry>): Promise<void> {
  cache = data;
  await ensureDir();
  await writeFile(DATA_FILE, JSON.stringify({ entries: data, version: 2 }, null, 2));
}

export async function recordGameResults(
  players: { userId?: string; name: string; score: number; currency: number; totalEarnedThisGame: number }[],
  winnerUserId?: string
): Promise<void> {
  const data = await load();
  for (const p of players) {
    if (!p.userId) continue; // skip guests
    const key = p.userId;
    if (!data[key]) {
      data[key] = { userId: p.userId, username: p.name, wins: 0, earned: 0, spent: 0, balance: 0 };
    }
    data[key].earned += p.totalEarnedThisGame;
    if (p.currency > 0) {
      const converted = Math.round(p.currency * 0.25 * 100) / 100;
      data[key].balance = Math.round((data[key].balance + converted) * 100) / 100;
    }
    if (p.userId === winnerUserId) {
      data[key].wins += 1;
    }
  }
  await save(data);
}

export async function recordSpend(userId: string | undefined, username: string, amount: number): Promise<void> {
  if (!userId) return;
  const data = await load();
  if (!data[userId]) {
    data[userId] = { userId, username, wins: 0, earned: 0, spent: 0, balance: 0 };
  }
  data[userId].spent = Math.round((data[userId].spent + amount) * 100) / 100;
  data[userId].balance = Math.round((data[userId].balance - amount) * 100) / 100;
  await save(data);
}

export async function getLeaderboards(): Promise<{
  wins: LeaderboardEntry[];
  earned: LeaderboardEntry[];
  spent: LeaderboardEntry[];
}> {
  const data = await load();
  const values = Object.values(data);
  return {
    wins: [...values].sort((a, b) => b.wins - a.wins).slice(0, 50),
    earned: [...values].sort((a, b) => b.earned - a.earned).slice(0, 50),
    spent: [...values].sort((a, b) => b.spent - a.spent).slice(0, 50),
  };
}

export async function getPlayerBalance(userId: string): Promise<number> {
  const data = await load();
  return data[userId]?.balance ?? 0;
}
