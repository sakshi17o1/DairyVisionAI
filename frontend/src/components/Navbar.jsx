import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, UserCircle, AlertTriangle, Info, CheckCircle2, Download, Trash2, ServerCog } from "lucide-react";

import LanguageSwitcher from "./LanguageSwitcher";
import { useLang } from "../i18n/LanguageContext";
import { getResults, clearResults } from "../utils/resultsStore";
import { checkBackend } from "../services/api";

import "./navbar-extras.css";

const LOCALES = { en: "en-IN", hi: "hi-IN", pa: "pa-IN" };
const SEEN_KEY = "alsd_notif_seen";
const LOW_CONF = 0.8;

function readSeen() {
  try { return Number(localStorage.getItem(SEEN_KEY)) || 0; } catch { return 0; }
}
function writeSeen(ms) {
  try { localStorage.setItem(SEEN_KEY, String(ms)); } catch { /* ignore */ }
}

// Turn saved analysis results into notifications. Nothing is stored separately,
// so the bell always agrees with the Results page.
function buildNotifications(results) {
  const items = [];

  for (const entry of results.slice(0, 15)) {
    const ms = new Date(entry.timestamp).getTime() || 0;
    const { data, analysisType, source } = entry;

    if (analysisType === "behaviour") {
      if (data?.status === "no_cattle") {
        items.push({ id: `${entry.id}-nc`, ms, kind: "info", key: "notifNoCattle" });
      } else if (data?.low_confidence) {
        items.push({ id: `${entry.id}-bl`, ms, kind: "warn", key: "notifBehaviourLow", arg: data.behaviour });
      }
      continue;
    }

    if (data?.animal_count === 0) {
      items.push({ id: `${entry.id}-nc`, ms, kind: "info", key: "notifNoCattle" });
      continue;
    }

    (data?.animals || []).forEach((a, i) => {
      const cls = a.health_risk_class || "";
      const conf = Number(a.health_risk_confidence ?? 0);
      if (/lumpy/i.test(cls)) {
        items.push({ id: `${entry.id}-${i}-lsd`, ms, kind: "danger", key: "notifLumpy", arg: `${(conf <= 1 ? conf * 100 : conf).toFixed(0)}%` });
      } else if (conf < LOW_CONF) {
        items.push({ id: `${entry.id}-${i}-low`, ms, kind: "warn", key: "notifLowConf" });
      }
    });

    if (source === "live" && !items.some((n) => n.id.startsWith(entry.id))) {
      // nothing alarming in this live capture -> no notification
    }
  }

  return items.sort((a, b) => b.ms - a.ms).slice(0, 10);
}

function timeAgo(ms, lang, t) {
  const diff = Math.round((ms - Date.now()) / 1000);        // negative = past
  if (Math.abs(diff) < 45) return t("justNow");
  const rtf = new Intl.RelativeTimeFormat(LOCALES[lang] || "en-IN", { numeric: "auto" });
  const mins = Math.round(diff / 60);
  if (Math.abs(mins) < 60) return rtf.format(mins, "minute");
  const hrs = Math.round(mins / 60);
  if (Math.abs(hrs) < 24) return rtf.format(hrs, "hour");
  return rtf.format(Math.round(hrs / 24), "day");
}

function Navbar({ onNavigate }) {
  console.log("[ALSD-AI] Navbar v2 loaded (bell + admin menu)");
  const { t, tv, lang } = useLang();

  const [notifs, setNotifs] = useState([]);
  const [seen, setSeen] = useState(readSeen);
  const [openMenu, setOpenMenu] = useState(null);           // "bell" | "admin" | null
  const [backend, setBackend] = useState("checking");       // checking | online | offline
  const [installEvent, setInstallEvent] = useState(null);
  const wrapRef = useRef(null);

  const refresh = useCallback(() => {
    try { setNotifs(buildNotifications(getResults())); } catch { setNotifs([]); }
  }, []);

  // keep the bell fresh (results are saved by other pages in localStorage)
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 3000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [refresh]);

  // backend status (checked when the admin menu opens)
  const pingBackend = useCallback(() => {
    setBackend("checking");
    checkBackend().then(() => setBackend("online")).catch(() => setBackend("offline"));
  }, []);

  // PWA install prompt (Chrome/Edge/Android)
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallEvent(e); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  // close on outside click / Escape
  useEffect(() => {
    if (!openMenu) return undefined;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpenMenu(null); };
    const onKey = (e) => { if (e.key === "Escape") setOpenMenu(null); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [openMenu]);

  const unread = notifs.filter((n) => n.ms > seen).length;

  function toggle(which) {
    const next = openMenu === which ? null : which;
    setOpenMenu(next);
    if (next === "admin") pingBackend();
  }

  function markAllRead() {
    const now = Date.now();
    writeSeen(now);
    setSeen(now);
  }

  function go(page) {
    setOpenMenu(null);
    if (onNavigate) onNavigate(page);
  }

  function handleClear() {
    if (!window.confirm(t("adminClearConfirm"))) return;
    clearResults();
    writeSeen(Date.now());
    setSeen(Date.now());
    setNotifs([]);
    setOpenMenu(null);
    // Results page reads the store on mount, so send the user there for a fresh view
    if (onNavigate) onNavigate("results");
  }

  async function handleInstall() {
    if (!installEvent) return;
    installEvent.prompt();
    try { await installEvent.userChoice; } catch { /* ignore */ }
    setInstallEvent(null);
    setOpenMenu(null);
  }

  const iconFor = { danger: AlertTriangle, warn: Info, info: CheckCircle2 };

  const statusLabel = {
    checking: t("backendChecking"),
    online: t("backendOnline"),
    offline: t("backendOffline"),
  }[backend];

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <div className="brand-icon">🐄</div>

        <div>
          <h1>ALSD-AI</h1>
          <span>Animal Lumpy Skin Disease AI Detector</span>
        </div>
      </div>

      <div className="navbar-actions" ref={wrapRef}>
        <LanguageSwitcher />

        {/* ------------------------- BELL ------------------------- */}
        <div className="nx-wrap">
          <button
            type="button"
            className="icon-button nx-bell" data-testid="nx-bell"
            onClick={() => toggle("bell")}
            aria-label={t("notifTitle")}
            aria-expanded={openMenu === "bell"}
          >
            <Bell size={20} />
            {unread > 0 && <span className="nx-badge">{unread > 9 ? "9+" : unread}</span>}
          </button>

          {openMenu === "bell" && (
            <div className="nx-panel" role="dialog" aria-label={t("notifTitle")}>
              <div className="nx-head">
                <strong>{t("notifTitle")}</strong>
                {unread > 0 && (
                  <button type="button" className="nx-link" onClick={markAllRead}>{t("notifMarkRead")}</button>
                )}
              </div>

              {notifs.length === 0 ? (
                <div className="nx-empty">{t("notifEmpty")}</div>
              ) : (
                <ul className="nx-list">
                  {notifs.map((n) => {
                    const Icon = iconFor[n.kind] || Info;
                    const text = t(n.key)
                      .replace("{x}", n.arg !== undefined ? (n.key === "notifBehaviourLow" ? tv(n.arg) : n.arg) : "");
                    return (
                      <li key={n.id} className={`nx-item nx-${n.kind} ${n.ms > seen ? "nx-unread" : ""}`}>
                        <Icon size={18} className="nx-ico" />
                        <div>
                          <div>{text}</div>
                          <small>{timeAgo(n.ms, lang, t)}</small>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <button type="button" className="nx-foot" onClick={() => go("results")}>{t("notifViewAll")}</button>
            </div>
          )}
        </div>

        {/* ------------------------- ADMIN ------------------------- */}
        <div className="nx-wrap">
          <button
            type="button"
            className="profile nx-profile"
            onClick={() => toggle("admin")}
            aria-expanded={openMenu === "admin"}
          >
            <UserCircle size={32} />
            <span>Admin</span>
          </button>

          {openMenu === "admin" && (
            <div className="nx-panel nx-admin" role="menu">
              <div className="nx-head nx-col">
                <strong>Admin</strong>
                <small>{t("adminRole")}</small>
              </div>

              <div className={`nx-status nx-${backend}`}>
                <ServerCog size={16} /> {statusLabel}
                <button type="button" className="nx-link" onClick={pingBackend}>{t("backendRecheck")}</button>
              </div>

              <button type="button" className="nx-menuitem" onClick={() => go("results")}>{t("results")}</button>
              <button type="button" className="nx-menuitem" onClick={() => go("about")}>{t("about")}</button>

              {installEvent && (
                <button type="button" className="nx-menuitem" onClick={handleInstall}>
                  <Download size={16} /> {t("adminInstall")}
                </button>
              )}

              <button type="button" className="nx-menuitem nx-danger" onClick={handleClear}>
                <Trash2 size={16} /> {t("adminClear")}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;