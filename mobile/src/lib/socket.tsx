import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL } from './api';
import { useAuth } from './auth';

type Notice = { title: string; body: string; consultationId?: number };

type SocketContextValue = {
  socket: Socket | null;
  notice: Notice | null;
  dismissNotice: () => void;
  /** Consultation actuellement ouverte : ses messages ne déclenchent pas de bannière. */
  setActiveConsultation: (id: number | null) => void;
};

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [notice, setNotice] = useState<Notice | null>(null);
  const activeConsultation = useRef<number | null>(null);

  // Un socket par session ; il est recréé quand le jeton change (connexion / déconnexion).
  const socket = useMemo(
    () => (token ? io(API_URL, { auth: { token }, transports: ['websocket'], autoConnect: false }) : null),
    [token],
  );

  useEffect(() => {
    if (!socket) return;
    socket.on('notify', (n: Notice) => {
      if (n.consultationId && n.consultationId === activeConsultation.current) return;
      setNotice(n);
    });
    socket.connect();
    return () => {
      socket.off('notify');
      socket.disconnect();
    };
  }, [socket]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const dismissNotice = useCallback(() => setNotice(null), []);
  const setActiveConsultation = useCallback((id: number | null) => {
    activeConsultation.current = id;
  }, []);

  const value = useMemo(
    () => ({ socket, notice, dismissNotice, setActiveConsultation }),
    [socket, notice, dismissNotice, setActiveConsultation],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket doit être utilisé dans <SocketProvider>');
  return ctx;
}

/** Abonne un composant à un événement Socket.io ; le handler le plus récent est toujours utilisé. */
export function useSocketEvent<T>(event: string, handler: (payload: T) => void) {
  const { socket } = useSocket();
  const onEvent = useEffectEvent(handler);
  useEffect(() => {
    if (!socket) return;
    const listener = (payload: T) => onEvent(payload);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [socket, event]);
}
