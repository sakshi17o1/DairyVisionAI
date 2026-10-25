import { createContext, useContext, useState, useCallback } from "react";
import { translations, LANGS } from "./translations";

const LanguageContext = createContext(null);

function loadLang() {
  try {
    const saved = localStorage.getItem("alsd_lang");
    if (saved && translations[saved]) return saved;
  } catch { /* ignore */ }
  return "en";
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(loadLang);

  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem("alsd_lang", l); } catch { /* ignore */ }
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key) => translations[lang]?.[key] ?? translations.en[key] ?? key,
    [lang]
  );

  // Translate model output labels (e.g. "Lumpy Skin", "stand"); falls back to the original text.
  const tv = useCallback((value) => {
    if (value === undefined || value === null) return value;
    const key = String(value).trim().toLowerCase();
    return translations[lang]?.values?.[key] ?? value;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tv, LANGS }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used inside <LanguageProvider>");
  return ctx;
}
