import { useEffect, useState } from "react";
import { API_BASE_URL } from "../services/api";
import { useLang } from "../i18n/LanguageContext";

// Usage: <LSDAdvice healthClass={animal.health_risk_class} />
export default function LSDAdvice({ healthClass }) {
  const { lang, t } = useLang();
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!healthClass) return;
    let cancelled = false;
    fetch(`${API_BASE_URL}/advice?health_class=${encodeURIComponent(healthClass)}&lang=${lang}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setData(null));
    return () => { cancelled = true; };
  }, [healthClass, lang]);

  if (!data) return null;
  const high = data.level === "high";
  return (
    <div style={{
      marginTop: 16, padding: 18, borderRadius: 16,
      background: high ? "#fef2f2" : "#f0fdf4",
      border: `2px solid ${high ? "#fca5a5" : "#86efac"}`,
    }}>
      <div style={{ fontWeight: 700, fontSize: 18, color: high ? "#991b1b" : "#166534" }}>
        {high ? "⚠️ " : "✅ "}{data.title}
      </div>
      <div style={{ fontSize: 13, color: "#6b7280", margin: "2px 0 8px" }}>{t("recommendations")}</div>
      <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
        {data.steps.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
      <p style={{ fontSize: 13, color: "#6b7280", marginTop: 10 }}>{data.disclaimer}</p>
    </div>
  );
}
