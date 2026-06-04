import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '../../shared/types.js';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let sharedSocket: AppSocket | null = null;
let initPromise: Promise<AppSocket> | null = null;
let sharedUrl = 'http://localhost:3000';

async function initSocket(): Promise<AppSocket> {
  if (sharedSocket) return sharedSocket;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    let url = 'http://localhost:3000';
    if (typeof window !== 'undefined' && window.whosnextAPI?.getServerUrl) {
      url = await window.whosnextAPI.getServerUrl();
    }
    sharedUrl = url;
    const socket: AppSocket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
    });
    sharedSocket = socket;
    return socket;
  })();

  return initPromise;
}

export function useSocket() {
  const [connected, setConnected] = useState(sharedSocket?.connected ?? false);
  const [serverUrl, setServerUrl] = useState('http://localhost:3000');

  useEffect(() => {
    let mounted = true;
    let removeListeners: (() => void) | undefined;

    initSocket().then((socket) => {
      if (!mounted) return;
      setServerUrl(sharedUrl);
      setConnected(socket.connected);

      const onConnect = () => setConnected(true);
      const onDisconnect = () => setConnected(false);
      const onError = (msg: string) => console.error('[Socket] Error:', msg);

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('error', onError);

      removeListeners = () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('error', onError);
      };
    });

    return () => {
      mounted = false;
      removeListeners?.();
    };
  }, []);

  const emit = useCallback(
    <T extends keyof ClientToServerEvents & (string | symbol)>(
      event: T,
      ...args: Parameters<ClientToServerEvents[T]>
    ) => {
      sharedSocket?.emit(event, ...args);
    },
    []
  );

  const on = useCallback(
    <T extends keyof ServerToClientEvents & (string | symbol)>(
      event: T,
      handler: ServerToClientEvents[T]
    ) => {
      const h = handler as any;
      sharedSocket?.on(event, h);
      return () => {
        sharedSocket?.off(event, h);
      };
    },
    []
  );

  return { socket: sharedSocket, connected, emit, on, serverUrl };
}
