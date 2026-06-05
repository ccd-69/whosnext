import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Clock, Users, ArrowRight, Sparkles, Vote, Trophy, ShoppingBag, Lock, Check, LogIn, UserPlus, LogOut, Shield } from 'lucide-react';
import { useSocket } from '../hooks/useSocket.js';
import { playClick, playHover } from '../audio/sound.js';
import type { LeaderboardEntry, User, Card } from '../../shared/types.js';
import { EFFECT_CARDS } from '../../shared/deck.js';
import { THEMES } from '../context/ThemeContext.js';

export default function TitleScreen() {
  const navigate = useNavigate();
  const { emit, on, connected } = useSocket();
  const [hovered, setHovered] = useState<'quick-play' | 'whos-next' | 'two-votes' | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [guestMode, setGuestMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [leaderboards, setLeaderboards] = useState<{ wins: LeaderboardEntry[]; earned: LeaderboardEntry[]; spent: LeaderboardEntry[] } | null>(null);
  const [lbTab, setLbTab] = useState<'wins' | 'earned' | 'spent'>('wins');
  const [shopTab, setShopTab] = useState<'themes' | 'effect-cards'>('themes');
  const [lifetimeBalance, setLifetimeBalance] = useState(0);
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const [effectInventory, setEffectInventory] = useState<string[]>([]);

  useEffect(() => {
    if (!connected) return;
    emit('get-leaderboards');
    const unsub = on('leaderboards-data', (data) => {
      setLeaderboards(data);
    });
    const unsubAuth = on('auth-success', (u: User) => {
      setUser(u);
      setLifetimeBalance(u.balance);
      setUnlocked(u.unlockedThemes || []);
      setEffectInventory(u.effectCardInventory || []);
      setShowAuth(false);
      setAuthError('');
    });
    const unsubAuthErr = on('auth-error', (msg: string) => {
      setAuthError(msg);
    });
    return () => { unsub(); unsubAuth(); unsubAuthErr(); };
  }, [connected, emit, on]);

  function handleAuth() {
    playClick();
    setAuthError('');
    if (authTab === 'register') {
      if (authPassword !== authConfirmPassword) {
        setAuthError('Passwords do not match.');
        return;
      }
      emit('register', authUsername, authPassword, authEmail.trim() || '', (success: boolean, message: string) => {
        if (!success) setAuthError(message);
      });
    } else {
      emit('login', authUsername, authPassword, (success: boolean, message: string) => {
        if (!success) setAuthError(message);
      });
    }
  }

  function handleLogout() {
    playClick();
    setUser(null);
    setLifetimeBalance(0);
    setUnlocked([]);
    localStorage.removeItem('whosnext_unlocked_themes');
  }

  function handleBuyTheme(themeId: string, cost: number) {
    playClick();
    if (!user) {
      alert('Sign in to purchase themes!');
      return;
    }
    emit('buy-theme', themeId, (success: boolean, remaining: number) => {
      if (success) {
        setLifetimeBalance(remaining);
        const next = [...unlocked, themeId];
        setUnlocked(next);
        localStorage.setItem('whosnext_unlocked_themes', JSON.stringify(next));
        setUser((prev) => prev ? { ...prev, balance: remaining, unlockedThemes: [...(prev.unlockedThemes || []), themeId] } : null);
      } else {
        alert(`Not enough funds! You need $${cost.toFixed(2)}`);
      }
    });
  }

  function handleBuyEffectCard(cardId: string, cost: number) {
    playClick();
    if (!user) {
      alert('Sign in to purchase effect cards!');
      return;
    }
    emit('buy-effect-card', cardId, (success: boolean, remaining: number) => {
      if (success) {
        setLifetimeBalance(remaining);
        setEffectInventory((prev) => [...prev, cardId]);
        setUser((prev) => prev ? { ...prev, balance: remaining, effectCardInventory: [...(prev.effectCardInventory || []), cardId] } : null);
      } else {
        alert(`Not enough funds! You need $${cost.toFixed(2)}`);
      }
    });
  }

  // Build unique effect cards for shop display (dedupe by effect type)
  const uniqueEffectCards = EFFECT_CARDS.reduce<Card[]>((acc, card) => {
    if (card.effect && !acc.find((c) => c.effect?.type === card.effect?.type)) {
      acc.push(card);
    }
    return acc;
  }, []);

  function getEffectPrice(card: Card): number {
    if (card.effect?.type === 'exodia') return 10;
    if (['double_points_win', 'point_drain', 'card_quality_down', 'abduction'].includes(card.effect?.type || '')) return 8;
    return 7;
  }

  const lbData = leaderboards?.[lbTab] || [];

  return (
    <div className="flex h-full w-full flex-col items-center justify-center relative overflow-y-auto">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 px-4 max-w-2xl w-full">
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

        {/* Auth bar */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {user.role === 'dev' && (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-accent/20 text-accent px-2 py-0.5 rounded-md">
                  <Shield size={10} /> Dev
                </span>
              )}
              <span className="text-sm font-semibold text-white/80">{user.username}</span>
              <span className="text-xs text-accent font-bold">${user.balance.toFixed(2)}</span>
              <button onClick={handleLogout} className="flex items-center gap-1 text-xs text-white/40 hover:text-white transition-colors">
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => { setShowAuth(true); playClick(); }}
                className="flex items-center gap-2 px-4 py-2 glass-card hover:border-accent/50 transition-all"
              >
                <LogIn size={16} className="text-accent" />
                <span className="text-sm font-semibold">Sign In</span>
              </button>
              <button
                onClick={() => { playClick(); setGuestMode(true); setShowAuth(false); }}
                className={`flex items-center gap-2 px-4 py-2 glass-card hover:border-accent/50 transition-all ${
                  guestMode ? 'border-accent/50 text-accent' : 'text-white/60 hover:text-white'
                }`}
              >
                {guestMode && <Check size={14} />}
                <span className="text-sm font-semibold">Continue as Guest</span>
              </button>
            </>
          )}
        </div>

        {/* Top bar: Leaderboard + Shop (signed-in only) */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowLeaderboard(true); playClick(); emit('get-leaderboards'); }}
            className="flex items-center gap-2 px-4 py-2 glass-card hover:border-accent/50 transition-all"
          >
            <Trophy size={16} className="text-accent" />
            <span className="text-sm font-semibold">Leaderboards</span>
          </button>
          {user && (
            <button
              onClick={() => { setShowShop(true); playClick(); }}
              className="flex items-center gap-2 px-4 py-2 glass-card hover:border-accent/50 transition-all"
            >
              <ShoppingBag size={16} className="text-accent" />
              <span className="text-sm font-semibold">Shop</span>
            </button>
          )}
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
              <span>3-12 players</span>
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
            onClick={() => { playClick(); navigate('/lobby/two-votes'); }}
            onMouseEnter={() => { setHovered('two-votes'); playHover(); }}
            onMouseLeave={() => setHovered(null)}
            className={`flex-1 glass-card p-6 text-left transition-all duration-300 hover:border-green-500/50 hover:bg-surface-light/80 ${
              hovered === 'two-votes' ? 'scale-[1.02] shadow-xl shadow-green-500/20' : ''
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Vote size={24} className="text-green-400" />
              </div>
              <h2 className="text-2xl font-bold">Two Votes</h2>
            </div>
            <p className="text-white/60 text-sm mb-4">
              The judge picks two winners every round. More winners, more chaos, more fun. Effect card drops are 50% less frequent.
            </p>
            <div className="flex items-center gap-2 text-green-400 font-semibold text-sm">
              <Users size={16} />
              <span>3-12 players</span>
              <span className="mx-2 text-white/20">|</span>
              <Vote size={16} />
              <span>2 winners/round</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-green-400 font-bold">
              <span>Start Game</span>
              <ArrowRight size={18} />
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
              <span>3-12 players</span>
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

      {/* Auth Modal */}
      {showAuth && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-sm w-full flex flex-col gap-4 animate-bounce-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LogIn size={20} className="text-accent" />
                <h2 className="text-xl font-bold">{authTab === 'login' ? 'Sign In' : 'Create Account'}</h2>
              </div>
              <button onClick={() => setShowAuth(false)} className="text-white/40 hover:text-white">✕</button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setAuthTab('login'); setAuthError(''); setAuthConfirmPassword(''); setAuthEmail(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  authTab === 'login' ? 'bg-accent/20 text-accent' : 'bg-surface-light text-white/60'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setAuthTab('register'); setAuthError(''); setAuthConfirmPassword(''); setAuthEmail(''); }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  authTab === 'register' ? 'bg-accent/20 text-accent' : 'bg-surface-light text-white/60'
                }`}
              >
                Register
              </button>
            </div>

            {authError && <p className="text-red-400 text-sm text-center">{authError}</p>}

            <div className="flex flex-col gap-2">
              <label className="text-sm text-white/60">Username</label>
              <input
                type="text"
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                placeholder="Enter username"
                maxLength={20}
                className="bg-surface-light border border-border rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-white/60">Password</label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Enter password"
                className="bg-surface-light border border-border rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-accent transition-colors"
              />
            </div>

            {authTab === 'register' && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-white/60">Confirm Password</label>
                  <input
                    type="password"
                    value={authConfirmPassword}
                    onChange={(e) => setAuthConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="bg-surface-light border border-border rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-white/60">Email <span className="text-white/30">(optional)</span></label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="bg-surface-light border border-border rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-accent transition-colors"
                  />
                </div>
              </>
            )}

            <button onClick={handleAuth} className="btn-primary flex items-center justify-center gap-2">
              {authTab === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
              {authTab === 'login' ? 'Sign In' : 'Create Account'}
            </button>

            <button
              onClick={() => { playClick(); setGuestMode(true); setShowAuth(false); }}
              className="text-sm text-white/40 hover:text-white transition-colors flex items-center gap-1"
            >
              {guestMode && <Check size={14} className="text-accent" />}
              Continue as Guest
            </button>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-lg w-full flex flex-col gap-4 animate-bounce-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy size={24} className="text-accent" />
                <h2 className="text-xl font-bold">Leaderboards</h2>
              </div>
              <button onClick={() => setShowLeaderboard(false)} className="text-white/40 hover:text-white">✕</button>
            </div>

            <div className="flex gap-2">
              {(['wins', 'earned', 'spent'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setLbTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    lbTab === tab ? 'bg-accent/20 text-accent' : 'bg-surface-light text-white/60 hover:text-white'
                  }`}
                >
                  {tab === 'wins' ? 'Most Wins' : tab === 'earned' ? 'Most Earned' : 'Most Spent'}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              {lbData.length === 0 && <p className="text-white/40 text-center py-8">No leaderboard data yet. Play a game!</p>}
              {lbData.map((entry, i) => (
                <div key={entry.name} className="flex items-center justify-between px-4 py-2 bg-surface-light rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className={`font-bold w-6 ${i < 3 ? 'text-accent' : 'text-white/40'}`}>#{i + 1}</span>
                    <span className="font-semibold">{entry.name}</span>
                  </div>
                  <span className="font-bold">
                    {lbTab === 'wins' ? entry.wins : lbTab === 'earned' ? `$${entry.earned.toFixed(2)}` : `$${entry.spent.toFixed(2)}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Theme Shop Modal */}
      {showShop && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-lg w-full flex flex-col gap-4 animate-bounce-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag size={24} className="text-accent" />
                <h2 className="text-xl font-bold">Theme Shop</h2>
              </div>
              <button onClick={() => setShowShop(false)} className="text-white/40 hover:text-white">✕</button>
            </div>

            {!user ? (
              <div className="text-center py-8 flex flex-col gap-3">
                <Lock size={32} className="text-white/40 mx-auto" />
                <p className="text-white/60">Sign in to purchase from the shop!</p>
                <button onClick={() => { setShowAuth(true); setShowShop(false); }} className="btn-primary mx-auto">
                  Sign In
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-white/60">
                  Lifetime Balance: <span className="text-accent font-bold">${lifetimeBalance.toFixed(2)}</span>
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShopTab('themes')}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      shopTab === 'themes' ? 'bg-accent/20 text-accent' : 'bg-surface-light text-white/60 hover:text-white'
                    }`}
                  >
                    Themes
                  </button>
                  <button
                    onClick={() => setShopTab('effect-cards')}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      shopTab === 'effect-cards' ? 'bg-accent/20 text-accent' : 'bg-surface-light text-white/60 hover:text-white'
                    }`}
                  >
                    Effect Cards
                  </button>
                </div>

                {shopTab === 'themes' ? (
                  <div className="grid grid-cols-2 gap-4">
                    {THEMES.filter((t) => t.cost > 0).map((theme) => {
                      const owned = unlocked.includes(theme.id);
                      return (
                        <div key={theme.id} className="flex flex-col gap-2 glass-card p-4">
                          <div
                            className="h-20 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: 'rgb(var(--color-bg))', border: `2px solid ${theme.color}` }}
                          >
                            <span className="font-bold" style={{ color: theme.color }}>{theme.name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">{theme.name}</span>
                            <span className="text-xs text-white/40">${theme.cost}</span>
                          </div>
                          {owned ? (
                            <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
                              <Check size={14} /> Unlocked
                            </div>
                          ) : (
                            <button
                              onClick={() => handleBuyTheme(theme.id, theme.cost)}
                              disabled={lifetimeBalance < theme.cost}
                              className="btn-primary text-xs disabled:opacity-40 flex items-center gap-1"
                            >
                              <Lock size={12} /> Unlock (${theme.cost})
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {uniqueEffectCards.map((card) => {
                      const price = getEffectPrice(card);
                      const ownedCount = effectInventory.filter((id) => id === card.id).length;
                      return (
                        <div key={card.id} className="flex items-center justify-between glass-card p-3">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">{card.text}</span>
                            <span className="text-xs text-white/40">${price}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {ownedCount > 0 && (
                              <span className="text-xs text-green-400 font-semibold">Owned: {ownedCount}</span>
                            )}
                            <button
                              onClick={() => handleBuyEffectCard(card.id, price)}
                              disabled={lifetimeBalance < price}
                              className="btn-primary text-xs disabled:opacity-40 flex items-center gap-1"
                            >
                              <Lock size={12} /> Buy (${price})
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
