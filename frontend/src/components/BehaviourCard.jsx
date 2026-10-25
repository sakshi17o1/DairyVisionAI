import { useLang } from "../i18n/LanguageContext";

function BehaviourCard({
  behaviour,
  confidence,
  framesAnalyzed = 6,
  clips
}) {

  const { t, tv } = useLang();

  if (!behaviour) {
    return null;
  }

  const description = clips
    ? t("behaviourDescClips")
        .replace("{clips}", clips)
        .replace("{frames}", framesAnalyzed)
    : t("behaviourDescFrames")
        .replace("{frames}", framesAnalyzed);

  return (

    <div className="result-card behaviour-card">

      <div className="result-card-icon">
        🐄
      </div>

      <div className="result-card-content">

        <div className="result-label">
          {t("behaviourEyebrow")}
        </div>

        <h3>
          {tv(behaviour)}
        </h3>

        <p>
          {t("confidence")}{" "}
          <strong>
            {Number(confidence).toFixed(2)}%
          </strong>
        </p>

        <p className="result-description">
          {description}
        </p>

      </div>

    </div>
  );
}

export default BehaviourCard;