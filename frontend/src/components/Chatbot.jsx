import { useState, useRef, useEffect } from "react";
import { API_BASE_URL } from "../services/api";
import { useLang } from "../i18n/LanguageContext";

// Floating chat widget. Mount once in App.jsx: <Chatbot />
export default function Chatbot() {
  const { lang, t } = useLang();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]); // {role, content}
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy, open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...msgs, { role: "user", content: text }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const r = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, lang }),
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setMsgs([...next, { role: "assistant", content: d.reply }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: t("chatError") }]);
    } finally { setBusy(false); }
  }

  const bubble = (m) => ({
    alignSelf: m === "user" ? "flex-end" : "flex-start",
    background: m === "user" ? "#0f766e" : "#f1f5f4",
    color: m === "user" ? "#fff" : "#12332b",
    padding: "10px 14px", borderRadius: 14, maxWidth: "85%", whiteSpace: "pre-wrap", fontSize: 15, lineHeight: 1.5,
  });

  return (
    <>
      <button className="chat-fab" onClick={() => setOpen(!open)} aria-label={t("chatTitle")}
        style={{ position: "fixed", right: 18, bottom: 18, width: 58, height: 58, borderRadius: "50%", border: "none",
          background: "#0f766e", color: "#fff", fontSize: 26, cursor: "pointer", boxShadow: "0 6px 18px rgba(0,0,0,.25)", zIndex: 1000 }}>
        {open ? "✕" : "💬"}
      </button>
      {open && (
        <div className="chat-panel" style={{ position: "fixed", right: 18, bottom: 88, width: "min(380px, calc(100vw - 36px))", height: "min(540px, 70vh)",
          background: "#fff", borderRadius: 18, boxShadow: "0 12px 40px rgba(0,0,0,.25)", display: "flex", flexDirection: "column", zIndex: 1000, overflow: "hidden" }}>
          <div style={{ background: "#0f766e", color: "#fff", padding: "14px 16px", fontWeight: 700 }}>🐄 {t("chatTitle")}</div>
          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={bubble("assistant")}>{t("chatHello")}</div>
            {msgs.map((m, i) => <div key={i} style={bubble(m.role)}>{m.content}</div>)}
            {busy && <div style={bubble("assistant")}>{t("chatThinking")}</div>}
            <div ref={endRef} />
          </div>
          <div style={{ display: "flex", gap: 8, padding: 10, borderTop: "1px solid #e5e7eb" }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={t("chatPlaceholder")} maxLength={1000}
              style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #d3e8e0", fontSize: 15 }} />
            <button onClick={send} disabled={busy}
              style={{ padding: "0 16px", borderRadius: 10, border: "none", background: "#0f766e", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
              {t("chatSend")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
