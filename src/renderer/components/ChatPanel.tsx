import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket.js';
import type { ChatMessage, CustomEmoji, CardEffectType } from '../../shared/types.js';
import { MessageSquare, Smile, X, Send, ImagePlus, Trash2 } from 'lucide-react';
import { playClick } from '../audio/sound.js';

// Lazy-load the emoji picker to keep initial bundle small
// @ts-expect-error emoji-picker-react types mismatch
const EmojiPicker = React.lazy(() => import('emoji-picker-react'));

interface ChatPanelProps {
  myPlayerId?: string;
  myPlayerName?: string;
  collapsed?: boolean;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderCustomEmojis(text: string, emojis: CustomEmoji[]): React.ReactNode[] {
  if (!emojis.length) return [text];
  const parts: React.ReactNode[] = [];
  let remaining = text;

  // Sort shortcodes longest first to avoid partial matches
  const sorted = [...emojis].sort((a, b) =>
    Math.max(...b.shortcodes.map((s) => s.length)) - Math.max(...a.shortcodes.map((s) => s.length))
  );

  while (remaining.length > 0) {
    let earliestIdx = Infinity;
    let earliestEmoji: CustomEmoji | null = null;
    let earliestShort = '';

    for (const ce of sorted) {
      for (const sc of ce.shortcodes) {
        const idx = remaining.indexOf(sc);
        if (idx !== -1 && idx < earliestIdx) {
          earliestIdx = idx;
          earliestEmoji = ce;
          earliestShort = sc;
        }
      }
    }

    if (earliestEmoji && earliestIdx !== Infinity) {
      if (earliestIdx > 0) {
        parts.push(remaining.slice(0, earliestIdx));
      }
      parts.push(
        <img
          key={`${earliestEmoji.id}-${parts.length}`}
          src={earliestEmoji.imgUrl}
          alt={earliestEmoji.name}
          title={earliestEmoji.name}
          className="inline-block w-9 h-9 align-text-bottom"
          draggable={false}
        />
      );
      remaining = remaining.slice(earliestIdx + earliestShort.length);
    } else {
      parts.push(remaining);
      break;
    }
  }
  return parts;
}

export default function ChatPanel({ myPlayerId, myPlayerName, collapsed: initialCollapsed = true }: ChatPanelProps) {
  const { emit, on } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [showEmoji, setShowEmoji] = useState(false);
  const [customEmojis, setCustomEmojis] = useState<CustomEmoji[]>([]);
  const [showEmojiManager, setShowEmojiManager] = useState(false);
  const [newEmojiUrl, setNewEmojiUrl] = useState('');
  const [newEmojiName, setNewEmojiName] = useState('');
  const [newEmojiShortcode, setNewEmojiShortcode] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Click outside to close emoji picker
  useEffect(() => {
    if (!showEmoji) return;
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmoji]);

  useEffect(() => {
    const unsubHistory = on('chat-history', (history: ChatMessage[]) => {
      setMessages(history);
    });
    const unsubMessage = on('chat-message', (msg: ChatMessage) => {
      setMessages((prev) => {
        const next = [...prev, msg];
        if (next.length > 200) next.shift();
        return next;
      });
    });
    const unsubEmojis = on('custom-emojis', (emojis: CustomEmoji[]) => {
      setCustomEmojis(emojis);
    });
    return () => {
      unsubHistory();
      unsubMessage();
      unsubEmojis();
    };
  }, [on]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, collapsed]);

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    emit('send-chat', trimmed);
    setInput('');
    setShowEmoji(false);
  }

  function handleAddEmoji() {
    const url = newEmojiUrl.trim();
    const name = newEmojiName.trim();
    let short = newEmojiShortcode.trim();
    if (!url || !name || !short) return;
    if (!short.startsWith(':')) short = ':' + short;
    if (!short.endsWith(':')) short = short + ':';
    const emoji: CustomEmoji = {
      id: crypto.randomUUID(),
      name,
      shortcodes: [short],
      imgUrl: url,
    };
    emit('add-custom-emoji', emoji);
    setNewEmojiUrl('');
    setNewEmojiName('');
    setNewEmojiShortcode('');
    setShowEmojiManager(false);
  }

  return (
    <>
    <div className={`flex flex-col transition-all duration-300 ${collapsed ? 'w-0 md:w-12' : 'w-80 md:w-72 fixed inset-y-0 right-0 z-40 md:static md:z-auto'} h-full shrink-0`}>
      {collapsed ? (
        <button
          onClick={() => { setCollapsed(false); playClick(); }}
          className="hidden md:flex items-center justify-center w-12 h-12 rounded-xl glass-card hover:bg-surface-light/50 transition-colors"
          title="Open Chat"
        >
          <MessageSquare size={20} className="text-white/60" />
          {messages.length > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
          )}
        </button>
      ) : (
        <div className="flex flex-col h-full glass-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
            <span className="text-xs font-bold uppercase tracking-wider text-white/40">Chat</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setShowEmojiManager(!showEmojiManager); setShowEmoji(false); playClick(); }}
                className="p-1.5 rounded-lg hover:bg-surface-light text-white/40 hover:text-white transition-colors"
                title="Manage Custom Emojis"
              >
                <ImagePlus size={14} />
              </button>
              <button
                onClick={() => { setCollapsed(true); playClick(); }}
                className="p-1.5 rounded-lg hover:bg-surface-light text-white/40 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Custom Emoji Manager */}
          {showEmojiManager && (
            <div className="flex flex-col gap-2 px-3 py-2 border-b border-border bg-surface-light/30 shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Custom Emojis</span>
              <div className="flex flex-col gap-1.5">
                <input
                  value={newEmojiName}
                  onChange={(e) => setNewEmojiName(e.target.value)}
                  placeholder="Name (e.g. CoolCat)"
                  className="bg-surface-light border border-border rounded-lg px-2 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent"
                />
                <input
                  value={newEmojiShortcode}
                  onChange={(e) => setNewEmojiShortcode(e.target.value)}
                  placeholder="Shortcode (e.g. mycat)"
                  className="bg-surface-light border border-border rounded-lg px-2 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent"
                />
                <input
                  value={newEmojiUrl}
                  onChange={(e) => setNewEmojiUrl(e.target.value)}
                  placeholder="Image URL (https://...)"
                  className="bg-surface-light border border-border rounded-lg px-2 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent"
                />
                <button onClick={handleAddEmoji} className="btn-primary text-xs py-1.5">
                  Add Emoji
                </button>
              </div>
              {customEmojis.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {customEmojis.map((ce) => (
                    <div key={ce.id} className="flex items-center gap-1 bg-surface-light rounded-lg px-2 py-1">
                      <img src={ce.imgUrl} alt={ce.name} className="w-4 h-4" />
                      <span className="text-[10px] text-white/60">{ce.shortcodes[0]}</span>
                      <button
                        onClick={() => emit('remove-custom-emoji', ce.id)}
                        className="text-white/30 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2 min-h-0">
            {messages.length === 0 && (
              <p className="text-base text-white/30 text-center mt-4">No messages yet. Say something!</p>
            )}
            {messages.map((msg) => {
              const isMe = msg.playerId === myPlayerId;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[90%] px-3 py-2 rounded-xl text-lg ${
                    isMe
                      ? 'bg-accent text-black rounded-br-none'
                      : 'bg-surface-light text-white rounded-bl-none'
                  }`}>
                    <div className={`flex items-center gap-1 mb-0.5 text-xs font-bold ${isMe ? 'text-black/60' : 'text-white/40'}`}>
                      <span>{msg.playerName}</span>
                      <span className="opacity-50">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className="break-words whitespace-pre-wrap leading-relaxed">
                      {renderCustomEmojis(msg.text, customEmojis)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input */}
          <div className="flex flex-col gap-1 px-3 py-2 border-t border-border shrink-0">
            {showEmoji && (
              <div ref={pickerRef} className="fixed bottom-20 right-4 z-50">
                <React.Suspense fallback={
                  <div className="w-80 h-96 bg-surface-light rounded-xl flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  </div>
                }>
                  <EmojiPicker
                    onEmojiClick={(emojiData: { emoji: string }) => {
                      setInput((prev) => prev + emojiData.emoji);
                    }}
                    width={340}
                    height={400}
                    previewConfig={{ showPreview: false }}
                  />
                </React.Suspense>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowEmoji(!showEmoji); setShowEmojiManager(false); playClick(); }}
                className={`p-2 rounded-lg transition-colors ${showEmoji ? 'bg-accent/20 text-accent' : 'hover:bg-surface-light text-white/40 hover:text-white'}`}
              >
                <Smile size={16} />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                placeholder="Type a message..."
                maxLength={500}
                className="flex-1 min-w-0 bg-surface-light border border-border rounded-xl px-3 py-2 text-base text-white placeholder-white/30 focus:outline-none focus:border-accent transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="p-2 rounded-lg bg-accent text-black hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Mobile floating chat button */}
    {collapsed && (
      <button
        onClick={() => { setCollapsed(false); playClick(); }}
        className="fixed bottom-4 right-4 z-50 md:hidden w-12 h-12 rounded-full glass-card hover:bg-surface-light/50 transition-colors flex items-center justify-center shadow-lg"
        title="Open Chat"
      >
        <MessageSquare size={20} className="text-white/60" />
        {messages.length > 0 && (
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-accent rounded-full border-2 border-surface" />
        )}
      </button>
    )}
  </>
  );
}
