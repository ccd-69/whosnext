import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

export interface DbUser {
  id: string;
  username: string;
  passwordHash: string;
  email?: string;
  role: 'user' | 'dev';
  balance: number;
  unlockedThemes: string[];
  effectCardInventory: string[];
  stats: {
    wins: number;
    earned: number;
    spent: number;
  };
  avatarUrl?: string;
  bio?: string;
  status: 'online' | 'away' | 'offline';
  recentGames: import('../shared/types.js').RecentGame[];
  totalGamesPlayed: number;
  createdAt: number;
}

interface StoredUsers {
  users: Record<string, DbUser>; // key = userId
  usernameIndex: Record<string, string>; // key = username (lowercase), value = userId
}

let cache: StoredUsers | null = null;

async function ensureDir() {
  try { await mkdir(DATA_DIR, { recursive: true }); } catch { /* exists */ }
}

async function load(): Promise<StoredUsers> {
  if (cache) return cache;
  try {
    const raw = await readFile(USERS_FILE, 'utf-8');
    cache = JSON.parse(raw);
  } catch {
    cache = { users: {}, usernameIndex: {} };
  }
  return cache;
}

async function save(data: StoredUsers): Promise<void> {
  cache = data;
  await ensureDir();
  await writeFile(USERS_FILE, JSON.stringify(data, null, 2));
}

export async function registerUser(username: string, password: string, email?: string): Promise<{ success: boolean; user?: DbUser; error?: string }> {
  const data = await load();
  const key = username.toLowerCase().trim();
  if (data.usernameIndex[key]) {
    return { success: false, error: 'Username already taken.' };
  }
  if (username.length < 3 || username.length > 20) {
    return { success: false, error: 'Username must be 3–20 characters.' };
  }
  if (password.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters.' };
  }
  const userId = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);
  const user: DbUser = {
    id: userId,
    username: username.trim(),
    passwordHash,
    email: email?.trim() || undefined,
    role: 'user',
    balance: 0,
    unlockedThemes: [],
    effectCardInventory: [],
    stats: { wins: 0, earned: 0, spent: 0 },
    status: 'offline',
    recentGames: [],
    totalGamesPlayed: 0,
    createdAt: Date.now(),
  };
  data.users[userId] = user;
  data.usernameIndex[key] = userId;
  await save(data);
  return { success: true, user: { ...user, passwordHash: '' } };
}

export async function loginUser(username: string, password: string): Promise<{ success: boolean; user?: DbUser; error?: string }> {
  const data = await load();
  const key = username.toLowerCase().trim();
  const userId = data.usernameIndex[key];
  if (!userId) {
    return { success: false, error: 'Invalid username or password.' };
  }
  const user = data.users[userId];
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return { success: false, error: 'Invalid username or password.' };
  }
  return { success: true, user: { ...user, passwordHash: '' } };
}

export async function getUserById(userId: string): Promise<DbUser | null> {
  const data = await load();
  const user = data.users[userId];
  return user ? { ...user, passwordHash: '' } : null;
}

export async function updateUserBalance(userId: string, delta: number): Promise<number | null> {
  const data = await load();
  const user = data.users[userId];
  if (!user) return null;
  user.balance = Math.round((user.balance + delta) * 100) / 100;
  await save(data);
  return user.balance;
}

export async function spendUserBalance(userId: string, amount: number): Promise<{ success: boolean; remaining: number }> {
  const data = await load();
  const user = data.users[userId];
  if (!user) return { success: false, remaining: 0 };
  if (user.role === 'dev') return { success: true, remaining: user.balance };
  if (user.balance < amount) return { success: false, remaining: user.balance };
  user.balance = Math.round((user.balance - amount) * 100) / 100;
  user.stats.spent = Math.round((user.stats.spent + amount) * 100) / 100;
  await save(data);
  return { success: true, remaining: user.balance };
}

export async function unlockUserTheme(userId: string, themeId: string): Promise<boolean> {
  const data = await load();
  const user = data.users[userId];
  if (!user) return false;
  if (!user.unlockedThemes.includes(themeId)) {
    user.unlockedThemes.push(themeId);
    await save(data);
  }
  return true;
}

export async function recordUserStats(userId: string, wins: number, earned: number): Promise<void> {
  const data = await load();
  const user = data.users[userId];
  if (!user) return;
  user.stats.wins += wins;
  user.stats.earned = Math.round((user.stats.earned + earned) * 100) / 100;
  user.totalGamesPlayed += 1;
  await save(data);
}

export async function addEffectCardToInventory(userId: string, cardId: string): Promise<void> {
  const data = await load();
  const user = data.users[userId];
  if (!user) return;
  user.effectCardInventory.push(cardId);
  await save(data);
}

export async function removeEffectCardFromInventory(userId: string, cardId: string): Promise<void> {
  const data = await load();
  const user = data.users[userId];
  if (!user) return;
  const idx = user.effectCardInventory.indexOf(cardId);
  if (idx !== -1) user.effectCardInventory.splice(idx, 1);
  await save(data);
}

export async function seedDevUserIfEmpty(): Promise<void> {
  const data = await load();
  if (Object.keys(data.users).length > 0) return;
  const userId = 'dev-ccd-69';
  const passwordHash = await bcrypt.hash('devpass', 10);
  const user: DbUser = {
    id: userId,
    username: 'ccd',
    passwordHash,
    email: 'dev@whosnext.local',
    role: 'dev',
    balance: 999999999,
    unlockedThemes: ['cyber', 'arcade', 'matrix', 'aurora', 'space', 'party', 'spooky', 'ember', 'glitch', 'holo', 'synthwave', 'quantum', 'nebula', 'midnight', 'gold'],
    effectCardInventory: [],
    stats: { wins: 0, earned: 0, spent: 0 },
    createdAt: Date.now(),
  };
  data.users[userId] = user;
  data.usernameIndex['ccd'] = userId;
  await save(data);
}

export async function updateProfile(userId: string, bio: string, avatarUrl: string): Promise<DbUser | null> {
  const data = await load();
  const user = data.users[userId];
  if (!user) return null;
  user.bio = bio.trim().slice(0, 128) || undefined;
  user.avatarUrl = avatarUrl.trim() || undefined;
  await save(data);
  return { ...user, passwordHash: '' };
}

export async function getProfileByUsername(username: string): Promise<DbUser | null> {
  const data = await load();
  const key = username.toLowerCase().trim();
  const userId = data.usernameIndex[key];
  if (!userId) return null;
  const user = data.users[userId];
  return user ? { ...user, passwordHash: '', email: undefined } : null;
}

export async function addRecentGame(userId: string, game: import('../shared/types.js').RecentGame): Promise<void> {
  const data = await load();
  const user = data.users[userId];
  if (!user) return;
  user.recentGames.unshift(game);
  if (user.recentGames.length > 20) user.recentGames.length = 20;
  user.totalGamesPlayed += 1;
  await save(data);
}

export async function getUserByUsername(username: string): Promise<DbUser | null> {
  const data = await load();
  const key = username.toLowerCase().trim();
  const userId = data.usernameIndex[key];
  if (!userId) return null;
  const user = data.users[userId];
  return user ? { ...user, passwordHash: '' } : null;
}

export async function getAllUsers(): Promise<DbUser[]> {
  const data = await load();
  return Object.values(data.users).map((u) => ({ ...u, passwordHash: '' }));
}
