// Shared game types used by both server and renderer

export interface Player {
  id: string;
  name: string;
  socketId: string;
  score: number;
  isHost: boolean;
  isConnected: boolean;
  cards: Card[];
  submittedCardId?: string;
  blankCardsRemaining: number;
}

export interface Card {
  id: string;
  text: string;
  type: 'black' | 'white';
  pickCount?: number; // for black cards: how many white cards to play
  isBlank?: boolean;  // for white cards: player can type custom text
}

export type CardPack = 'base' | 'nsfw' | 'dark' | 'absurd';

export interface Room {
  id: string;
  code: string;     // short room code like "ABCD12"
  name: string;
  mode: GameMode;
  phase: GamePhase;
  players: Player[];
  blackCard?: Card;
  submittedCards: { playerId: string; cards: Card[] }[];
  judgeId?: string;
  round: number;
  maxRounds: number;
  maxPlayers: number;
  winningScore: number;
  blankCardsEnabled: boolean;
  cardPacks: CardPack[];
  createdAt: number;
  updatedAt: number;
}

export interface GameState {
  room: Room;
  myPlayerId?: string;
  hand: Card[];
  timeLeft?: number;
}

export interface ServerToClientEvents {
  'game-state': (state: GameState) => void;
  'player-joined': (player: Player) => void;
  'player-left': (playerId: string) => void;
  'phase-change': (phase: GamePhase) => void;
  'card-played': (playerId: string) => void;
  'judge-picked': (winnerId: string, winningCards: Card[]) => void;
  'round-start': (blackCard: Card, judgeId: string) => void;
  'round-end': (scores: Record<string, number>) => void;
  'game-over': (finalScores: Record<string, number>, winnerId: string) => void;
  'error': (message: string) => void;
  'notification': (message: string) => void;
}

export interface CardPlay {
  cardId: string;
  customText?: string;
}

export interface ClientToServerEvents {
  'create-room': (
    opts: {
      name: string;
      hostName: string;
      mode: GameMode;
      maxPlayers: number;
      maxRounds: number;
      blankCardsEnabled: boolean;
      cardPacks: CardPack[];
    },
    cb: (room: Room) => void
  ) => void;
  'join-room': (code: string, playerName: string, cb: (room: Room | null) => void) => void;
  'start-game': () => void;
  'play-card': (cards: CardPlay[], cb: (success: boolean) => void) => void;
  'judge-pick': (playerId: string, cb: (success: boolean) => void) => void;
  'leave-room': () => void;
  'kick-player': (playerId: string) => void;
  'next-round': () => void;
  'set-name': (name: string) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId: string;
  roomId: string;
}
