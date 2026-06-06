import { registerUser, getUserByUsername } from './userDb.js';
import { RoomManager } from './roomManager.js';
import type { Server as SocketIOServer } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '../shared/types.js';

export async function seedTestUsers(): Promise<void> {
  for (let i = 1; i <= 8; i++) {
    const username = `testuser${i}`;
    const result = await registerUser(username, 'testpass', undefined);
    if (result.success) {
      console.log('[Seed] Created', username);
    } else if (result.error?.includes('already taken')) {
      console.log('[Seed] Already exists:', username);
    } else {
      console.log('[Seed] Failed to create', username, result.error);
    }
  }
}

export async function simulateGames(
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  gameCount = 20
): Promise<void> {
  const roomManager = new RoomManager(io);

  // Ensure test users exist
  const testUsers: { id: string; username: string }[] = [];
  for (let i = 1; i <= 8; i++) {
    const user = await getUserByUsername(`testuser${i}`);
    if (user) testUsers.push({ id: user.id, username: user.username });
  }
  if (testUsers.length < 3) {
    console.log('[Simulate] Need at least 3 test users. Run seedTestUsers first.');
    return;
  }

  for (let g = 0; g < gameCount; g++) {
    // Pick 3-5 random players
    const shuffled = [...testUsers].sort(() => Math.random() - 0.5);
    const players = shuffled.slice(0, Math.floor(Math.random() * 3) + 3); // 3-5 players

    const host = players[0];
    const room = roomManager.createRoom(
      {
        name: `Simulated Game ${g + 1}`,
        hostName: host.username,
        mode: 'quick-play',
        maxPlayers: 12,
        maxRounds: Math.floor(Math.random() * 8) + 5, // 5-12 rounds
        blankCardsEnabled: false,
        cardPacks: ['base'],
        buffsEnabled: false,
        maxReSubmits: 2,
        userId: host.id,
        username: host.username,
      },
      `sim-socket-${host.id}`
    );

    // Add remaining players
    for (let i = 1; i < players.length; i++) {
      const p = players[i];
      roomManager.joinRoom(room.code, p.username, `sim-socket-${p.id}`, p.id, p.username);
    }

    await roomManager.startGame(room.id);

    // Play rounds until game ends
    let safety = 0;
    while (room.phase !== 'game-over' && safety < 100) {
      safety++;
      if (room.phase === 'playing') {
        // Each non-judge player plays a random card
        for (const p of room.players) {
          if (p.id === room.judgeId) continue;
          if (p.abductionRounds > 0) continue;
          if (p.cards.length === 0) continue;

          const pickCount = room.blackCard?.pickCount || 1;
          const cardsToPlay = p.cards.slice(0, Math.min(pickCount, p.cards.length));
          const cardPlays = cardsToPlay.map((c) => ({ cardId: c.id }));

          roomManager.playCard(room.id, p.id, cardPlays, null);
        }
      } else if (room.phase === 'judging') {
        // Judge picks a random submission
        if (room.submittedCards.length > 0 && room.judgeId) {
          const winnerSub = room.submittedCards[Math.floor(Math.random() * room.submittedCards.length)];
          roomManager.judgePick(room.id, room.judgeId, winnerSub.submissionId);
        }
      } else if (room.phase === 'round-end') {
        // All players ready up
        for (const p of room.players) {
          if (p.isConnected) {
            roomManager.playerReady(room.id, p.id);
          }
        }
      }
    }

    console.log(`[Simulate] Game ${g + 1} finished: ${room.players.map((p) => `${p.name}=${p.score}`).join(', ')}`);
  }

  console.log(`[Simulate] Completed ${gameCount} simulated games.`);
}
