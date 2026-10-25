import {
  LayoutDashboard,
  ScanSearch,
  Camera,
  BarChart3,
  Info,
} from "lucide-react";
import { useLang } from "../i18n/LanguageContext";

function Sidebar({ activePage, onNavigate }) {
  const { t } = useLang();

  const items = [
    { id: "dashboard", icon: LayoutDashboard, label: t("dashboard") },
    { id: "analyze", icon: ScanSearch, label: t("analyze") },
    { id: "live", icon: Camera, label: t("live") },
    { id: "results", icon: BarChart3, label: t("results") },
    { id: "about", icon: Info, label: t("about") },
  ];

  return (
    <aside className="sidebar">
      <nav>
        {items.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            className={`nav-item ${activePage === id ? "active" : ""}`}
            onClick={() => onNavigate(id)}
          >
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;