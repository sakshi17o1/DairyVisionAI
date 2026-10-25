import { useLang } from "../i18n/LanguageContext";

export default function LanguageSwitcher() {
  const { lang, setLang, LANGS, t } = useLang();
  return (
    <select
      aria-label={t("language")}
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #d3e8e0", background: "#fff", fontSize: 15 }}
    >
      {LANGS.map((l) => (
        <option key={l.code} value={l.code}>{l.label}</option>
      ))}
    </select>
  );
}
