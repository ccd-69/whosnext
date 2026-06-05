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
  await writeFile(DATA_FILE, JSON.stringify({ entries: data, version: 1 }, null, 2));
}

export async function recordGameResults(
  players: { name: string; score: number; currency: number; totalEarnedThisGame: number }[],
  winnerId: string,
  playerIdMap: Record<string, string>
): Promise<void> {
  const data = await load();
  for (const p of players) {
    const key = p.name;
    if (!data[key]) {
      data[key] = { name: p.name, wins: 0, earned: 0, spent: 0, balance: 0 };
    }
    // Track earnings (total earned this game)
    data[key].earned += p.totalEarnedThisGame;
    // Convert leftover currency at 25% to lifetime balance
    if (p.currency > 0) {
      const converted = Math.round(p.currency * 0.25 * 100) / 100;
      data[key].balance = Math.round((data[key].balance + converted) * 100) / 100;
    }
    // Track wins
    if (playerIdMap[winnerId] === p.name) {
      data[key].wins += 1;
    }
  }
  await save(data);
}

export async function recordSpend(name: string, amount: number): Promise<void> {
  const data = await load();
  if (!data[name]) {
    data[name] = { name, wins: 0, earned: 0, spent: 0, balance: 0 };
  }
  data[name].spent = Math.round((data[name].spent + amount) * 100) / 100;
  data[name].balance = Math.round((data[name].balance - amount) * 100) / 100;
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

export async function getPlayerBalance(name: string): Promise<number> {
  const data = await load();
  return data[name]?.balance ?? 0;
}
