export interface ActiveGame {
  roomCode: string;
  roomId: string;
  playerName: string;
  mode: string;
  sessionId: string;
  lastSeenAt: number;
}

const KEY = 'whosnext_active_games';

export function getActiveGames(): ActiveGame[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setActiveGames(games: ActiveGame[]): void {
  localStorage.setItem(KEY, JSON.stringify(games));
}

export function addActiveGame(game: ActiveGame): void {
  const games = getActiveGames().filter((g) => g.roomCode !== game.roomCode);
  games.unshift(game);
  // Keep only the 3 most recent
  setActiveGames(games.slice(0, 3));
}

export function removeActiveGame(roomCode: string): void {
  setActiveGames(getActiveGames().filter((g) => g.roomCode !== roomCode));
}
