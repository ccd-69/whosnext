import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Clock, Users, ArrowRight, Sparkles, Vote, Trophy, ShoppingBag, Lock, Check, LogIn, UserPlus, LogOut, Shield, User as UserIcon, Edit3 } from 'lucide-react';
import { useSocket } from '../hooks/useSocket.js';
import { playClick, playHover } from '../audio/sound.js';
import type { LeaderboardEntry, User, Card, FriendUser, FriendRequest, DMMessage, GroupChat, GroupMessage, GroupMember } from '../../shared/types.js';
import { EFFECT_CARDS } from '../../shared/deck.js';
import { THEMES } from '../context/ThemeContext.js';
import { getActiveGames, removeActiveGame } from '../utils/activeGames.js';
import type { ActiveGame } from '../utils/activeGames.js';

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
  const [activeGames, setActiveGames] = useState<ActiveGame[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [profileBio, setProfileBio] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('');
  const [profileTab, setProfileTab] = useState<'overview' | 'recent' | 'inventory' | 'friends'>('overview');
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendAddUsername, setFriendAddUsername] = useState('');
  const [friendAddError, setFriendAddError] = useState('');
  const [activeDmUserId, setActiveDmUserId] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<DMMessage[]>([]);
  const [dmInput, setDmInput] = useState('');
  const [sidebarTab, setSidebarTab] = useState<'friends' | 'groups'>('friends');
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([]);
  const [groupInput, setGroupInput] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [createGroupName, setCreateGroupName] = useState('');
  const [joinGroupId, setJoinGroupId] = useState('');

  useEffect(() => {
    setActiveGames(getActiveGames());
  }, []);

  useEffect(() => {
    if (!connected) return;
    emit('get-leaderboards');
    if (user) {
      emit('get-own-profile', (u: User | null) => {
        if (u) {
          setUser(u);
          setLifetimeBalance(u.balance);
          setUnlocked(u.unlockedThemes || []);
          setEffectInventory(u.effectCardInventory || []);
          setProfileBio(u.bio || '');
          setProfileAvatar(u.avatarUrl || '');
        }
      });
      emit('get-friends', (f: FriendUser[]) => setFriends(f));
      emit('get-friend-requests', (r: FriendRequest[]) => setFriendRequests(r));
      emit('get-my-groups', (g: GroupChat[]) => setGroups(g));
    }
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
      localStorage.setItem('whosnext_user_id', u.id);
      emit('get-friends', (f: FriendUser[]) => setFriends(f));
      emit('get-friend-requests', (r: FriendRequest[]) => setFriendRequests(r));
      emit('get-my-groups', (g: GroupChat[]) => setGroups(g));
    });
    const unsubAuthErr = on('auth-error', (msg: string) => {
      setAuthError(msg);
    });
    const unsubFriendReq = on('friend-request-received', (req: FriendRequest) => {
      setFriendRequests((prev) => {
        if (prev.find((r) => r.id === req.id)) return prev;
        return [...prev, req];
      });
    });
    const unsubFriendAccepted = on('friend-request-accepted', (friend: FriendUser) => {
      setFriends((prev) => {
        if (prev.find((f) => f.userId === friend.userId)) return prev;
        return [...prev, friend];
      });
      setFriendRequests((prev) => prev.filter((r) => r.fromId !== friend.userId && r.toId !== friend.userId));
    });
    const unsubFriendRemoved = on('friend-removed', (removedId: string) => {
      setFriends((prev) => prev.filter((f) => f.userId !== removedId));
    });
    const unsubFriendStatus = on('friend-status-update', (uid: string, status: 'online' | 'away' | 'offline') => {
      setFriends((prev) => prev.map((f) => f.userId === uid ? { ...f, status } : f));
    });
    const unsubDM = on('dm-received', (msg: DMMessage) => {
      setDmMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    const unsubGroupMsg = on('group-message-received', (groupId: string, msg: GroupMessage) => {
      if (groupId !== activeGroupId) return;
      setGroupMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    const unsubGroupMembers = on('group-member-update', (groupId: string, members: GroupMember[]) => {
      setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, members } : g));
    });
    const unsubGroupCreated = on('group-created', (group: GroupChat) => {
      setGroups((prev) => {
        if (prev.find((g) => g.id === group.id)) return prev;
        return [...prev, { ...group, messages: [] }];
      });
      setShowCreateGroup(false);
      setCreateGroupName('');
      setActiveGroupId(group.id);
      setGroupMessages([]);
    });
    const unsubGroupInvite = on('group-invite-received', (group: GroupChat) => {
      if (!group.members.find((m) => m.userId === user?.id)) return;
      setGroups((prev) => {
        if (prev.find((g) => g.id === group.id)) return prev;
        return [...prev, { ...group, messages: [] }];
      });
    });
    return () => { unsub(); unsubAuth(); unsubAuthErr(); unsubFriendReq(); unsubFriendAccepted(); unsubFriendRemoved(); unsubFriendStatus(); unsubDM(); unsubGroupMsg(); unsubGroupMembers(); unsubGroupCreated(); unsubGroupInvite(); };
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
    setFriends([]);
    setFriendRequests([]);
    setActiveDmUserId(null);
    setDmMessages([]);
    localStorage.removeItem('whosnext_unlocked_themes');
    localStorage.removeItem('whosnext_user_id');
  }

  function handleSendDM() {
    if (!dmInput.trim() || !activeDmUserId || !user) return;
    emit('send-dm', activeDmUserId, dmInput.trim(), (success: boolean) => {
      if (success) {
        setDmInput('');
      }
    });
  }

  function handleCreateGroup() {
    if (!createGroupName.trim() || !user) return;
    emit('create-group', createGroupName.trim(), (group: GroupChat | null) => {
      if (group) {
        setGroups((prev) => {
          if (prev.find((g) => g.id === group.id)) return prev;
          return [...prev, { ...group, messages: [] }];
        });
        setShowCreateGroup(false);
        setCreateGroupName('');
        setActiveGroupId(group.id);
        setGroupMessages([]);
      }
    });
  }

  function handleJoinGroup() {
    if (!joinGroupId.trim() || !user) return;
    emit('join-group', joinGroupId.trim(), (group: GroupChat | null) => {
      if (group) {
        setGroups((prev) => {
          if (prev.find((g) => g.id === group.id)) return prev;
          return [...prev, group];
        });
        setJoinGroupId('');
        setActiveGroupId(group.id);
        setGroupMessages([]);
      }
    });
  }

  function handleSendGroupMessage() {
    if (!groupInput.trim() || !activeGroupId || !user) return;
    emit('send-group-message', activeGroupId, groupInput.trim(), (success: boolean) => {
      if (success) setGroupInput('');
    });
  }

  function handleLeaveGroup(groupId: string) {
    emit('leave-group', groupId, (success: boolean) => {
      if (success) {
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        if (activeGroupId === groupId) {
          setActiveGroupId(null);
          setGroupMessages([]);
        }
      }
    });
  }

  function handleDeleteGroup(groupId: string) {
    emit('delete-group', groupId, (success: boolean) => {
      if (success) {
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        if (activeGroupId === groupId) {
          setActiveGroupId(null);
          setGroupMessages([]);
        }
      }
    });
  }

  function handleInviteToGroup(groupId: string, targetUserId: string) {
    emit('invite-to-group', groupId, targetUserId, (success: boolean) => {
      if (!success) alert('Failed to add friend to group.');
    });
  }

  function handlePromote(groupId: string, targetUserId: string) {
    emit('promote-member', groupId, targetUserId, (success: boolean) => {
      if (!success) alert('Failed to promote member.');
    });
  }

  function handleDemote(groupId: string, targetUserId: string) {
    emit('demote-mod', groupId, targetUserId, (success: boolean) => {
      if (!success) alert('Failed to demote moderator.');
    });
  }

  function handleKickFromGroup(groupId: string, targetUserId: string) {
    emit('kick-from-group', groupId, targetUserId, (success: boolean) => {
      if (!success) alert('Failed to kick member.');
    });
  }

  function handleBuyTheme(themeId: string, cost: number) {
    playClick();
    if (!user) {
      alert('Sign in to purchase themes!');
      return;
    }
    emit('buy-theme', themeId, (success: boolean, remaining: number, error?: string) => {
      if (success) {
        setLifetimeBalance(remaining);
        const next = [...unlocked, themeId];
        setUnlocked(next);
        localStorage.setItem('whosnext_unlocked_themes', JSON.stringify(next));
        setUser((prev) => prev ? { ...prev, balance: remaining, unlockedThemes: [...(prev.unlockedThemes || []), themeId] } : null);
      } else {
        alert(error || `Not enough funds! You need $${cost.toFixed(2)}`);
      }
    });
  }

  function handleBuyEffectCard(cardId: string, cost: number) {
    playClick();
    if (!user) {
      alert('Sign in to purchase effect cards!');
      return;
    }
    emit('buy-effect-card', cardId, (success: boolean, remaining: number, error?: string) => {
      if (success) {
        setLifetimeBalance(remaining);
        setEffectInventory((prev) => [...prev, cardId]);
        setUser((prev) => prev ? { ...prev, balance: remaining, effectCardInventory: [...(prev.effectCardInventory || []), cardId] } : null);
      } else {
        alert(error || `Not enough funds! You need $${cost.toFixed(2)}`);
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
    <div className="flex h-full w-full relative overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto relative">
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
              <button
                onClick={() => { playClick(); setShowProfile(true); }}
                className="text-sm font-semibold text-white/80 hover:text-accent transition-colors"
              >
                {user.username}
              </button>
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

        {/* Resume Active Games */}
        {activeGames.length > 0 && (
          <div className="w-full flex flex-col gap-2 animate-slide-up">
            <div className="text-xs text-white/40 font-bold uppercase tracking-wider">Resume Game</div>
            <div className="flex flex-col gap-2">
              {activeGames.map((g) => (
                <div key={g.roomCode} className="glass-card p-3 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{g.roomCode}</span>
                    <span className="text-xs text-white/60 capitalize">{g.mode.replace(/-/g, ' ')}</span>
                    <span className="text-[10px] text-white/40">Playing as {g.playerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { playClick(); navigate(`/game/${g.roomCode}`); }}
                      className="btn-primary text-xs px-3 py-1.5"
                    >
                      Reconnect
                    </button>
                    <button
                      onClick={() => { playClick(); removeActiveGame(g.roomCode); setActiveGames(getActiveGames()); }}
                      className="text-white/40 hover:text-white transition-colors text-xs px-1"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
      </div> {/* close main content area */}

      {/* Right Sidebar */}
      {user && (
        <div className="w-64 border-l border-border flex flex-col shrink-0 bg-surface/40 backdrop-blur-sm z-20">
          {/* User Header */}
          <button
            onClick={() => { playClick(); setShowProfile(true); }}
            className="flex items-center gap-3 p-4 border-b border-border hover:bg-surface-light/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-sm font-bold text-accent border border-accent/30 overflow-hidden shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                user.username.slice(0, 2).toUpperCase()
              )}
            </div>
            <div className="flex flex-col items-start min-w-0">
              <span className="font-bold text-sm truncate">{user.username}</span>
              <span className="text-xs text-accent font-bold">${user.balance.toFixed(2)}</span>
            </div>
          </button>

          {/* Sidebar Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-border shrink-0">
              {(['friends', 'groups'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { playClick(); setSidebarTab(tab); }}
                  className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                    sidebarTab === tab ? 'bg-accent/20 text-accent' : 'text-white/40 hover:text-white'
                  }`}
                >
                  {tab === 'friends' ? `Friends (${friends.length})` : `Groups (${groups.length})`}
                </button>
              ))}
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
              {sidebarTab === 'friends' ? (
                activeDmUserId ? (
                  /* DM Panel */
                  <div className="flex flex-col h-full">
                    {/* DM Header */}
                    <div className="flex items-center gap-2 p-3 border-b border-border">
                      <button
                        onClick={() => setActiveDmUserId(null)}
                        className="text-white/40 hover:text-white transition-colors text-xs shrink-0"
                      >
                        ← Back
                      </button>
                      <span className="text-sm font-semibold truncate">
                        {friends.find(f => f.userId === activeDmUserId)?.username || 'Friend'}
                      </span>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                      {dmMessages.map((msg) => {
                        const isMe = msg.senderId === user?.id;
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] px-3 py-2 rounded-lg text-xs ${
                              isMe ? 'bg-accent/20 text-accent' : 'bg-surface-light text-white/80'
                            }`}>
                              {msg.text}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-border flex gap-2">
                      <input
                        type="text"
                        value={dmInput}
                        onChange={(e) => setDmInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && dmInput.trim()) {
                            handleSendDM();
                          }
                        }}
                        placeholder="Type a message..."
                        maxLength={500}
                        className="flex-1 bg-surface-light border border-border rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-accent transition-colors text-xs"
                      />
                      <button
                        onClick={handleSendDM}
                        disabled={!dmInput.trim()}
                        className="btn-primary text-xs px-3 py-2 disabled:opacity-40"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Friends List */
                  <div className="flex flex-col overflow-y-auto p-3 gap-2">
                    <div className="text-xs text-white/40 font-bold uppercase tracking-wider mb-1">Friends ({friends.length})</div>
                    {friends.length === 0 && (
                      <p className="text-white/40 text-xs text-center py-4">No friends yet. Send a request from your profile!</p>
                    )}
                    {friends.map((f) => (
                      <button
                        key={f.userId}
                        onClick={() => {
                          playClick();
                          setActiveDmUserId(f.userId);
                          emit('get-dm-history', f.userId, (msgs: DMMessage[]) => setDmMessages(msgs));
                        }}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-light/50 transition-colors text-left w-full"
                      >
                        <div className="relative shrink-0">
                          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                            {f.avatarUrl ? (
                              <img src={f.avatarUrl} alt="avatar" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              f.username.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-surface ${
                            f.status === 'online' ? 'bg-green-500' : f.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                          }`} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold truncate">{f.username}</span>
                          <span className={`text-[10px] ${
                            f.status === 'online' ? 'text-green-400' : f.status === 'away' ? 'text-yellow-400' : 'text-gray-400'
                          }`}>
                            {f.status === 'online' ? 'Online' : f.status === 'away' ? 'Away' : 'Offline'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                activeGroupId ? (
                  /* Group Chat Panel */
                  <div className="flex flex-col h-full">
                    {/* Group Header */}
                    <div className="flex items-center gap-2 p-3 border-b border-border">
                      <button
                        onClick={() => setActiveGroupId(null)}
                        className="text-white/40 hover:text-white transition-colors text-xs shrink-0"
                      >
                        ← Back
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold truncate block">
                          {groups.find(g => g.id === activeGroupId)?.name || 'Group'}
                        </span>
                        <span className="text-[10px] text-white/50">
                          {groups.find(g => g.id === activeGroupId)?.members.length || 0} members
                        </span>
                      </div>
                      {(() => {
                        const group = groups.find(g => g.id === activeGroupId);
                        const me = group?.members.find(m => m.userId === user?.id);
                        if (me?.role === 'owner') {
                          return (
                            <button
                              onClick={() => group && handleDeleteGroup(group.id)}
                              className="text-red-400 hover:text-red-300 text-xs shrink-0"
                            >
                              Delete
                            </button>
                          );
                        }
                        if (me?.role !== 'owner' && group) {
                          return (
                            <button
                              onClick={() => handleLeaveGroup(group.id)}
                              className="text-white/40 hover:text-white text-xs shrink-0"
                            >
                              Leave
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                      {groupMessages.map((msg) => {
                        const isMe = msg.senderId === user?.id;
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] px-3 py-2 rounded-lg text-xs ${
                              isMe ? 'bg-accent/20 text-accent' : 'bg-surface-light text-white/80'
                            }`}>
                              {!isMe && <div className="text-[10px] text-white/40 mb-0.5">{msg.senderName}</div>}
                              {msg.text}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Members */}
                    <div className="border-t border-border p-2 shrink-0">
                      <details className="text-xs">
                        <summary className="text-white/40 cursor-pointer select-none">Members</summary>
                        <div className="flex flex-col gap-1 mt-1 max-h-24 overflow-y-auto">
                          {(() => {
                            const group = groups.find(g => g.id === activeGroupId);
                            if (!group) return null;
                            const me = group.members.find(m => m.userId === user?.id);
                            const isOwner = me?.role === 'owner';
                            const isMod = me?.role === 'mod';
                            return group.members.map((m) => (
                              <div key={m.userId} className="flex items-center justify-between p-1 rounded hover:bg-surface-light/30">
                                <span className="truncate">
                                  {m.username}
                                  {m.role !== 'member' && (
                                    <span className="text-[10px] text-accent ml-1">{m.role}</span>
                                  )}
                                </span>
                                <div className="flex gap-1">
                                  {isOwner && m.role === 'member' && (
                                    <button onClick={() => handlePromote(group.id, m.userId)} className="text-[10px] text-green-400 hover:text-green-300">Promote</button>
                                  )}
                                  {isOwner && m.role === 'mod' && (
                                    <button onClick={() => handleDemote(group.id, m.userId)} className="text-[10px] text-yellow-400 hover:text-yellow-300">Demote</button>
                                  )}
                                  {(isOwner || (isMod && m.role === 'member')) && m.userId !== user?.id && (
                                    <button onClick={() => handleKickFromGroup(group.id, m.userId)} className="text-[10px] text-red-400 hover:text-red-300">Kick</button>
                                  )}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </details>
                    </div>

                    {/* Invite Friends */}
                    <div className="border-t border-border p-2 shrink-0">
                      <details className="text-xs">
                        <summary className="text-white/40 cursor-pointer select-none">Invite Friends</summary>
                        <div className="flex flex-col gap-1 mt-1 max-h-24 overflow-y-auto">
                          {(() => {
                            const group = groups.find(g => g.id === activeGroupId);
                            if (!group) return null;
                            const me = group.members.find(m => m.userId === user?.id);
                            const canInvite = me?.role === 'owner' || me?.role === 'mod';
                            if (!canInvite) return <span className="text-white/30">Only owner or moderators can invite.</span>;
                            const notInGroup = friends.filter(f => !group.members.some(m => m.userId === f.userId));
                            if (notInGroup.length === 0) return <span className="text-white/30">All friends are already in this group.</span>;
                            return notInGroup.map((f) => (
                              <div key={f.userId} className="flex items-center justify-between p-1 rounded hover:bg-surface-light/30">
                                <span className="truncate">{f.username}</span>
                                <button
                                  onClick={() => handleInviteToGroup(group.id, f.userId)}
                                  className="text-[10px] text-green-400 hover:text-green-300"
                                >
                                  Add
                                </button>
                              </div>
                            ));
                          })()}
                        </div>
                      </details>
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-border flex gap-2 shrink-0">
                      <input
                        type="text"
                        value={groupInput}
                        onChange={(e) => setGroupInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && groupInput.trim()) {
                            handleSendGroupMessage();
                          }
                        }}
                        placeholder="Type a message..."
                        maxLength={500}
                        className="flex-1 bg-surface-light border border-border rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-accent transition-colors text-xs"
                      />
                      <button
                        onClick={handleSendGroupMessage}
                        disabled={!groupInput.trim()}
                        className="btn-primary text-xs px-3 py-2 disabled:opacity-40"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Groups List */
                  <div className="flex flex-col overflow-y-auto p-3 gap-2">
                    <button
                      onClick={() => setShowCreateGroup(true)}
                      className="btn-primary text-xs py-2 w-full"
                    >
                      Create Group
                    </button>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={joinGroupId}
                        onChange={(e) => setJoinGroupId(e.target.value)}
                        placeholder="Group ID to join..."
                        className="flex-1 bg-surface-light border border-border rounded-lg px-2 py-1 text-white placeholder-white/30 text-xs focus:outline-none focus:border-accent"
                      />
                      <button onClick={handleJoinGroup} className="btn-primary text-xs px-3">Join</button>
                    </div>
                    <div className="text-xs text-white/40 font-bold uppercase tracking-wider mb-1 mt-2">My Groups ({groups.length})</div>
                    {groups.length === 0 && (
                      <p className="text-white/40 text-xs text-center py-4">No groups yet. Create or join one!</p>
                    )}
                    {groups.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => {
                          playClick();
                          setActiveGroupId(g.id);
                          emit('get-group-history', g.id, (msgs: GroupMessage[]) => setGroupMessages(msgs));
                        }}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-light/50 transition-colors text-left w-full"
                      >
                        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                          {g.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold truncate">{g.name}</span>
                          <span className="text-[10px] text-white/50">{g.members.length} members</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-sm w-full flex flex-col gap-4 animate-bounce-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Create Group</h2>
              <button onClick={() => { setShowCreateGroup(false); setCreateGroupName(''); }} className="text-white/40 hover:text-white">✕</button>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-white/60">Group Name</label>
              <input
                type="text"
                value={createGroupName}
                onChange={(e) => setCreateGroupName(e.target.value)}
                placeholder="Enter group name"
                maxLength={50}
                className="bg-surface-light border border-border rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <button
              onClick={handleCreateGroup}
              disabled={!createGroupName.trim()}
              className="btn-primary disabled:opacity-40"
            >
              Create
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

            <div className="flex flex-col gap-2">
              {lbData.length === 0 && <p className="text-white/40 text-center py-8">No leaderboard data yet. Play a game!</p>}
              {lbData.length > 0 && (
                <div className="grid grid-cols-[2rem_1fr_3.5rem_4.5rem] gap-2 px-4 py-1 text-xs font-bold uppercase tracking-wider text-white/40 border-b border-border">
                  <span>#</span>
                  <span>Player</span>
                  <span className="text-right">Wins</span>
                  <span className="text-right">$🤑</span>
                </div>
              )}
              {lbData.map((entry, i) => (
                <div key={entry.userId} className="grid grid-cols-[2rem_1fr_3.5rem_4.5rem] gap-2 px-4 py-2 bg-surface-light rounded-lg items-center">
                  <span className={`font-bold ${i < 3 ? 'text-accent' : 'text-white/40'}`}>#{i + 1}</span>
                  <span className="font-semibold truncate">{entry.username}</span>
                  <span className="font-bold text-right">{entry.wins}</span>
                  <span className="font-bold text-right text-accent">${entry.earned.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && user && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-md w-full flex flex-col gap-4 animate-bounce-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserIcon size={24} className="text-accent" />
                <h2 className="text-xl font-bold">Profile</h2>
              </div>
              <button onClick={() => setShowProfile(false)} className="text-white/40 hover:text-white">✕</button>
            </div>

            {/* Avatar + Header */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-xl font-bold text-accent border border-accent/30">
                {profileAvatar ? (
                  <img src={profileAvatar} alt="avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  user.username.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{user.username}</span>
                  {user.role === 'dev' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-accent/20 text-accent px-2 py-0.5 rounded-md">
                      <Shield size={10} /> Dev
                    </span>
                  )}
                </div>
                <span className="text-xs text-accent font-bold">${user.balance.toFixed(2)}</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              {(['overview', 'recent', 'inventory', 'friends'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setProfileTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    profileTab === tab ? 'bg-accent/20 text-accent' : 'bg-surface-light text-white/60 hover:text-white'
                  }`}
                >
                  {tab === 'overview' ? 'Overview' : tab === 'recent' ? 'Recent Games' : tab === 'inventory' ? 'Inventory' : `Friends (${friends.length})`}
                </button>
              ))}
            </div>

            {profileTab === 'overview' && (
              <div className="flex flex-col gap-4">
                {/* Bio */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-white/60 flex items-center gap-1">
                    <Edit3 size={12} /> Bio
                  </label>
                  <textarea
                    value={profileBio}
                    onChange={(e) => setProfileBio(e.target.value)}
                    placeholder="Write a short bio..."
                    maxLength={128}
                    rows={2}
                    className="bg-surface-light border border-border rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-accent transition-colors resize-none text-sm"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40">{profileBio.length}/128</span>
                    <button
                      onClick={() => {
                        playClick();
                        emit('update-profile', profileBio, profileAvatar, (success: boolean, updatedUser?: User) => {
                          if (success && updatedUser) {
                            setUser(updatedUser);
                            setProfileBio(updatedUser.bio || '');
                            setProfileAvatar(updatedUser.avatarUrl || '');
                          }
                        });
                      }}
                      className="btn-primary text-xs px-3 py-1"
                    >
                      Save Bio
                    </button>
                  </div>
                </div>

                {/* Avatar URL */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-white/60">Avatar URL <span className="text-white/30">(optional)</span></label>
                  <input
                    type="text"
                    value={profileAvatar}
                    onChange={(e) => setProfileAvatar(e.target.value)}
                    placeholder="https://example.com/avatar.png"
                    className="bg-surface-light border border-border rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-accent transition-colors text-sm"
                  />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-card p-3 text-center">
                    <div className="text-2xl font-bold text-accent">{user.stats?.wins ?? 0}</div>
                    <div className="text-xs text-white/40">Wins</div>
                  </div>
                  <div className="glass-card p-3 text-center">
                    <div className="text-2xl font-bold text-accent">{user.totalGamesPlayed ?? 0}</div>
                    <div className="text-xs text-white/40">Games Played</div>
                  </div>
                  <div className="glass-card p-3 text-center">
                    <div className="text-2xl font-bold text-green-400">${(user.stats?.earned ?? 0).toFixed(2)}</div>
                    <div className="text-xs text-white/40">Total Earned</div>
                  </div>
                  <div className="glass-card p-3 text-center">
                    <div className="text-2xl font-bold text-orange-400">${(user.stats?.spent ?? 0).toFixed(2)}</div>
                    <div className="text-xs text-white/40">Total Spent</div>
                  </div>
                </div>
              </div>
            )}

            {profileTab === 'recent' && (
              <div className="flex flex-col gap-2">
                {(!user.recentGames || user.recentGames.length === 0) && (
                  <p className="text-white/40 text-center py-8">No games played yet. Get in there!</p>
                )}
                {user.recentGames?.map((g) => (
                  <div key={`${g.roomCode}-${g.date}`} className="glass-card p-3 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold capitalize">{g.mode.replace(/-/g, ' ')}</span>
                      <span className="text-xs text-white/40">{g.roomCode} &middot; {new Date(g.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{g.score} pts</span>
                      {g.won && <span className="text-[10px] font-bold uppercase bg-accent/20 text-accent px-1.5 py-0.5 rounded">W</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {profileTab === 'inventory' && (
              <div className="flex flex-col gap-3">
                <div className="text-xs text-white/40 font-bold uppercase tracking-wider">Themes Owned: {unlocked.length}</div>
                <div className="flex flex-wrap gap-2">
                  {THEMES.filter((t) => unlocked.includes(t.id)).map((t) => (
                    <span key={t.id} className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent font-semibold">{t.name}</span>
                  ))}
                </div>
                <div className="text-xs text-white/40 font-bold uppercase tracking-wider mt-2">Effect Cards: {effectInventory.length}</div>
                <div className="flex flex-wrap gap-2">
                  {effectInventory.length === 0 && <span className="text-xs text-white/40">No effect cards owned.</span>}
                  {effectInventory.map((id, i) => {
                    const card = EFFECT_CARDS.find((c) => c.id === id);
                    return card ? (
                      <span key={`${id}-${i}`} className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-400 font-semibold">{card.text}</span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {profileTab === 'friends' && (
              <div className="flex flex-col gap-4">
                {/* Add Friend */}
                <div className="flex flex-col gap-2">
                  <div className="text-xs text-white/40 font-bold uppercase tracking-wider">Add Friend</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={friendAddUsername}
                      onChange={(e) => { setFriendAddUsername(e.target.value); setFriendAddError(''); }}
                      placeholder="Enter username..."
                      maxLength={20}
                      className="flex-1 bg-surface-light border border-border rounded-xl px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:border-accent transition-colors text-sm"
                    />
                    <button
                      onClick={() => {
                        playClick();
                        if (!friendAddUsername.trim()) return;
                        emit('send-friend-request', friendAddUsername.trim(), (success: boolean, message?: string) => {
                          if (success) {
                            setFriendAddUsername('');
                            setFriendAddError('Request sent!');
                          } else {
                            setFriendAddError(message || 'Failed to send request');
                          }
                        });
                      }}
                      className="btn-primary text-xs px-3 py-2"
                    >
                      <UserPlus size={14} /> Add
                    </button>
                  </div>
                  {friendAddError && (
                    <p className={`text-xs ${friendAddError.includes('sent') ? 'text-green-400' : 'text-red-400'}`}>{friendAddError}</p>
                  )}
                </div>

                {/* Friend Requests */}
                {friendRequests.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="text-xs text-white/40 font-bold uppercase tracking-wider">Friend Requests ({friendRequests.length})</div>
                    <div className="flex flex-col gap-2">
                      {friendRequests.map((req) => (
                        <div key={req.id} className="glass-card p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                              {req.fromUsername.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold">{req.fromUsername}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                playClick();
                                emit('accept-friend-request', req.id, (success: boolean) => {
                                  if (success) {
                                    setFriendRequests((prev) => prev.filter((r) => r.id !== req.id));
                                    emit('get-friends', (f: FriendUser[]) => setFriends(f));
                                  }
                                });
                              }}
                              className="btn-primary text-xs px-2 py-1"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => {
                                playClick();
                                emit('reject-friend-request', req.id, (success: boolean) => {
                                  if (success) setFriendRequests((prev) => prev.filter((r) => r.id !== req.id));
                                });
                              }}
                              className="text-xs text-white/40 hover:text-red-400 transition-colors px-2 py-1"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Friends List */}
                <div className="flex flex-col gap-2">
                  <div className="text-xs text-white/40 font-bold uppercase tracking-wider">Friends ({friends.length})</div>
                  {friends.length === 0 && <p className="text-white/40 text-sm text-center py-4">No friends yet. Send a request above!</p>}
                  <div className="flex flex-col gap-2">
                    {friends.map((f) => (
                      <div key={f.userId} className="glass-card p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">
                              {f.avatarUrl ? (
                                <img src={f.avatarUrl} alt="avatar" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                f.username.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface ${
                              f.status === 'online' ? 'bg-green-500' : f.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                            }`} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">{f.username}</span>
                            <span className={`text-[10px] ${f.status === 'online' ? 'text-green-400' : f.status === 'away' ? 'text-yellow-400' : 'text-gray-400'}`}>
                              {f.status === 'online' ? 'Online' : f.status === 'away' ? 'Away' : 'Offline'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            playClick();
                            emit('remove-friend', f.userId, (success: boolean) => {
                              if (success) setFriends((prev) => prev.filter((fr) => fr.userId !== f.userId));
                            });
                          }}
                          className="text-white/30 hover:text-red-400 transition-colors text-xs"
                          title="Remove friend"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
