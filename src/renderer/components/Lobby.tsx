import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket.js';
import { ArrowLeft, Copy, Users, Play, DoorOpen, Settings, Skull, Laugh, Flame, Gamepad2, UtensilsCrossed, Dumbbell, Sword, Music, Globe } from 'lucide-react';
import { playClick, playChime, playJoin } from '../audio/sound.js';
import type { Room, GameMode, Player, GameState, CardPack, Card } from '../../shared/types.js';
import { EFFECT_CARDS } from '../../shared/deck.js';
import { addActiveGame } from '../utils/activeGames.js';

export default function Lobby() {
  const { mode } = useParams<{ mode: GameMode }>();
  const navigate = useNavigate();
  const { emit, on, connected } = useSocket();
  const [step, setStep] = useState<'form' | 'host' | 'join'>('form');
  const [playerName, setPlayerName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(12);
  const [maxRounds, setMaxRounds] = useState(mode === 'quick-play' ? 10 : mode === 'two-votes' ? 15 : mode === 'battle-royale' ? 20 : 20);
  const [startingCards, setStartingCards] = useState(10);
  const [blankCardsEnabled, setBlankCardsEnabled] = useState(false);
  const [cardPacks, setCardPacks] = useState<CardPack[]>(['base']);
  const [buffsEnabled, setBuffsEnabled] = useState(false);
  const [maxReSubmits, setMaxReSubmits] = useState(2);
  const [showSettings, setShowSettings] = useState(false);
  const [effectInventory, setEffectInventory] = useState<string[]>([]);
  const [selectedEffectCards, setSelectedEffectCards] = useState<string[]>([]);

  const [connTimeout, setConnTimeout] = useState(false);

  const isHost = step === 'host';

  const uniqueEffectCards = EFFECT_CARDS.reduce<Card[]>((acc, card) => {
    if (card.effect && !acc.find((c) => c.effect?.type === card.effect?.type)) {
      acc.push(card);
    }
    return acc;
  }, []);

  // Connection timeout: show error if socket doesn't connect within 8s
  useEffect(() => {
    if (connected) {
      setConnTimeout(false);
      return;
    }
    const t = setTimeout(() => setConnTimeout(true), 8000);
    return () => clearTimeout(t);
  }, [connected]);

  useEffect(() => {
    if (!connected) return;
    // Load user's effect card inventory
    emit('get-own-profile', (u: import('../../shared/types.js').User | null) => {
      if (u) {
        setEffectInventory(u.effectCardInventory || []);
      }
    });
  }, [connected, emit]);

  // Always listen for game-state (handles rejoin after refresh)
  useEffect(() => {
    if (!connected) return;
    const unsubState = on('game-state', (state: GameState) => {
      setRoom(state.room);
      const me = state.room.players.find((p) => p.id === state.myPlayerId);
      if (me) {
        setSelectedEffectCards(me.selectedEffectCardIds || []);
        // If we were rejoined by the server while on the form, restore the view
        if (step === 'form') {
          if (me.isHost) {
            setStep('host');
          } else {
            // Non-host should not be on lobby page; go to game
            navigate(`/game/${state.room.code}`);
          }
        }
      }
    });
    const unsubJoin = on('player-joined', () => {
      playJoin();
    });
    return () => {
      unsubState();
      unsubJoin();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, step, on]);

  function handleCreateRoom() {
    if (!playerName.trim() || !roomName.trim()) return;
    setError('');
    playClick();
    emit('create-room', {
      name: roomName,
      hostName: playerName,
      mode: mode || 'quick-play',
      maxPlayers,
      maxRounds,
      blankCardsEnabled,
      startingCards,
      cardPacks,
      buffsEnabled,
      maxReSubmits,
    }, (newRoom: Room) => {
      setRoom(newRoom);
      setStep('host');
      const me = newRoom.players[0];
      addActiveGame({
        roomCode: newRoom.code,
        roomId: newRoom.id,
        playerName: me.name,
        mode: newRoom.mode,
        sessionId: me.sessionId,
        lastSeenAt: Date.now(),
      });
    });
  }

  function handleJoinRoom() {
    if (!playerName.trim() || !roomCode.trim()) return;
    setError('');
    playClick();
    emit('join-room', roomCode.toUpperCase(), playerName, (joinedRoom: Room | null) => {
      if (joinedRoom) {
        setRoom(joinedRoom);
        navigate(`/game/${joinedRoom.code}`);
        const me = joinedRoom.players[joinedRoom.players.length - 1];
        addActiveGame({
          roomCode: joinedRoom.code,
          roomId: joinedRoom.id,
          playerName: me.name,
          mode: joinedRoom.mode,
          sessionId: me.sessionId,
          lastSeenAt: Date.now(),
        });
      } else {
        setError('Room not found or full. Check the code and try again.');
      }
    });
  }

  function handleStartGame() {
    playChime();
    emit('start-game');
    if (room) {
      navigate(`/game/${room.code}`);
    }
  }

  function toggleEffectCard(cardId: string) {
    playClick();
    setSelectedEffectCards((prev) => {
      let next: string[];
      if (prev.includes(cardId)) {
        next = prev.filter((id) => id !== cardId);
      } else if (prev.length < 2) {
        next = [...prev, cardId];
      } else {
        return prev; // max 2
      }
      emit('set-effect-cards', next, (success: boolean) => {
        if (!success) {
          // Revert on failure
          setSelectedEffectCards(prev);
        }
      });
      return next;
    });
  }

  function copyRoomCode() {
    if (room?.code) {
      navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!connected) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-xs text-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60">Connecting to game server...</p>
          {connTimeout && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <p className="font-semibold mb-1">Connection timed out</p>
              <p className="text-white/60">The server may be restarting or your connection is blocked. Try refreshing the page.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isHost && room) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 overflow-auto py-4">
        <div className="glass-card p-8 max-w-md w-full flex flex-col gap-6 animate-slide-up">
          <button
            onClick={() => {
              emit('leave-room');
              setStep('form');
              setRoom(null);
            }}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors self-start"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <div className="text-center">
            <h2 className="text-2xl font-bold mb-1">{room.name}</h2>
            <p className="text-white/60">Room Code</p>
          </div>

          <button
            onClick={copyRoomCode}
            className="flex items-center justify-center gap-3 bg-surface-light border border-border rounded-xl px-6 py-4 hover:border-accent/50 transition-all group"
          >
            <span className="text-3xl font-black tracking-[0.2em] text-accent">{room.code}</span>
            <Copy size={20} className="text-white/40 group-hover:text-white transition-colors" />
            {copied && <span className="text-accent text-sm">Copied!</span>}
          </button>

          <div className="flex items-center gap-3 text-white/60">
            <Users size={18} />
            <span>{room.players.length} / {room.maxPlayers} players</span>
          </div>

          {/* Customization Info */}
          <div className="glass-card p-3 flex flex-col gap-2">
            <div className="text-xs text-white/40 font-bold uppercase tracking-wider">Settings</div>
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-light text-white/70">Rounds: {room.maxRounds}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-light text-white/70">Hand: {room.startingCards}</span>
              {room.blankCardsEnabled && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">Blank Cards</span>}
              {room.buffsEnabled && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">Buffs</span>}
              {room.maxReSubmits !== 2 && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">Re-Submits: {room.maxReSubmits}</span>}
              {room.cardPacks.map((pack) => (
                <span key={pack} className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent capitalize">{pack}</span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {room.players.map((p: Player) => (
              <div key={p.id} className="flex items-center gap-3 bg-surface-light rounded-lg px-4 py-2">
                <div className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="font-semibold">{p.name} {p.isHost && <span className="text-accent text-xs">(Host)</span>}</span>
              </div>
            ))}
          </div>

          {/* Effect Card Selection */}
          <div className="glass-card p-3 flex flex-col gap-2">
            <div className="text-xs text-white/40 font-bold uppercase tracking-wider">Effect Cards ({selectedEffectCards.length}/2)</div>
            {effectInventory.length === 0 ? (
              <p className="text-white/40 text-xs text-center py-2">No effect cards in inventory</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {uniqueEffectCards
                  .filter((card) => effectInventory.includes(card.id))
                  .map((card) => {
                    const ownedCount = effectInventory.filter((id) => id === card.id).length;
                    const isSelected = selectedEffectCards.includes(card.id);
                    return (
                      <button
                        key={card.id}
                        onClick={() => toggleEffectCard(card.id)}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs transition-all border ${
                          isSelected
                            ? 'border-accent bg-accent/10'
                            : 'border-border bg-surface-light opacity-60 hover:opacity-100'
                        }`}
                        disabled={!isSelected && selectedEffectCards.length >= 2}
                      >
                        <span className="font-semibold truncate">{card.text}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/40">x{ownedCount}</span>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            isSelected ? 'border-accent bg-accent' : 'border-white/30'
                          }`}>
                            {isSelected && <span className="text-black text-[10px] font-bold">✓</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          <button
            onClick={handleStartGame}
            disabled={room.players.length < 3}
            className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={20} />
            Start Game ({room.players.length >= 3 ? 'Ready' : `Need ${3 - room.players.length} more`})
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 overflow-auto py-4">
      <div className="glass-card p-8 max-w-md w-full flex flex-col gap-6 animate-slide-up">
        <button
          onClick={() => {
            emit('leave-room');
            navigate('/');
          }}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors self-start"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <h2 className="text-2xl font-bold">{mode === 'quick-play' ? 'Quick Play' : mode === 'two-votes' ? 'Two Votes' : mode === 'battle-royale' ? 'Battle Royale' : "Who's Next?"}</h2>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-white/60">Your Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            className="bg-surface-light border border-border rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {step === 'form' ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-white/60">Room Name</label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="My Awesome Game"
                maxLength={30}
                className="bg-surface-light border border-border rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {/* Customization Toggle */}
            <button
              onClick={() => { playClick(); setShowSettings(!showSettings); }}
              className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors self-start"
            >
              <Settings size={16} />
              {showSettings ? 'Hide' : 'Show'} Game Settings
            </button>

            {showSettings && (
              <div className="flex flex-col gap-4 bg-surface-light rounded-xl p-4">
                {/* Player Count */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm text-white/60">
                    <label>Max Players</label>
                    <span className="font-bold text-white">{maxPlayers}</span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={12}
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                    className="accent-accent w-full"
                  />
                </div>

                {/* Round Count */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm text-white/60">
                    <label>Max Rounds</label>
                    <span className="font-bold text-white">{maxRounds}</span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={30}
                    value={maxRounds}
                    onChange={(e) => setMaxRounds(parseInt(e.target.value))}
                    className="accent-accent w-full"
                  />
                </div>

                {/* Starting Hand Size */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm text-white/60">
                    <label>Starting Hand Size</label>
                    <span className="font-bold text-white">{startingCards} cards</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={15}
                    value={startingCards}
                    onChange={(e) => setStartingCards(parseInt(e.target.value))}
                    className="accent-accent w-full"
                  />
                </div>

                {/* Blank Cards */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={blankCardsEnabled}
                    onChange={(e) => setBlankCardsEnabled(e.target.checked)}
                    className="accent-accent w-4 h-4"
                  />
                  <span className="text-sm text-white/80">Enable Blank Cards (custom answers)</span>
                </label>

                {/* Buffs / Debuffs */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={buffsEnabled}
                    onChange={(e) => setBuffsEnabled(e.target.checked)}
                    className="accent-accent w-4 h-4"
                  />
                  <span className="text-sm text-white/80">Enable Buffs & Debuffs (random round effects)</span>
                </label>

                {/* Re-Submit Tokens */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm text-white/60">
                    <label>Re-Submit Tokens (Vanilla = 2)</label>
                    <span>{maxReSubmits}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={maxReSubmits}
                    onChange={(e) => setMaxReSubmits(parseInt(e.target.value))}
                    className="w-full accent-accent"
                  />
                  <p className="text-xs text-white/40">Max times a player can re-submit an answer per game. 3-round cooldown between uses.</p>
                </div>

                {/* Card Packs */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm text-white/60">Card Packs</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'base' as CardPack, label: 'Base', icon: <Laugh size={14} />, color: 'bg-blue-500/20 text-blue-400' },
                      { key: 'nsfw' as CardPack, label: 'NSFW', icon: <Flame size={14} />, color: 'bg-pink-500/20 text-pink-400' },
                      { key: 'dark' as CardPack, label: 'Dark', icon: <Skull size={14} />, color: 'bg-red-500/20 text-red-400' },
                      { key: 'absurd' as CardPack, label: 'Absurd', icon: <Settings size={14} />, color: 'bg-purple-500/20 text-purple-400' },
                      { key: 'geek' as CardPack, label: 'Geek', icon: <Gamepad2 size={14} />, color: 'bg-green-500/20 text-green-400' },
                      { key: 'food' as CardPack, label: 'Food', icon: <UtensilsCrossed size={14} />, color: 'bg-orange-500/20 text-orange-400' },
                      { key: 'sports' as CardPack, label: 'Sports', icon: <Dumbbell size={14} />, color: 'bg-yellow-500/20 text-yellow-400' },
                      { key: 'fantasy' as CardPack, label: 'Fantasy', icon: <Sword size={14} />, color: 'bg-indigo-500/20 text-indigo-400' },
                      { key: 'music' as CardPack, label: 'Music', icon: <Music size={14} />, color: 'bg-cyan-500/20 text-cyan-400' },
                      { key: 'internet' as CardPack, label: 'Internet', icon: <Globe size={14} />, color: 'bg-teal-500/20 text-teal-400' },
                    ].map((pack) => (
                      <label
                        key={pack.key}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all border ${
                          cardPacks.includes(pack.key)
                            ? 'border-accent bg-accent/10'
                            : 'border-border bg-transparent opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={cardPacks.includes(pack.key)}
                          onChange={() => {
                            setCardPacks((prev) =>
                              prev.includes(pack.key)
                                ? pack.key === 'base' && prev.length === 1
                                  ? prev
                                  : prev.filter((p) => p !== pack.key)
                                : [...prev, pack.key]
                            );
                          }}
                          className="hidden"
                        />
                        {pack.icon}
                        <span className="text-xs font-semibold">{pack.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleCreateRoom}
              disabled={!playerName.trim() || !roomName.trim()}
              className="btn-primary"
            >
              Create Room
            </button>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-white/40 text-sm">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <button
              onClick={() => { playClick(); setStep('join'); }}
              className="btn-secondary"
            >
              <DoorOpen size={18} />
              Join with Code
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-sm text-white/60">Room Code</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ABCD12"
                maxLength={6}
                className="bg-surface-light border border-border rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-accent transition-colors font-mono tracking-widest text-center text-xl"
              />
            </div>
            <button
              onClick={handleJoinRoom}
              disabled={!playerName.trim() || roomCode.length < 6}
              className="btn-primary"
            >
              Join Game
            </button>
            <button
              onClick={() => { playClick(); setStep('form'); }}
              className="btn-secondary"
            >
              Create a Room Instead
            </button>
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
