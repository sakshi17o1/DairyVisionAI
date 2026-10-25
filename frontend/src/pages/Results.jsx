import { useEffect, useState } from "react";

import {
  Trash2,
  ScanSearch,
  PawPrint,
  Activity,
  ShieldAlert,
  Camera,
  Upload,
} from "lucide-react";

import { getResults, clearResults } from "../utils/resultsStore";
import { useLang } from "../i18n/LanguageContext";


const LOCALES = { en: "en-IN", hi: "hi-IN", pa: "pa-IN" };


function formatConfidence(value, na) {

  if (value === undefined || value === null) {
    return na;
  }

  // Tasks 1-4 confidences are fractions (0-1).
  // Behaviour confidence already comes as a percent.
  const num = Number(value);

  const pct = num <= 1 ? num * 100 : num;

  return `${pct.toFixed(2)}%`;

}


function formatTimestamp(iso, lang) {

  try {

    return new Date(iso).toLocaleString(LOCALES[lang] || "en-IN");

  } catch (err) {

    return iso;

  }

}


// ==================================================================
// ONE RESULT CARD
// ==================================================================

function ResultEntry({ entry }) {

  const { t, tv, lang } = useLang();

  const { data, analysisType, source, timestamp } = entry;

  const animal = data?.animals?.[0];

  const na = t("na");
  const unknown = t("unknown");
  const conf = (v) => formatConfidence(v, na);

  const noCattle =
    (analysisType === "image" && data?.animal_count === 0) ||
    (analysisType === "behaviour" && data?.status === "no_cattle");


  return (

    <div className="result-card" style={{ flexDirection: "column" }}>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          marginBottom: "10px"
        }}
      >

        <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "8px" }}>

          {source === "live" ? <Camera size={14} /> : <Upload size={14} />}

          {source === "live" ? t("srcLive") : t("srcUpload")}
          {" · "}
          {analysisType === "behaviour" ? t("typeBehaviourCaps") : t("typeImageCaps")}

        </div>

        <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
          {formatTimestamp(timestamp, lang)}
        </span>

      </div>


      {noCattle && (

        <p style={{ margin: 0 }}>
          {t("noCattleResult")}
        </p>

      )}


      {!noCattle && analysisType === "image" && animal && (

        <div style={{ display: "grid", gap: "8px", width: "100%" }}>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <PawPrint size={16} />
            <strong>{tv(animal.species) || unknown}</strong>
            <span>({conf(animal.species_confidence)})</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <PawPrint size={16} />
            {t("breed")}: <strong>{animal.breed || unknown}</strong>
            <span>({conf(animal.breed_confidence)})</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={16} />
            {t("bcs")}: <strong>{tv(animal.bcs_class) || unknown}</strong>
            <span>({conf(animal.bcs_confidence)})</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldAlert size={16} />
            {t("healthRisk")}: <strong>{tv(animal.health_risk_class) || unknown}</strong>
            <span>({conf(animal.health_risk_confidence)})</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ScanSearch size={16} />
            {t("detectionConfidence")}: {conf(animal.detection?.confidence)}
          </div>

        </div>

      )}


      {!noCattle && analysisType === "behaviour" && (

        <div style={{ display: "grid", gap: "8px", width: "100%" }}>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Activity size={16} />
            {t("behaviour")}:{" "}
            <strong>
              {data?.low_confidence
                ? t("uncertainClosest").replace("{x}", tv(data.behaviour))
                : tv(data?.behaviour) || unknown}
            </strong>
          </div>

          <div>
            {t("confidence")}: {conf(data?.confidence)}
          </div>

          {data?.clips_analyzed && (

            <div>
              {t("clipsAnalyzed")}: {data.clips_analyzed} x {data.frames_analyzed} {t("frames")}
              {data?.agreement !== undefined &&
                ` · ${t("agreement")}: ${Math.round(data.agreement * 100)}%`}
            </div>

          )}

        </div>

      )}

    </div>

  );

}


// ==================================================================
// PAGE
// ==================================================================

function Results() {

  const { t } = useLang();

  const [results, setResults] = useState([]);


  useEffect(() => {

    setResults(getResults());

  }, []);


  const handleClear = () => {

    clearResults();
    setResults([]);

  };


  return (

    <div className="analyze-page">

      <div className="page-header">

        <div className="eyebrow">
          {t("resultsEyebrow")}
        </div>

        <h2>{t("results")}</h2>

        <p>
          {t("resultsPara")}
        </p>

      </div>


      {results.length === 0 ? (

        <div className="upload-section">

          <h3>{t("noResultsTitle")}</h3>

          <p>
            {t("noResultsPara")}
          </p>

        </div>

      ) : (

        <>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "18px"
            }}
          >

            <button
              className="control-button danger"
              onClick={handleClear}
              type="button"
            >

              <Trash2 size={30} />
              {t("clearAll")}

            </button>

          </div>


          <div style={{ display: "grid", gap: "16px" }}>

            {results.map((entry) => (
              <ResultEntry key={entry.id} entry={entry} />
            ))}

          </div>

        </>

      )}

    </div>

  );

}


export default Results;