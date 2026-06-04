import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { ArrowLeft, Copy, Users, Play, DoorOpen } from 'lucide-react';
import type { Room, GameMode } from '../../shared/types';

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

  const isHost = step === 'host';

  function handleCreateRoom() {
    if (!playerName.trim() || !roomName.trim()) return;
    setError('');
    emit('create-room', {
      name: roomName,
      mode: mode || 'quick-play',
      maxPlayers: 8,
      maxRounds: mode === 'quick-play' ? 10 : 20,
    }, (newRoom: Room) => {
      setRoom(newRoom);
      setStep('host');

      // Listen for players joining
      on('player-joined', () => {
        // Refresh room state
      });
    });
  }

  function handleJoinRoom() {
    if (!playerName.trim() || !roomCode.trim()) return;
    setError('');
    emit('join-room', roomCode.toUpperCase(), playerName, (joinedRoom: Room | null) => {
      if (joinedRoom) {
        setRoom(joinedRoom);
        navigate(`/game/${joinedRoom.code}`);
      } else {
        setError('Room not found or full. Check the code and try again.');
      }
    });
  }

  function handleStartGame() {
    emit('start-game');
    if (room) {
      navigate(`/game/${room.code}`);
    }
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
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60">Connecting to game server...</p>
        </div>
      </div>
    );
  }

  if (isHost && room) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4">
        <div className="glass-card p-8 max-w-md w-full flex flex-col gap-6 animate-slide-up">
          <button
            onClick={() => setStep('form')}
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

          <div className="flex flex-col gap-2">
            {room.players.map((p) => (
              <div key={p.id} className="flex items-center gap-3 bg-surface-light rounded-lg px-4 py-2">
                <div className={`w-2 h-2 rounded-full ${p.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="font-semibold">{p.name} {p.isHost && <span className="text-accent text-xs">(Host)</span>}</span>
              </div>
            ))}
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
    <div className="flex h-full flex-col items-center justify-center px-4">
      <div className="glass-card p-8 max-w-md w-full flex flex-col gap-6 animate-slide-up">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors self-start"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <h2 className="text-2xl font-bold">{mode === 'quick-play' ? 'Quick Play' : "Who's Next?"}</h2>

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
              onClick={() => setStep('join')}
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
              onClick={() => setStep('form')}
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
