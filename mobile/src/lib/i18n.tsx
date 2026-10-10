import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { storage } from './storage';
import { FR } from './fr';

export type Lang = 'es' | 'fr';

const LANG_KEY = 'lunara.lang';
let current: Lang = 'es';

/**
 * Traduit un texte de l'interface. La clé est le texte espagnol (langue par défaut de l'app) ;
 * en français, on renvoie la traduction de FR si elle existe. `{nom}` est remplacé par vars.nom.
 */
export function t(text: string, vars?: Record<string, string | number>) {
  let out = current === 'fr' ? (FR[text] ?? text) : text;
  if (vars) for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v));
  return out;
}

export const getLang = () => current;

/** Locale pour les dates et heures. */
export const locale = () => (current === 'fr' ? 'fr-FR' : 'es-PE');

type LangContextValue = { lang: Lang; setLang: (lang: Lang) => void; ready: boolean };
const LangContext = createContext<LangContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('es');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    storage
      .get(LANG_KEY)
      .then((saved) => {
        if (saved === 'fr' || saved === 'es') {
          current = saved;
          setLangState(saved);
        }
      })
      .finally(() => setReady(true));
  }, []);

  const setLang = useCallback((next: Lang) => {
    current = next;
    setLangState(next);
    storage.set(LANG_KEY, next).catch(() => {});
  }, []);

  const value = useMemo(() => ({ lang, setLang, ready }), [lang, setLang, ready]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang doit être utilisé dans <LanguageProvider>');
  return ctx;
}
