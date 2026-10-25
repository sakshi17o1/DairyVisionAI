import { useState } from "react";
import { API_BASE_URL } from "../services/api";
import { useLang } from "../i18n/LanguageContext";

// Day-2 extras for the single-animal result (uploaded photo):
//   1. alert banner (lumpy skin / low confidence)
//   2. Grad-CAM "why this result?" heat-map
//   3. "Download report" -> print-friendly page -> Save as PDF
//
// Usage in Analyze.jsx, right after <LSDAdvice ... />:
//   <ResultExtras animal={animal} file={file} />

const LOCALES = { en: "en-IN", hi: "hi-IN", pa: "pa-IN" };

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

const pct = (v) => {
  if (v === undefined || v === null) return "N/A";
  const n = Number(v);
  return `${(n <= 1 ? n * 100 : n).toFixed(2)}%`;
};

export default function ResultExtras({ animal, file }) {
  const { t, tv, lang } = useLang();
  const [cam, setCam] = useState(null);       // base64 png
  const [camState, setCamState] = useState("idle"); // idle | loading | error | no_cattle

  if (!animal) return null;

  const cls = animal.health_risk_class || "";
  const conf = Number(animal.health_risk_confidence ?? 0);
  const isLumpy = /lumpy/i.test(cls);
  const lowConf = conf < 0.8;
  const isImageFile = file && file.type && file.type.startsWith("image/");

  async function loadCam() {
    if (!isImageFile) return;
    setCamState("loading");
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await fetch(`${API_BASE_URL}/api/explain`, { method: "POST", body: form });
      if (!r.ok) throw new Error();
      const d = await r.json();
      if (d.status === "no_cattle") { setCamState("no_cattle"); return; }
      setCam(d.heatmap_png_base64);
      setCamState("idle");
    } catch {
      setCamState("error");
    }
  }

  async function downloadReport() {
    // Open the window synchronously (popup blockers), fill it after fetching advice.
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<p style="font-family:sans-serif">${esc(t("processing"))}</p>`);

    let advice = null;
    try {
      const r = await fetch(
        `${API_BASE_URL}/advice?health_class=${encodeURIComponent(cls)}&lang=${lang}`
      );
      if (r.ok) advice = await r.json();
    } catch { /* report still works without advice */ }

    const date = new Date().toLocaleString(LOCALES[lang] || "en-IN");
    const row = (label, value) =>
      `<tr><th>${esc(label)}</th><td>${esc(value)}</td></tr>`;

    const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">
<title>${esc(t("reportTitle"))}</title>
<style>
  body{font-family:"Segoe UI",Nirmala UI,Raavi,Arial,sans-serif;color:#12332b;margin:28px;line-height:1.5}
  h1{margin:0 0 4px;font-size:24px;color:#0f766e} .sub{color:#555;margin-bottom:18px;font-size:13px}
  table{border-collapse:collapse;width:100%;margin:12px 0} th,td{border:1px solid #cfe3dc;padding:8px 10px;text-align:left;font-size:14px}
  th{background:#f1f5f4;width:42%} .alert{border:2px solid ${isLumpy ? "#b91c1c" : "#0f766e"};
  border-radius:10px;padding:12px 14px;margin:14px 0} img{max-width:340px;border-radius:8px;border:1px solid #cfe3dc}
  ul{margin:6px 0 6px 18px;padding:0} .foot{margin-top:22px;font-size:12px;color:#555;border-top:1px solid #ddd;padding-top:10px}
  @media print{ body{margin:12mm} }
</style></head><body>
<h1>${esc(t("reportTitle"))}</h1>
<div class="sub">${esc(t("reportDate"))}: ${esc(date)} &nbsp;·&nbsp; ${esc(t("reportFile"))}: ${esc(file?.name || "-")}</div>
<table>
${row(t("species"), `${tv(animal.species)} (${pct(animal.species_confidence)})`)}
${row(t("breed"), `${animal.breed} (${pct(animal.breed_confidence)})`)}
${row(t("bcs"), `${tv(animal.bcs_class)} (${pct(animal.bcs_confidence)})`)}
${row(t("healthRisk"), `${tv(cls)} (${pct(animal.health_risk_confidence)})`)}
</table>
${advice ? `<div class="alert"><strong>${esc(advice.title)}</strong><ul>${(advice.steps || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>` : ""}
${cam ? `<h3>${esc(t("reportExplain"))}</h3><img src="data:image/png;base64,${cam}" alt="Grad-CAM"/><p style="font-size:12px;color:#555">${esc(t("gradcamNote"))}</p>` : ""}
<div class="foot">${esc(t("reportDisclaimer"))}</div>
<script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
</body></html>`;

    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  const box = (bg, border, color) => ({
    background: bg, border: `1.5px solid ${border}`, color,
    borderRadius: 14, padding: "12px 16px", marginTop: 14, lineHeight: 1.5,
  });
  const btn = {
    padding: "10px 16px", borderRadius: 10, border: "1px solid #0f766e", background: "#fff",
    color: "#0f766e", fontWeight: 600, cursor: "pointer", fontSize: 15,
  };

  const g = animal.guards || {};
  const top3 = (animal.breed_top3 || []).map((b) => `${b.breed} (${pct(b.confidence)})`).join(", ");

  return (
    <div>
      {g.partial_view && (
        <div role="note" style={box("#eff6ff", "#3b82f6", "#1e3a8a")}>
          <strong>📷 {t("tipPartialTitle")}</strong>
          <div>{t("tipPartialBody")}</div>
        </div>
      )}

      {g.breed_uncertain && top3 && (
        <div role="note" style={box("#eff6ff", "#3b82f6", "#1e3a8a")}>
          <strong>🐄 {t("tipBreedTitle")}</strong>
          <div>{top3}</div>
        </div>
      )}

      {isLumpy && (
        <div role="alert" style={box("#fef2f2", "#b91c1c", "#7f1d1d")}>
          <strong>⚠ {t("alertLumpyTitle")}</strong>
          <div>{t("alertLumpyBody")}</div>
        </div>
      )}

      {lowConf && (
        <div role="alert" style={box("#fffbeb", "#d97706", "#78350f")}>
          <strong>ℹ {t("alertLowTitle")}</strong>
          <div>{t("alertLowBody")}</div>
        </div>
      )}

      <div style={{ ...box("#fff", "#d3e8e0", "#12332b") }}>
        <strong>{t("gradcamTitle")}</strong>

        {!isImageFile && <div style={{ marginTop: 6 }}>{t("gradcamOnlyImages")}</div>}

        {isImageFile && !cam && (
          <div style={{ marginTop: 8 }}>
            <button type="button" style={btn} onClick={loadCam} disabled={camState === "loading"}>
              {camState === "loading" ? t("gradcamLoading") : t("gradcamBtn")}
            </button>
            {camState === "error" && <div style={{ color: "#b91c1c", marginTop: 6 }}>{t("gradcamError")}</div>}
            {camState === "no_cattle" && <div style={{ marginTop: 6 }}>{t("noCattle")}</div>}
          </div>
        )}

        {cam && (
          <div style={{ marginTop: 8 }}>
            <img
              src={`data:image/png;base64,${cam}`}
              alt="Grad-CAM"
              style={{ maxWidth: "100%", width: 420, borderRadius: 10, border: "1px solid #d3e8e0" }}
            />
            <div style={{ fontSize: 13, color: "#475569", marginTop: 6 }}>{t("gradcamNote")}</div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 14 }}>
        <button type="button" style={{ ...btn, background: "#0f766e", color: "#fff" }} onClick={downloadReport}>
          ⬇ {t("reportBtn")}
        </button>
      </div>
    </div>
  );
}