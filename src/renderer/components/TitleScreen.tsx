import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Clock, Users, ArrowRight, Sparkles } from 'lucide-react';
import { playClick, playHover } from '../audio/sound.js';

export default function TitleScreen() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<'quick-play' | 'whos-next' | null>(null);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-4 max-w-2xl w-full">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <Sparkles size={40} className="text-accent" />
            <h1 className="text-5xl font-black tracking-tight">
              Who's Next?
            </h1>
          </div>
          <p className="text-lg text-white/60 text-center">
            The party card game where terrible answers win.
          </p>
        </div>

        {/* Game Mode Cards */}
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <button
            onClick={() => { playClick(); navigate('/lobby/quick-play'); }}
            onMouseEnter={() => { setHovered('quick-play'); playHover(); }}
            onMouseLeave={() => setHovered(null)}
            className={`flex-1 glass-card p-6 text-left transition-all duration-300 hover:border-accent/50 hover:bg-surface-light/80 ${
              hovered === 'quick-play' ? 'scale-[1.02] shadow-xl shadow-accent/20' : ''
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-accent/20 rounded-lg">
                <Zap size={24} className="text-accent" />
              </div>
              <h2 className="text-2xl font-bold">Quick Play</h2>
            </div>
            <p className="text-white/60 text-sm mb-4">
              Everyone plays together in real-time. Fast rounds, instant laughs. Perfect for parties.
            </p>
            <div className="flex items-center gap-2 text-accent font-semibold text-sm">
              <Users size={16} />
              <span>3-8 players</span>
              <span className="mx-2 text-white/20">|</span>
              <Clock size={16} />
              <span>15-30 min</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-accent font-bold">
              <span>Start Game</span>
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </div>
          </button>

          <button
            onClick={() => { playClick(); navigate('/lobby/whos-next'); }}
            onMouseEnter={() => { setHovered('whos-next'); playHover(); }}
            onMouseLeave={() => setHovered(null)}
            className={`flex-1 glass-card p-6 text-left transition-all duration-300 hover:border-purple-500/50 hover:bg-surface-light/80 ${
              hovered === 'whos-next' ? 'scale-[1.02] shadow-xl shadow-purple-500/20' : ''
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Clock size={24} className="text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold">Who's Next?</h2>
            </div>
            <p className="text-white/60 text-sm mb-4">
              Take turns over hours or days. Play at your own pace with friends anywhere in the world.
            </p>
            <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
              <Users size={16} />
              <span>3-8 players</span>
              <span className="mx-2 text-white/20">|</span>
              <Clock size={16} />
              <span>Anytime</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-purple-400 font-bold">
              <span>Start Game</span>
              <ArrowRight size={18} />
            </div>
          </button>
        </div>

        <p className="text-white/40 text-sm">
          One player hosts on desktop. Everyone else joins via browser using a room code.
        </p>
      </div>
    </div>
  );
}
