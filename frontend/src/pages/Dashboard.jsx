import {
  Image,
  Video,
  Camera,
  ScanSearch,
  Activity,
  ShieldCheck,
  Brain,
} from "lucide-react";
import { useLang } from "../i18n/LanguageContext";

function Dashboard({ onNavigate }) {
  const { t } = useLang();

  return (
    <div className="dashboard">

      {/* ================= HEADER ================= */}
      <div className="dashboard-header">
        <div className="eyebrow">{t("dashEyebrow")}</div>
        <h2>{t("welcome")} 🐄</h2>
        <p>{t("tagline")}</p>
      </div>

      {/* ================= ANALYSIS OPTIONS ================= */}
      <div className="section-title">
        <h3>{t("startAnalysis")}</h3>
      </div>

      <div className="analysis-options">

        <div className="analysis-card" onClick={() => onNavigate("analyze")}>
          <Image size={28} />
          <h3>{t("analyzeImage")}</h3>
          <p>{t("analyzeImageDesc")}</p>
        </div>

        <div className="analysis-card" onClick={() => onNavigate("analyze")}>
          <Video size={28} />
          <h3>{t("analyzeVideo")}</h3>
          <p>{t("analyzeVideoDesc")}</p>
        </div>

        <div className="analysis-card" onClick={() => onNavigate("live")}>
          <Camera size={28} />
          <h3>{t("live")}</h3>
          <p>{t("liveDesc")}</p>
        </div>

      </div>

      {/* ================= AI CAPABILITIES ================= */}
      <div className="section-title">
        <h3>{t("aiCapabilities")}</h3>
      </div>

      <div className="capability-grid">

        <div className="capability-card">
          <ScanSearch size={24} />
          <h4>{t("capSpeciesTitle")}</h4>
          <p>{t("capSpeciesDesc")}</p>
        </div>

        <div className="capability-card">
          <Activity size={24} />
          <h4>{t("bcs")}</h4>
          <p>{t("capBcsDesc")}</p>
        </div>

        <div className="capability-card">
          <ShieldCheck size={24} />
          <h4>{t("healthRisk")}</h4>
          <p>{t("capHealthDesc")}</p>
        </div>

        <div className="capability-card">
          <Brain size={24} />
          <h4>{t("capBehaviourTitle")}</h4>
          <p>{t("capBehaviourDesc")}</p>
        </div>

      </div>

    </div>
  );
}

export default Dashboard;
