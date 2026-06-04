import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '../../shared/types';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket() {
  const socketRef = useRef<AppSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [serverUrl, setServerUrl] = useState('http://localhost:3000');

  useEffect(() => {
    async function init() {
      let url = 'http://localhost:3000';
      if (typeof window !== 'undefined' && window.whosnextAPI?.getServerUrl) {
        url = await window.whosnextAPI.getServerUrl();
      }
      setServerUrl(url);

      const socket: AppSocket = io(url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
      });

      socket.on('connect', () => {
        console.log('[Socket] Connected:', socket.id);
        setConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('[Socket] Disconnected');
        setConnected(false);
      });

      socket.on('error', (msg) => {
        console.error('[Socket] Error:', msg);
      });

      socketRef.current = socket;
    }

    init();

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const emit = useCallback(
    <T extends keyof ClientToServerEvents>(event: T, ...args: Parameters<ClientToServerEvents[T]>) => {
      socketRef.current?.emit(event, ...args);
    },
    []
  );

  const on = useCallback(
    <T extends keyof ServerToClientEvents>(event: T, handler: ServerToClientEvents[T]) => {
      socketRef.current?.on(event, handler as any);
      return () => {
        socketRef.current?.off(event, handler as any);
      };
    },
    []
  );

  return { socket: socketRef.current, connected, emit, on, serverUrl };
}
