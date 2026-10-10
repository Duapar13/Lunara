import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { api, errorMessage } from './api';
import { useSocketEvent } from './socket';
import type { Consultation, Reader } from './types';

/** Charge une ressource et la recharge à chaque retour sur l'écran. */
export function useFetch<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!path) return;
      if (isRefresh) setRefreshing(true);
      try {
        setData(await api<T>(path));
        setError(null);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [path],
  );

  // Se relance au retour sur l'écran et quand `path` change (filtres).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { data, setData, error, loading, refreshing, refresh: () => load(true), reload: () => load() };
}

/** Liste de voyantes avec mise à jour en direct du statut « En línea » et des favoris. */
export function useReaders(path: string) {
  const { data, setData, ...rest } = useFetch<{ readers: Reader[] }>(path);

  useSocketEvent<{ readerId: number; online: boolean }>('reader:presence', ({ readerId, online }) => {
    setData((d) => d && { readers: d.readers.map((r) => (r.id === readerId ? { ...r, online } : r)) });
  });

  const toggleFavorite = useCallback(
    async (reader: Reader) => {
      const next = !reader.isFavorite;
      setData((d) => d && { readers: d.readers.map((r) => (r.id === reader.id ? { ...r, isFavorite: next } : r)) });
      try {
        await api(`/me/favorites/${reader.id}`, { method: next ? 'PUT' : 'DELETE' });
      } catch {
        setData((d) => d && { readers: d.readers.map((r) => (r.id === reader.id ? { ...r, isFavorite: !next } : r)) });
      }
    },
    [setData],
  );

  return { readers: data?.readers ?? [], setData, toggleFavorite, ...rest };
}

/** Consultations de l'utilisateur, rafraîchies quand le serveur signale un changement. */
export function useConsultations(scope: 'active' | 'history') {
  const result = useFetch<{ consultations: Consultation[] }>(`/consultations?scope=${scope}`);
  useSocketEvent('consultation:updated', () => result.reload());
  return { consultations: result.data?.consultations ?? [], ...result };
}
