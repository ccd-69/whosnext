import React, { useState, useRef, useEffect } from 'react';
import { useTheme, THEMES, type ThemeId } from '../context/ThemeContext.js';
import { useSocket } from '../hooks/useSocket.js';
import { Palette, Check, Lock } from 'lucide-react';
import { playClick } from '../audio/sound.js';
import type { User } from '../../shared/types.js';

function getLocalUnlocked(): string[] {
  try {
    return JSON.parse(localStorage.getItem('whosnext_unlocked_themes') || '[]');
  } catch { return []; }
}

export default function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const { on } = useSocket();
  const [open, setOpen] = useState(false);
  const [unlocked, setUnlocked] = useState<string[]>(getLocalUnlocked());
  const [user, setUser] = useState<User | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = on('auth-success', (u: User) => {
      setUser(u);
      const themes = u.unlockedThemes || [];
      setUnlocked(themes);
      localStorage.setItem('whosnext_unlocked_themes', JSON.stringify(themes));
    });
    return () => { unsub(); };
  }, [on]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function isThemeAvailable(id: ThemeId): boolean {
    if (id === 'void') return true;
    if (user?.role === 'dev') return true;
    return unlocked.includes(id);
  }

  function handlePick(id: ThemeId) {
    if (!isThemeAvailable(id)) return;
    playClick();
    setTheme(id);
    setOpen(false);
  }

  return (
    <div ref={ref} className="fixed bottom-4 left-4 z-[100]">
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full bg-surface-light border border-border flex items-center justify-center shadow-lg hover:border-accent transition-colors"
        title="Change Theme"
      >
        <Palette size={18} className="text-accent" />
      </button>

      {open && (
        <div className="absolute bottom-12 left-0 w-56 bg-surface-light border border-border rounded-xl shadow-2xl p-2 flex flex-col gap-1 animate-fade-in max-h-[60vh] overflow-y-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-2 py-1">Themes</span>
          {THEMES.map((t) => {
            const available = isThemeAvailable(t.id);
            return (
              <button
                key={t.id}
                onClick={() => handlePick(t.id)}
                className={`flex items-center gap-3 px-2 py-2 rounded-lg transition-colors ${
                  theme === t.id ? 'bg-accent/20' : 'hover:bg-white/5'
                } ${!available ? 'opacity-40 cursor-not-allowed' : ''}`}
                disabled={!available}
                title={available ? t.name : 'Unlock in shop'}
              >
                <span
                  className="w-5 h-5 rounded-full border border-white/20 shrink-0"
                  style={{ background: t.color }}
                />
                <span className={`text-sm font-medium ${theme === t.id ? 'text-accent' : 'text-white/80'}`}>
                  {t.name}
                </span>
                {theme === t.id && (
                  <Check size={14} className="text-accent ml-auto" />
                )}
                {!available && (
                  <Lock size={12} className="text-white/30 ml-auto" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
