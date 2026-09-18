'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { translate, type Language } from './translate';

const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void }>({ language: 'en', setLanguage: () => {} });
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, updateLanguage] = useState<Language>('en');
  useEffect(() => {
    try { if (localStorage.getItem('simulation-hub-language') === 'el') updateLanguage('el'); } catch { /* Preferences remain available without storage. */ }
    const sync = (event: StorageEvent) => { if (event.key === 'simulation-hub-language') updateLanguage(event.newValue === 'el' ? 'el' : 'en'); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const setLanguage = useCallback((value: Language) => {
    updateLanguage(value);
    try { localStorage.setItem('simulation-hub-language', value); } catch { /* Do not block language changes. */ }
  }, []);
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}
export function useLanguage() { return useContext(LanguageContext); }
export function useT() {
  const { language } = useLanguage();
  return useCallback(<T,>(value: T): T => typeof value === 'string' ? translate(value, language) as T : value, [language]);
}
