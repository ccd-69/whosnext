// Shared game types used by both server and renderer

export type GameMode = 'quick-play' | 'whos-next' | 'two-votes';
export type GamePhase = 'lobby' | 'dealing' | 'playing' | 'judging' | 'round-end' | 'game-over' | 'waiting' | 'voting' | 'ended' | 'reveal';

export type CardEffectType =
  | 'double_points_win'    // win with this card = +2 points
  | 'point_drain'          // winner of round loses 1 point
  | 'customize_card'       // edit any card text in your hand
  | 'hand_swap'            // 2 random players swap hands
  | 'exodia'               // instant win the entire game
  | 'abduction'            // skip next 2 rounds, return with +cards for 2
  | 'half_hand_discard'    // discard half your hand
  | 'forced_random'        // force another player to submit a random card
  | 'steal_card'           // steal a card from another player
  | 'double_points_hand'   // all your cards award 2x for 1 round
  | 'card_quality_down'    // target draws half cards for 1 round
  | 'first_of_month';      // steals 1 point from top 2 players

export interface CardEffect {
  type: CardEffectType;
}

export interface User {
  id: string;
  username: string;
  role: 'user' | 'dev';
  balance: number;
  unlockedThemes: string[];
  effectCardInventory: string[]; // effect card IDs owned for starting hands
  stats: {
    wins: number;
    earned: number;
    spent: number;
  };
}

export interface Player {
  id: string;
  name: string;
  socketId: string;
  score: number;
  isHost: boolean;
  isConnected: boolean;
  cards: Card[];
  effectCards: Card[];
  submittedCardId?: string;
  blankCardsRemaining: number;
  // Persistent multi-round states
  abductionRounds: number;       // >0 = skip rounds
  analProbeRounds: number;       // >0 = extra cards per round
  doublePointsHandRounds: number;  // >0 = hand cards 2x points
  cardQualityDownRounds: number;   // >0 = draw half cards
  forcedRandomCardId?: string;     // card ID forced to play this round
  reSubmitTokens: number;           // remaining re-submit uses
  reSubmitCooldown: number;         // rounds until re-submit available again
  analProbeReturnRound: number;      // round number when anal probe started; lose cards after +10
  // Currency & session
  currency: number;                  // per-game currency
  totalEarnedThisGame: number;     // total earned this game (for leaderboard tracking)
  sessionId: string;                // persistent session ID for rejoins
  disconnectedAt?: number;        // timestamp when disconnected (for grace period)
  userId?: string;                 // linked user account id (if logged in)
}

export interface Card {
  id: string;
  text: string;
  type: 'black' | 'white';
  pickCount?: number; // for black cards: how many white cards to play
  isBlank?: boolean;  // for white cards: player can type custom text
  effect?: CardEffect; // special effect card
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
}

export interface CustomEmoji {
  id: string;
  name: string;
  shortcodes: string[]; // e.g. [":mycat:"]
  imgUrl: string;
}

export type CardPack = 'base' | 'nsfw' | 'dark' | 'absurd' | 'geek' | 'food' | 'sports' | 'fantasy' | 'music' | 'internet';

export interface Room {
  id: string;
  code: string;     // short room code like "ABCD12"
  name: string;
  mode: GameMode;
  phase: GamePhase;
  players: Player[];
  blackCard?: Card;
  submittedCards: { playerId: string; cards: Card[]; effectCard?: Card; submissionId: string; isReSubmit: boolean }[];
  judgeId?: string;
  round: number;
  maxRounds: number;
  maxPlayers: number;
  winningScore: number;
  blankCardsEnabled: boolean;
  startingCards: number;
  cardPacks: CardPack[];
  buffsEnabled: boolean;
  maxReSubmits: number;
  firstWinnerSubmissionId?: string; // for two-votes mode: stores first submission pick while waiting for second
  createdAt: number;
  updatedAt: number;
  // Intermission / Shop
  readyPlayerIds: string[];
  shopCards: Card[];
  shopStockUsed: boolean;
  effectsUsedThisRound: { playerName: string; effectType: CardEffectType }[];
  eligibleForLeaderboard: boolean;
}

export interface GameState {
  room: Room;
  myPlayerId?: string;
  hand: Card[];
  effectHand: Card[];
  timeLeft?: number;
  shopCards?: Card[]; // convenience for client
}

export interface RoundSummary {
  scores: Record<string, number>;
  effectsUsed: { playerName: string; effectType: CardEffectType }[];
  currencyEarned: Record<string, number>;
}

export interface LeaderboardEntry {
  name: string;
  wins: number;
  earned: number;
  spent: number;
  balance: number;
}

export interface ServerToClientEvents {
  'game-state': (state: GameState) => void;
  'player-joined': (player: Player) => void;
  'player-left': (playerId: string) => void;
  'phase-change': (phase: GamePhase) => void;
  'card-played': (playerId: string) => void;
  'effect-played': (playerName: string, effectType: CardEffectType) => void;
  'hand-changed': (message: string) => void;
  'chat-message': (msg: ChatMessage) => void;
  'chat-history': (messages: ChatMessage[]) => void;
  'custom-emojis': (emojis: CustomEmoji[]) => void;
  'customize-prompt': () => void;
  'judge-picked': (winnerId: string, winningCards: Card[]) => void;
  'round-start': (blackCard: Card, judgeId: string) => void;
  'round-end': (scores: Record<string, number>) => void;
  'round-summary': (summary: RoundSummary) => void;
  'game-over': (finalScores: Record<string, number>, winnerId: string) => void;
  'error': (message: string) => void;
  'notification': (message: string) => void;
  'settings-updated': (settings: Partial<Omit<Room, 'id' | 'code' | 'players' | 'submittedCards' | 'blackCard' | 'judgeId' | 'createdAt' | 'updatedAt'>>) => void;
  'vote-kick-started': (targetId: string, targetName: string, initiatorName: string, timeoutSeconds: number) => void;
  'vote-kick-ended': (targetId: string, targetName: string, success: boolean) => void;
  'vote-end-started': (initiatorName: string, timeoutSeconds: number) => void;
  'vote-end-ended': (success: boolean) => void;
  'report-ack': (message: string) => void;
  'leaderboards-data': (leaderboards: { wins: LeaderboardEntry[]; earned: LeaderboardEntry[]; spent: LeaderboardEntry[] }) => void;
  'auth-success': (user: User) => void;
  'auth-error': (message: string) => void;
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
      startingCards: number;
      cardPacks: CardPack[];
      buffsEnabled: boolean;
      maxReSubmits: number;
    },
    cb: (room: Room) => void
  ) => void;
  'join-room': (code: string, playerName: string, cb: (room: Room | null) => void) => void;
  'start-game': () => void;
  'play-card': (cards: CardPlay[], effectCardId: string | null, cb: (success: boolean) => void) => void;
  'judge-pick': (submissionId: string, cb: (success: boolean) => void) => void;
  'leave-room': () => void;
  'kick-player': (playerId: string) => void;
  'next-round': () => void;
  'set-name': (name: string) => void;
  'send-chat': (text: string) => void;
  'add-custom-emoji': (emoji: CustomEmoji) => void;
  'remove-custom-emoji': (emojiId: string) => void;
  'customize-card': (cardId: string, newText: string) => void;
  'request-state': () => void;
  're-submit': (cardIds: CardPlay[], effectCardId: string | null, cb: (success: boolean) => void) => void;
  'update-settings': (settings: Partial<Omit<Room, 'id' | 'code' | 'players' | 'submittedCards' | 'blackCard' | 'judgeId' | 'createdAt' | 'updatedAt'>>) => void;
  'start-vote-kick': (targetId: string) => void;
  'cast-vote-kick': (targetId: string, vote: boolean) => void;
  'start-vote-end': () => void;
  'cast-vote-end': (vote: boolean) => void;
  'report-player': (targetId: string, reason: string) => void;
  'player-ready': () => void;
  'buy-shop-card': (cardId: string, cb: (success: boolean, remainingCurrency: number) => void) => void;
  'force-next-round': () => void;
  'get-leaderboards': () => void;
  'register': (username: string, password: string, email: string | undefined, cb: (success: boolean, message: string, user?: User) => void) => void;
  'login': (username: string, password: string, cb: (success: boolean, message: string, user?: User) => void) => void;
  'buy-theme': (themeId: string, cb: (success: boolean, remainingBalance: number) => void) => void;
  'buy-effect-card': (cardId: string, cb: (success: boolean, remainingBalance: number) => void) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId: string;
  roomId: string;
}
