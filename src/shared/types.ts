// Shared game types used by both server and renderer

export type CardEffectType =
  | 'double_points_win'    // win with this card = +2 points
  | 'point_drain'          // winner of round loses 1 point
  | 'customize_card'       // edit any card text in your hand
  | 'hand_swap'            // 2 random players swap hands
  | 'exodia'               // instant win the entire game
  | 'abduction'            // skip next 2 rounds, return with +cards for 2
  | 'auto_draw'            // passive: at 1 card left, draw 3
  | 'half_hand_discard'    // discard half your hand
  | 'forced_random'        // force another player to submit a random card
  | 'steal_card'           // steal a card from another player
  | 'double_points_hand'   // all your cards award 2x for 1 round
  | 'card_quality_down';   // target draws half cards for 1 round

export interface CardEffect {
  type: CardEffectType;
}

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
  // Persistent multi-round states
  abductionRounds: number;       // >0 = skip rounds
  analProbeRounds: number;       // >0 = extra cards per round
  doublePointsHandRounds: number;  // >0 = hand cards 2x points
  cardQualityDownRounds: number;   // >0 = draw half cards
  autoDrawEnabled: boolean;      // at 1 card, auto draw 3
  forcedRandomCardId?: string;     // card ID forced to play this round
}

export interface Card {
  id: string;
  text: string;
  type: 'black' | 'white';
  pickCount?: number; // for black cards: how many white cards to play
  isBlank?: boolean;  // for white cards: player can type custom text
  effect?: CardEffect; // special effect card
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
  buffsEnabled: boolean;
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
      buffsEnabled: boolean;
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
