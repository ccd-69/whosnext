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
  bannerUrl?: string;
  bio?: string;
  status: 'online' | 'away' | 'offline';
  recentGames: import('../shared/types.js').RecentGame[];
  totalGamesPlayed: number;
  friends: string[];
  friendRequests: import('../shared/types.js').FriendRequest[];
  blockedUsers: string[];
  battleRoyaleXP: number;
  unlockedPerks: string[];
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
    friends: [],
    friendRequests: [],
    blockedUsers: [],
    battleRoyaleXP: 0,
    unlockedPerks: [],
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
    friends: [],
    friendRequests: [],
    blockedUsers: [],
    battleRoyaleXP: 0,
    unlockedPerks: [],
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

export async function updateUserStatus(userId: string, status: 'online' | 'away' | 'offline'): Promise<void> {
  const data = await load();
  const user = data.users[userId];
  if (!user) return;
  user.status = status;
  await save(data);
}

export async function addBattleRoyaleXP(userId: string, xp: number): Promise<{ totalXP: number; newPerks: import('../shared/types.js').Perk[] }> {
  const data = await load();
  const user = data.users[userId];
  if (!user) return { totalXP: 0, newPerks: [] };
  user.battleRoyaleXP += xp;
  const newPerks: import('../shared/types.js').Perk[] = [];
  for (const perk of PERK_CATALOG) {
    if (!user.unlockedPerks.includes(perk.id) && user.battleRoyaleXP >= perk.cost) {
      user.unlockedPerks.push(perk.id);
      newPerks.push(perk);
    }
  }
  await save(data);
  return { totalXP: user.battleRoyaleXP, newPerks };
}

export const PERK_CATALOG: import('../shared/types.js').Perk[] = [
  { id: 'modifier_chance_1', name: '+5% Modifier Chance', description: 'White cards have a slightly higher chance to gain a hidden combat modifier.', cost: 50, effect: '+5% hiddenModifier roll' },
  { id: 'starting_health_1', name: '+5 Starting Health', description: 'Begin each Battle Royale match with 5 extra HP.', cost: 100, effect: '+5 maxHealth' },
  { id: 'block_start', name: 'Start with Block', description: 'Begin each match with 3 temporary shield HP.', cost: 150, effect: '+3 shieldHp at start' },
  { id: 'rare_modifier_1', name: '+5% Rare Modifier Chance', description: 'Slightly more likely to roll utility and rare hidden modifiers.', cost: 200, effect: 'Rarity weight shift +5%' },
  { id: 'second_wind_passive', name: 'Second Wind', description: 'The first time you would be eliminated, survive with 1 HP once per match.', cost: 300, effect: '1x death negate per game' },
  { id: 'vampire_touch', name: 'Vampire Touch', description: 'Winning cards heal you for 1 HP per opponent hit.', cost: 400, effect: '+1 heal per target' },
];

export async function getUnlockedPerks(userId: string): Promise<import('../shared/types.js').Perk[]> {
  const data = await load();
  const user = data.users[userId];
  if (!user) return [];
  return PERK_CATALOG.filter((p) => user.unlockedPerks.includes(p.id));
}

export async function sendFriendRequest(fromId: string, targetUsername: string): Promise<{ success: boolean; request?: import('../shared/types.js').FriendRequest; error?: string }> {
  const data = await load();
  const fromUser = data.users[fromId];
  if (!fromUser) return { success: false, error: 'Sender not found.' };

  const key = targetUsername.toLowerCase().trim();
  const toId = data.usernameIndex[key];
  if (!toId) return { success: false, error: 'User not found.' };
  if (toId === fromId) return { success: false, error: 'Cannot friend yourself.' };

  const toUser = data.users[toId];
  if (!toUser) return { success: false, error: 'User not found.' };

  // Check if already friends
  if (fromUser.friends.includes(toId)) return { success: false, error: 'Already friends.' };

  // Check if already blocked
  if (fromUser.blockedUsers.includes(toId)) return { success: false, error: 'You have blocked this user.' };
  if (toUser.blockedUsers.includes(fromId)) return { success: false, error: 'This user has blocked you.' };

  // Check for existing request (either direction)
  const existing = fromUser.friendRequests.find((r) => (r.fromId === fromId && r.toId === toId) || (r.fromId === toId && r.toId === fromId));
  if (existing) {
    if (existing.status === 'pending') return { success: false, error: 'Friend request already pending.' };
    if (existing.status === 'accepted') return { success: false, error: 'Already friends.' };
  }

  const request: import('../shared/types.js').FriendRequest = {
    id: crypto.randomUUID(),
    fromId,
    fromUsername: fromUser.username,
    toId,
    status: 'pending',
    timestamp: Date.now(),
  };

  fromUser.friendRequests.push(request);
  toUser.friendRequests.push(request);
  await save(data);
  return { success: true, request };
}

export async function acceptFriendRequest(userId: string, requestId: string): Promise<{ success: boolean; friendId?: string; error?: string }> {
  const data = await load();
  const user = data.users[userId];
  if (!user) return { success: false, error: 'User not found.' };

  const req = user.friendRequests.find((r) => r.id === requestId && r.toId === userId && r.status === 'pending');
  if (!req) return { success: false, error: 'Request not found.' };

  const fromUser = data.users[req.fromId];
  if (!fromUser) return { success: false, error: 'Sender not found.' };

  req.status = 'accepted';
  // Update the request in sender's list too
  const senderReq = fromUser.friendRequests.find((r) => r.id === requestId);
  if (senderReq) senderReq.status = 'accepted';

  // Add to friends lists if not already
  if (!user.friends.includes(req.fromId)) user.friends.push(req.fromId);
  if (!fromUser.friends.includes(userId)) fromUser.friends.push(userId);

  await save(data);
  return { success: true, friendId: req.fromId };
}

export async function rejectFriendRequest(userId: string, requestId: string): Promise<{ success: boolean; error?: string }> {
  const data = await load();
  const user = data.users[userId];
  if (!user) return { success: false, error: 'User not found.' };

  const req = user.friendRequests.find((r) => r.id === requestId && r.toId === userId && r.status === 'pending');
  if (!req) return { success: false, error: 'Request not found.' };

  const fromUser = data.users[req.fromId];
  req.status = 'rejected';
  if (fromUser) {
    const senderReq = fromUser.friendRequests.find((r) => r.id === requestId);
    if (senderReq) senderReq.status = 'rejected';
  }

  await save(data);
  return { success: true };
}

export async function removeFriend(userId: string, targetUserId: string): Promise<void> {
  const data = await load();
  const user = data.users[userId];
  const target = data.users[targetUserId];
  if (!user || !target) return;

  user.friends = user.friends.filter((id) => id !== targetUserId);
  target.friends = target.friends.filter((id) => id !== userId);

  // Also clean up accepted requests between them
  user.friendRequests = user.friendRequests.filter((r) => !(r.fromId === targetUserId && r.toId === userId) && !(r.fromId === userId && r.toId === targetUserId));
  target.friendRequests = target.friendRequests.filter((r) => !(r.fromId === targetUserId && r.toId === userId) && !(r.fromId === userId && r.toId === targetUserId));

  await save(data);
}

export async function blockUser(userId: string, targetUserId: string): Promise<void> {
  const data = await load();
  const user = data.users[userId];
  if (!user) return;
  if (!user.blockedUsers.includes(targetUserId)) {
    user.blockedUsers.push(targetUserId);
  }
  // Also remove from friends if they were friends
  await removeFriend(userId, targetUserId);
  await save(data);
}

export async function unblockUser(userId: string, targetUserId: string): Promise<void> {
  const data = await load();
  const user = data.users[userId];
  if (!user) return;
  user.blockedUsers = user.blockedUsers.filter((id) => id !== targetUserId);
  await save(data);
}

export async function getFriendUsers(userId: string): Promise<import('../shared/types.js').FriendUser[]> {
  const data = await load();
  const user = data.users[userId];
  if (!user) return [];
  return user.friends.map((fid) => {
    const f = data.users[fid];
    return f ? { userId: f.id, username: f.username, avatarUrl: f.avatarUrl, status: f.status } : null;
  }).filter(Boolean) as import('../shared/types.js').FriendUser[];
}

export async function getPendingFriendRequests(userId: string): Promise<import('../shared/types.js').FriendRequest[]> {
  const data = await load();
  const user = data.users[userId];
  if (!user) return [];
  return user.friendRequests.filter((r) => r.toId === userId && r.status === 'pending');
}

export async function getAllUsers(): Promise<DbUser[]> {
  const data = await load();
  return Object.values(data.users).map((u) => ({ ...u, passwordHash: '' }));
}
