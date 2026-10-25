import { useLang } from "../i18n/LanguageContext";

function About() {
  const { t } = useLang();

  return (
    <div className="analyze-page">

      <div className="page-header">

        <div className="eyebrow">
          {t("aboutEyebrow")}
        </div>

        <h2>ALSD-AI</h2>

        <p>
          {t("aboutTagline")}
        </p>

      </div>


      <div className="preview-section">

        <h3>{t("projectTitle")}</h3>

        <p>
          {t("projectTitleValue")}
        </p>

        <br />

        <h3>{t("aiCapabilities")}</h3>

        <p>
          {t("aboutCapsPara")}
        </p>

      </div>

    </div>
  );
}

export default About;