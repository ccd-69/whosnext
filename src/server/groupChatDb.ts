import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import type { GroupChat, GroupMessage, GroupMember } from '../shared/types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');

interface StoredGroups {
  groups: Record<string, GroupChat>;
}

let cache: StoredGroups | null = null;

async function ensureDir() {
  try { await mkdir(DATA_DIR, { recursive: true }); } catch { /* exists */ }
}

async function load(): Promise<StoredGroups> {
  if (cache) return cache;
  try {
    const raw = await readFile(GROUPS_FILE, 'utf-8');
    cache = JSON.parse(raw);
  } catch {
    cache = { groups: {} };
  }
  return cache;
}

async function save(data: StoredGroups): Promise<void> {
  cache = data;
  await ensureDir();
  await writeFile(GROUPS_FILE, JSON.stringify(data, null, 2));
}

function stripMessages(group: GroupChat): GroupChat {
  return { ...group, messages: [] };
}

export async function createGroup(name: string, ownerId: string, ownerName: string, ownerAvatarUrl?: string): Promise<GroupChat> {
  const data = await load();
  const id = crypto.randomUUID();
  const group: GroupChat = {
    id,
    name: name.trim().slice(0, 50),
    ownerId,
    members: [
      { userId: ownerId, username: ownerName, avatarUrl: ownerAvatarUrl, role: 'owner' },
    ],
    messages: [],
    createdAt: Date.now(),
  };
  data.groups[id] = group;
  await save(data);
  return group;
}

export async function getGroupById(groupId: string): Promise<GroupChat | null> {
  const data = await load();
  return data.groups[groupId] ?? null;
}

export async function joinGroup(groupId: string, userId: string, username: string, avatarUrl?: string): Promise<GroupChat | null> {
  const data = await load();
  const group = data.groups[groupId];
  if (!group) return null;
  if (group.members.some((m) => m.userId === userId)) return group;
  group.members.push({ userId, username, avatarUrl, role: 'member' });
  await save(data);
  return group;
}

export async function leaveGroup(groupId: string, userId: string): Promise<boolean> {
  const data = await load();
  const group = data.groups[groupId];
  if (!group) return false;
  if (group.ownerId === userId) {
    // Owner leaving deletes the group
    delete data.groups[groupId];
    await save(data);
    return true;
  }
  group.members = group.members.filter((m) => m.userId !== userId);
  await save(data);
  return true;
}

export async function deleteGroup(groupId: string): Promise<boolean> {
  const data = await load();
  if (!data.groups[groupId]) return false;
  delete data.groups[groupId];
  await save(data);
  return true;
}

export async function sendGroupMessage(groupId: string, senderId: string, senderName: string, text: string): Promise<GroupMessage | null> {
  const data = await load();
  const group = data.groups[groupId];
  if (!group) return null;
  const message: GroupMessage = {
    id: crypto.randomUUID(),
    senderId,
    senderName,
    text: text.trim().slice(0, 500),
    timestamp: Date.now(),
  };
  group.messages.push(message);
  if (group.messages.length > 200) {
    group.messages = group.messages.slice(-200);
  }
  await save(data);
  return message;
}

export async function getGroupHistory(groupId: string, limit = 50): Promise<GroupMessage[]> {
  const data = await load();
  const group = data.groups[groupId];
  if (!group) return [];
  return group.messages.slice(-limit);
}

export async function getMyGroups(userId: string): Promise<GroupChat[]> {
  const data = await load();
  return Object.values(data.groups)
    .filter((g) => g.members.some((m) => m.userId === userId))
    .map(stripMessages);
}

export async function promoteMember(groupId: string, targetUserId: string): Promise<boolean> {
  const data = await load();
  const group = data.groups[groupId];
  if (!group) return false;
  const member = group.members.find((m) => m.userId === targetUserId);
  if (!member || member.role !== 'member') return false;
  member.role = 'mod';
  await save(data);
  return true;
}

export async function demoteMod(groupId: string, targetUserId: string): Promise<boolean> {
  const data = await load();
  const group = data.groups[groupId];
  if (!group) return false;
  const member = group.members.find((m) => m.userId === targetUserId);
  if (!member || member.role !== 'mod') return false;
  member.role = 'member';
  await save(data);
  return true;
}

export async function kickFromGroup(groupId: string, targetUserId: string): Promise<boolean> {
  const data = await load();
  const group = data.groups[groupId];
  if (!group) return false;
  group.members = group.members.filter((m) => m.userId !== targetUserId);
  await save(data);
  return true;
}

export async function addUserToGroup(groupId: string, userId: string, username: string, avatarUrl?: string): Promise<boolean> {
  const data = await load();
  const group = data.groups[groupId];
  if (!group) return false;
  if (group.members.some((m) => m.userId === userId)) return false;
  group.members.push({ userId, username, avatarUrl, role: 'member' });
  await save(data);
  return true;
}
