import { useEffect, useState } from 'react';
import { api } from './api';

type AppConfig = { testMode: boolean };

let cached: AppConfig | null = null;
let pending: Promise<AppConfig> | null = null;

function loadConfig() {
  pending ??= api<AppConfig>('/config')
    .then((c) => (cached = c))
    .catch(() => ({ testMode: false }));
  return pending;
}

/** Configuration publique du serveur (mode test…), chargée une seule fois. */
export function useAppConfig(): AppConfig {
  const [config, setConfig] = useState<AppConfig>(cached ?? { testMode: false });
  useEffect(() => {
    if (cached) return;
    loadConfig().then(setConfig);
  }, []);
  return config;
}
