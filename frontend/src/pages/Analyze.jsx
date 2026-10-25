import { useState, useEffect } from "react";

import {
  Upload,
  X,
  LoaderCircle,
  ScanSearch,
  PawPrint,
  Activity,
  ShieldAlert,
} from "lucide-react";

import { API_BASE_URL } from "../services/api";
import BehaviourCard from "../components/BehaviourCard";
import AnnotatedImage from "../components/AnnotatedImage";
import { saveResult } from "../utils/resultsStore";
import LSDAdvice from "../components/LSDAdvice";
import { useLang } from "../i18n/LanguageContext";
import ResultExtras from "../components/ResultExtras";
function Analyze() {

  const { t, tv } = useLang();

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState(null);

  const [error, setError] = useState("");


  // ==========================================================
  // FILE SELECT
  // ==========================================================

  const handleFileChange = (event) => {

    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }


    // Allow only image or video
    if (
      !selectedFile.type.startsWith("image/") &&
      !selectedFile.type.startsWith("video/")
    ) {

      setError(
        t("errInvalidFile")
      );

      return;
    }


    // Remove old preview URL
    if (preview) {
      URL.revokeObjectURL(preview);
    }


    setFile(selectedFile);
    setResult(null);
    setError("");


    const previewUrl =
      URL.createObjectURL(selectedFile);

    setPreview(previewUrl);
  };


  // ==========================================================
  // REMOVE FILE
  // ==========================================================

  const removeFile = () => {

    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
  };


  // ==========================================================
  // CLEAN PREVIEW WHEN COMPONENT UNMOUNTS
  // ==========================================================

  useEffect(() => {

    return () => {

      if (preview) {
        URL.revokeObjectURL(preview);
      }

    };

  }, [preview]);


  // ==========================================================
  // ANALYZE FILE
  // ==========================================================

  const handleAnalyze = async () => {

    if (!file) {

      setError(
        t("errSelectFirst")
      );

      return;
    }


    setLoading(true);
    setResult(null);
    setError("");


    try {

      const formData = new FormData();

      formData.append(
        "file",
        file
      );


    // ======================================================
    // IMAGE → TASKS 1–4
    //
    // VIDEO → TASK 5 BEHAVIOUR
    // ======================================================

      const isVideo =
        file.type.startsWith("video/");


      const endpoint = isVideo
        ? `${API_BASE_URL}/analyze-behaviour`
        : `${API_BASE_URL}/analyze`;


      console.log(
        "🔍 Analysis type:",
        isVideo
          ? "Behaviour Video"
          : "Livestock Image"
     );


      const response = await fetch(
        endpoint,
        {
          method: "POST",
          body: formData,
        }
      );


      // Safely read backend response
      const data = await response.json();


      console.log(
        "✅ AI Result:",
        data
      );


      // Backend error
      if (!response.ok) {

        throw new Error(
          data.detail ||
          data.message ||
          "Analysis failed."
        );

      }


      // Some backend errors may return HTTP 200
      if (
        data.status === "error"
      ) {

        throw new Error(
          data.message ||
          "Analysis failed."
        );

      }


      // Save result
      setResult(data);

      saveResult({
        source: "upload",
        analysisType: isVideo ? "behaviour" : "image",
        data
      });


    } catch (err) {

      console.error(
        "❌ Analysis Error:",
        err
      );


      setError(
        err.message ||
        t("errBackend")
      );


    } finally {

      setLoading(false);

    }

  };


  // ==========================================================
  // CONFIDENCE FORMAT
  // ==========================================================
  //
  // Tasks 1–4 backend values are fractions:
  // 0.9916 → 99.16%
  //
  // Behaviour endpoint already returns:
  // 99.16
  //
  // Therefore DO NOT use this function for behaviour.
  // ==========================================================

  const formatConfidence = (value) => {

    if (
      value === undefined ||
      value === null
    ) {

      return "N/A";

    }


    return `${(
      Number(value) * 100
    ).toFixed(2)}%`;

  };


  // ==========================================================
  // FIRST DETECTED ANIMAL
  // ==========================================================

  const animal =
    result?.animals?.[0];


  // ==========================================================
  // UI
  // ==========================================================

  return (

    <div className="analyze-page">


      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="page-header">

        <div className="eyebrow">
          {t("aiAnalysisEyebrow")}
        </div>

        <h2>
          {t("analyzeLivestock")}
        </h2>

        <p>
          {t("analyzePara")}
        </p>

      </div>


      {/* ====================================================
          UPLOAD SECTION
      ==================================================== */}

      {!file && (

        <div className="upload-section">

          <div className="upload-icon">

            <Upload size={30} />

          </div>


          <h3>
            {t("uploadTitle")}
          </h3>


          <p>
            {t("uploadSub")}
          </p>


          <label className="upload-button">

            <Upload size={18} />

            {t("chooseFile")}


            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              hidden
            />

          </label>


          <span className="upload-info">

            Images: JPG, JPEG, PNG

            <br />

            Videos: MP4, AVI, MOV, MKV, WEBM

          </span>

        </div>

      )}


      {/* ====================================================
          SELECTED FILE
      ==================================================== */}

      {file && (

        <div className="preview-section">


          {/* FILE HEADER */}

          <div className="preview-header">

            <div>

              <h3>
                {t("selectedFile")}
              </h3>

              <p>
                {file.name}
              </p>

            </div>


            <button
              className="remove-button"
              onClick={removeFile}
              disabled={loading}
              type="button"
            >

              <X size={18} />

            </button>

          </div>


          {/* ==================================================
              IMAGE PREVIEW
              After analysis, show bounding boxes + confidence
              instead of the plain image.
          ================================================== */}

          {file.type.startsWith("image/") && (

            <div className="preview-container">

              {result?.analysis_type === "image" &&
               result.animals?.length > 0 ? (

                <AnnotatedImage
                  src={preview}
                  animals={result.animals}
                />

              ) : (

                <img
                  src={preview}
                  alt="Livestock preview"
                  className="media-preview"
                />

              )}

            </div>

          )}


          {/* ==================================================
              VIDEO PREVIEW
          ================================================== */}

          {file.type.startsWith("video/") && (

            <div className="preview-container">

              <video
                src={preview}
                controls
                playsInline
                className="media-preview"
              />

            </div>

          )}


          {/* ==================================================
              ANALYZE BUTTON
          ================================================== */}

          <button
            className="analyze-button"
            onClick={handleAnalyze}
            disabled={loading}
            type="button"
          >

            {loading ? (

              <>

                <LoaderCircle
                  size={18}
                  className="loading-icon"
                />

                {t("analyzing")}

              </>

            ) : (

              <>

                <ScanSearch size={18} />

                {t("analyzeWithAI")}

              </>

            )}

          </button>


        </div>

      )}


      {/* ====================================================
          ERROR
      ==================================================== */}

      {error && (

        <div className="error-message">

          <strong>
            {t("analysisError")}
          </strong>

          <p>
            {error}
          </p>

        </div>

      )}


      {/* ====================================================
          NO CATTLE — IMAGE
      ==================================================== */}

      {result &&
       result.analysis_type === "image" &&
       result.animal_count === 0 && (

        <div className="error-message">

          <strong>
            {t("noCattle")}
          </strong>

          <p>
            {t("noCattleHint")}
          </p>

        </div>

      )}


      {/* ====================================================
          NO CATTLE — BEHAVIOUR
      ==================================================== */}

      {result &&
       result.analysis_type === "behaviour" &&
       result.status === "no_cattle" && (

        <div className="error-message">

          <strong>
            {t("behaviourSkipped")}
          </strong>

          <p>
            {result.message}
          </p>

        </div>

      )}


      {/* ====================================================
          IMAGE RESULTS
          TASKS 1–4
      ==================================================== */}

      {result &&
       result.analysis_type === "image" &&
       animal && (

        <div className="analysis-result">


          {/* ==================================================
              SUCCESS
          ================================================== */}

          <div className="result-success">

            <Activity size={22} />

            <div>

              <strong>
                {t("analysisCompleted")}
              </strong>

              <p>
                {t("analysisCompletedMsg")}
              </p>

            </div>

          </div>


          {/* ==================================================
              TASK 1 — ANIMAL DETECTION
          ================================================== */}

          <div className="result-card">

            <div className="result-card-icon">

              <ScanSearch size={25} />

            </div>


            <div className="result-card-content">

              <div className="eyebrow">
                {t("detectionEyebrow")}
              </div>


              <h2>

                {result.animal_count || 0}

                {" "}

                {result.animal_count === 1
                  ? t("animal") : t("animals")}

                {" "}

                {t("detected")}

              </h2>


              <div className="confidence-row">

                <span>
                  {t("confidence")}
                </span>

                <strong>

                  {formatConfidence(
                    animal.detection?.confidence
                  )}

                </strong>

              </div>


              <div className="confidence-bar">

                <div
                  className="confidence-fill"
                  style={{
                    width: `${Math.min(
                      Number(
                        animal.detection?.confidence || 0
                      ) * 100,
                      100
                    )}%`
                  }}
                />

              </div>

            </div>

          </div>


          {/* ==================================================
              TASK 2 — SPECIES
          ================================================== */}

          <div className="result-card">

            <div className="result-card-icon">

              <PawPrint size={25} />

            </div>


            <div className="result-card-content">

              <div className="eyebrow">
                {t("speciesEyebrow")}
              </div>


              <h2>
                {tv(animal.species) || t("unknown")}
              </h2>


              <div className="confidence-row">

                <span>
                  {t("confidence")}
                </span>

                <strong>

                  {formatConfidence(
                    animal.species_confidence
                  )}

                </strong>

              </div>


              <div className="confidence-bar">

                <div
                  className="confidence-fill"
                  style={{
                    width: `${Math.min(
                      Number(
                        animal.species_confidence || 0
                      ) * 100,
                      100
                    )}%`
                  }}
                />

              </div>

            </div>

          </div>


          {/* ==================================================
              TASK 2 — BREED
          ================================================== */}

          <div className="result-card">

            <div className="result-card-icon">

              <PawPrint size={25} />

            </div>


            <div className="result-card-content">

              <div className="eyebrow">
                {t("breedEyebrow")}
              </div>


              <h2>
                {animal.breed || t("unknown")}
              </h2>


              <div className="confidence-row">

                <span>
                  {t("confidence")}
                </span>

                <strong>

                  {formatConfidence(
                    animal.breed_confidence
                  )}

                </strong>

              </div>


              <div className="confidence-bar">

                <div
                  className="confidence-fill"
                  style={{
                    width: `${Math.min(
                      Number(
                        animal.breed_confidence || 0
                      ) * 100,
                      100
                    )}%`
                  }}
                />

              </div>

            </div>

          </div>


          {/* ==================================================
              TASK 3 — BODY CONDITION SCORE
          ================================================== */}

          <div className="result-card">

            <div className="result-card-icon">

              <Activity size={25} />

            </div>


            <div className="result-card-content">

              <div className="eyebrow">
                {t("bcsEyebrow")}
              </div>


              <h2>
                {tv(animal.bcs_class) || t("unknown")}
              </h2>


              <div className="confidence-row">

                <span>
                  {t("confidence")}
                </span>

                <strong>

                  {formatConfidence(
                    animal.bcs_confidence
                  )}

                </strong>

              </div>


              <div className="confidence-bar">

                <div
                  className="confidence-fill"
                  style={{
                    width: `${Math.min(
                      Number(
                        animal.bcs_confidence || 0
                      ) * 100,
                      100
                    )}%`
                  }}
                />

              </div>

            </div>

          </div>


          {/* ==================================================
              TASK 4 — HEALTH RISK
          ================================================== */}

          <div className="result-card health-risk-card">

            <div className="result-card-icon">

              <ShieldAlert size={25} />

            </div>


            <div className="result-card-content">

              <div className="eyebrow">
                {t("healthEyebrow")}
              </div>


              <h2>
                {tv(animal.health_risk_class) || t("unknown")}
              </h2>


              <div className="confidence-row">

                <span>
                  {t("confidence")}
                </span>

                <strong>

                  {formatConfidence(
                    animal.health_risk_confidence
                  )}

                </strong>

              </div>


              <div className="confidence-bar">

                <div
                  className="confidence-fill"
                  style={{
                    width: `${Math.min(
                      Number(
                        animal.health_risk_confidence || 0
                      ) * 100,
                      100
                    )}%`
                  }}
                />

              </div>


              <p className="health-risk-note">

                {t("healthNote")}

              </p>

            </div>

          </div>


          <LSDAdvice healthClass={animal.health_risk_class} />

          <ResultExtras animal={animal} file={file} />          
          
          {/* ==================================================
              WHY NO BEHAVIOUR HERE
          ================================================== */}

          <p className="health-risk-note">
            {t("behaviourNeedsMotion")}
          </p>


          {/* ==================================================
              IMAGE SUMMARY
          ================================================== */}

          <div className="result-summary">

            <div>

              <span>{t("detectionClass")}</span>

              <strong>
                {tv(animal.detection?.class_name) || t("animal")}
              </strong>

            </div>


            <div>

              <span>{t("animalsFound")}</span>

              <strong>
                {result.animal_count}
              </strong>

            </div>


            <div>

              <span>{t("analysisType")}</span>

              <strong>
                {t("typeImage")}
              </strong>

            </div>

          </div>


        </div>

      )}


      {/* ====================================================
          TASK 5 — BEHAVIOUR ANALYSIS
          VIDEO RESULT
      ==================================================== */}

      {result &&
       result.analysis_type === "behaviour" &&
       result.status !== "no_cattle" && (

        <div className="analysis-result">


          {/* SUCCESS MESSAGE */}

          <div className="result-success">

            <Activity size={22} />

            <div>

              <strong>
                {t("behaviourCompleted")}
              </strong>

              <p>
                CNN + LSTM analysis on{" "}
                {result.clips_analyzed} clips of{" "}
                {result.frames_analyzed} frames each.
                Clip agreement:{" "}
                {Math.round((result.agreement ?? 0) * 100)}%.
              </p>

            </div>

          </div>


          {/* ==================================================
              BEHAVIOUR CARD
          ================================================== */}

          <BehaviourCard
            behaviour={
              result.low_confidence
                ? `${t("uncertain")} (${t("closest")}: ${tv(result.behaviour)})`
                : tv(result.behaviour) || t("unknown")
            }

            confidence={
              result.confidence ?? 0
            }

            framesAnalyzed={
              result.frames_analyzed || 6
            }

          />


          {/* ==================================================
              BEHAVIOUR SUMMARY
          ================================================== */}

          <div className="result-summary">

            <div>

              <span>
                {t("behaviour")}
              </span>

              <strong>
                {tv(result.behaviour) || t("unknown")}
              </strong>

            </div>


            <div>

              <span>{t("clipsAnalyzed")}</span>

              <strong>
                {result.clips_analyzed} x {result.frames_analyzed} frames
              </strong>

            </div>


            <div>

              <span>{t("analysisType")}</span>

              <strong>
                {t("behaviour")}
              </strong>

            </div>

          </div>


        </div>

      )}

    </div>

  );

}


export default Analyze;