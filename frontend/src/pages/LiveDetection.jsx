import { useRef, useState, useEffect } from "react";

import {
  Camera,
  Square,
  LoaderCircle,
  ScanSearch,
  PawPrint,
  Activity,
  ShieldAlert,
} from "lucide-react";

import AnnotatedImage from "../components/AnnotatedImage";
import { API_BASE_URL } from "../services/api";
import { saveResult } from "../utils/resultsStore";
import LSDAdvice from "../components/LSDAdvice";
import { useLang } from "../i18n/LanguageContext";


function LiveDetection() {

  const { t, tv } = useLang();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState(null);
  const [behaviourResult, setBehaviourResult] = useState(null);
  const [snapshotUrl, setSnapshotUrl] = useState(null);

  const [error, setError] = useState("");


  // ==========================================================
  // WAIT UNTIL CAMERA VIDEO IS REALLY READY
  // ==========================================================

  const waitForVideoReady = () => {

    return new Promise((resolve, reject) => {

      const video = videoRef.current;

      if (!video) {
        reject(new Error("Camera video element is not available."));
        return;
      }

      const check = () => {

        if (
          video.readyState >= 2 &&
          video.videoWidth > 0 &&
          video.videoHeight > 0
        ) {

          resolve();
          return;
        }

        setTimeout(check, 100);

      };

      check();

      setTimeout(() => {

        if (
          video.readyState < 2 ||
          video.videoWidth === 0
        ) {

          reject(
            new Error(
              "Camera frame is not ready. Please wait a moment and try again."
            )
          );

        }

      }, 10000);

    });

  };


  // ==========================================================
  // START CAMERA
  // ==========================================================

  const startCamera = async () => {

    setError("");
    setResult(null);
    setBehaviourResult(null);

    try {

      if (!navigator.mediaDevices?.getUserMedia) {

        throw new Error(
          "Camera access is not supported by this browser."
        );

      }

      const mediaStream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },  // back camera on phones, webcam on laptops
            width: {
              ideal: 1280
            },
            height: {
              ideal: 720
            }
          },
          audio: false
        });


      streamRef.current = mediaStream;


      const video = videoRef.current;

      if (!video) {

        mediaStream
          .getTracks()
          .forEach(track => track.stop());

        throw new Error(
          "Camera video element is not available."
        );

      }


      video.srcObject = mediaStream;

      video.muted = true;
      video.playsInline = true;


      await video.play();


      // IMPORTANT:
      // Wait until actual camera dimensions are available
      await waitForVideoReady();


      setCameraActive(true);

    } catch (err) {

      console.error(
        "Camera Error:",
        err
      );

      setError(
        err.message ||
        "Could not access the camera. Please allow camera permission."
      );

      setCameraActive(false);

    }

  };


  // ==========================================================
  // STOP CAMERA
  // ==========================================================

  const stopCamera = () => {

    const activeStream =
      streamRef.current;

    if (activeStream) {

      activeStream
        .getTracks()
        .forEach(track => track.stop());

    }

    streamRef.current = null;

    if (videoRef.current) {

      videoRef.current.srcObject = null;

    }

    setCameraActive(false);

  };


  // ==========================================================
  // CAPTURE CURRENT CAMERA FRAME
  // ==========================================================

  const captureFrame = () => {

    return new Promise(async (resolve, reject) => {

      try {

        const video = videoRef.current;
        const canvas = canvasRef.current;

        if (!video || !canvas) {

          reject(
            new Error(
              "Camera frame elements are not available."
            )
          );

          return;
        }


        // Make absolutely sure camera is ready
        await waitForVideoReady();


        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;


        const context =
          canvas.getContext("2d");


        if (!context) {

          reject(
            new Error(
              "Could not create canvas context."
            )
          );

          return;

        }


        context.drawImage(
          video,
          0,
          0,
          canvas.width,
          canvas.height
        );


        canvas.toBlob(
          blob => {

            if (!blob) {

              reject(
                new Error(
                  "Could not capture camera frame."
                )
              );

              return;

            }

            resolve(blob);

          },
          "image/jpeg",
          0.90
        );


      } catch (err) {

        reject(err);

      }

    });

  };


  // ==========================================================
  // GET SUPPORTED VIDEO MIME TYPE
  // ==========================================================

  const getSupportedMimeType = () => {

    const types = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
      "video/mp4"
    ];


    for (const type of types) {

      if (
        window.MediaRecorder &&
        MediaRecorder.isTypeSupported(type)
      ) {

        return type;

      }

    }

    return "";

  };


  // ==========================================================
  // RECORD SHORT VIDEO FOR BEHAVIOUR
  // ==========================================================

  const recordBehaviourVideo = () => {

    return new Promise(async (resolve, reject) => {

      try {

        const activeStream =
          streamRef.current;


        if (!activeStream) {

          reject(
            new Error(
              "Camera stream is not active."
            )
          );

          return;

        }


        if (!window.MediaRecorder) {

          reject(
            new Error(
              "Video recording is not supported by this browser."
            )
          );

          return;

        }


        const mimeType =
          getSupportedMimeType();


        const options =
          mimeType
            ? { mimeType }
            : {};


        const recorder =
          new MediaRecorder(
            activeStream,
            options
          );


        const chunks = [];


        recorder.ondataavailable =
          event => {

            if (
              event.data &&
              event.data.size > 0
            ) {

              chunks.push(
                event.data
              );

            }

          };


        recorder.onerror =
          event => {

            reject(
              new Error(
                "Camera video recording failed."
              )
            );

          };


        recorder.onstop =
          () => {

            const blob =
              new Blob(
                chunks,
                {
                  type:
                    mimeType ||
                    "video/webm"
                }
              );


            if (blob.size === 0) {

              reject(
                new Error(
                  "Recorded video is empty."
                )
              );

              return;

            }


            resolve(blob);

          };


        recorder.start();


        // Record approximately 3 seconds.
        // Backend will sample several clips from this.
        setTimeout(() => {

          if (
            recorder.state !== "inactive"
          ) {

            recorder.stop();

          }

        }, 3000);


      } catch (err) {

        reject(err);

      }

    });

  };


  // ==========================================================
  // SEND PHOTO -> TASKS 1-4 (detection, species, breed, BCS, health)
  // ==========================================================

  const sendImage = async (frameBlob) => {

    const formData = new FormData();
    formData.append("file", frameBlob, "live_frame.jpg");

    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || data.message || "Live image analysis failed."
      );
    }

    return data;
  };


  // ==========================================================
  // SEND CLIP -> TASK 5 (behaviour)
  // ==========================================================

  const sendBehaviour = async (videoBlob) => {

    const formData = new FormData();
    formData.append("file", videoBlob, "live_behaviour.webm");

    const response = await fetch(`${API_BASE_URL}/analyze-behaviour`, {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail || data.message || "Behaviour analysis failed."
      );
    }

    return data;
  };


  // ==========================================================
  // ANALYZE LIVE CAMERA
  // Photo is taken at the moment of the click, recording starts at
  // the same moment, and both requests run in parallel.
  // ==========================================================

  const analyzeLive = async () => {

    if (!cameraActive) {
      setError(t("errStartCamera"));
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setBehaviourResult(null);

    try {

      await waitForVideoReady();

      // 1. PHOTO at the moment of the click
      const frameBlob = await captureFrame();

      if (snapshotUrl) {
        URL.revokeObjectURL(snapshotUrl);
      }

      setSnapshotUrl(URL.createObjectURL(frameBlob));

      // 2. Image analysis and behaviour recording start together.
      //    Image result is shown as soon as it arrives.
      const imagePromise = sendImage(frameBlob).then((data) => {
        setResult(data);
        saveResult({ source: "live", analysisType: "image", data });
        return data;
      });

      const behaviourPromise = recordBehaviourVideo()
        .then(sendBehaviour)
        .then((data) => {
          setBehaviourResult(data);
          saveResult({ source: "live", analysisType: "behaviour", data });
          return data;
        });

      // 3. One failure must not hide the other result
      const [imageOutcome, behaviourOutcome] =
        await Promise.allSettled([imagePromise, behaviourPromise]);

      const errors = [imageOutcome, behaviourOutcome]
        .filter((o) => o.status === "rejected")
        .map((o) => o.reason?.message || "Unknown error");

      if (errors.length > 0) {
        setError(errors.join(" | "));
      }

      localStorage.setItem(
        "dairyvision_live_result",
        JSON.stringify({
          image:
            imageOutcome.status === "fulfilled"
              ? imageOutcome.value
              : null,
          behaviour:
            behaviourOutcome.status === "fulfilled"
              ? behaviourOutcome.value
              : null
        })
      );

    } catch (err) {

      console.error("Live analysis error:", err);

      setError(
        err.message || "Something went wrong during live analysis."
      );

    } finally {

      setLoading(false);

    }
  };


  // ==========================================================
  // CONFIDENCE FORMAT
  // ==========================================================

  const formatConfidence = value => {

    if (
      value === undefined ||
      value === null
    ) {

      return "N/A";

    }

    return (
      Number(value) * 100
    ).toFixed(2) + "%";

  };


  // ==========================================================
  // FIRST DETECTED ANIMAL
  // ==========================================================

  const animal =
    result?.animals?.[0];


  // ==========================================================
  // CLEAN CAMERA WHEN LEAVING PAGE
  // ==========================================================

  useEffect(() => {

    return () => {

      const activeStream =
        streamRef.current;

      if (activeStream) {

        activeStream
          .getTracks()
          .forEach(
            track => track.stop()
          );

      }

    };

  }, []);


  // ==========================================================
  // CLEAN SNAPSHOT URL WHEN A NEW ONE IS TAKEN / PAGE LEFT
  // ==========================================================

  useEffect(() => {

    return () => {

      if (snapshotUrl) {
        URL.revokeObjectURL(snapshotUrl);
      }

    };

  }, [snapshotUrl]);


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
          {t("liveEyebrow")}
        </div>

        <h2>
          {t("liveTitle")}
        </h2>

        <p>
          {t("livePara")}
        </p>

      </div>


      {/* ====================================================
    CAMERA SECTION
==================================================== */}

<div className="upload-section">

  {/* ==================================================
      CAMERA VIDEO
      IMPORTANT:
      Video stays mounted even before camera starts.
      This prevents videoRef.current from being null.
  ================================================== */}

  <div
    className="preview-container"
    style={{
      marginBottom: "20px",
      display: cameraActive ? "block" : "none"
    }}
  >
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className="media-preview"
      style={{
        width: "100%",
        maxWidth: "900px",
        minHeight: "350px",
        objectFit: "cover",
        borderRadius: "12px"
      }}
    />
  </div>


  {/* ==================================================
      HIDDEN CANVAS
  ================================================== */}

  <canvas
    ref={canvasRef}
    style={{
      display: "none"
    }}
  />


  {/* ==================================================
      CAMERA NOT ACTIVE
  ================================================== */}

  {!cameraActive && (
    <>
      <div className="upload-icon">
        <Camera size={30} />
      </div>

      <h3>
        {t("startLiveCamera")}
      </h3>

      <p>
        {t("allowCamera")}
      </p>

      <button
        className="analyze-button"
        onClick={startCamera}
        disabled={loading}
      >
        <Camera size={18} />

        {t("startCamera")}
      </button>
    </>
  )}


  {/* ==================================================
      CAMERA ACTIVE
  ================================================== */}

  {cameraActive && (
    <>
      <div className="live-controls">

        {/* ANALYZE BUTTON */}

        <button
          className="control-button"
          onClick={analyzeLive}
          disabled={loading}
          style={{
            background: "#14532d",
            color: "#ffffff",
            borderColor: "#14532d"
          }}
        >

          {loading ? (
            <>
              <LoaderCircle
                size={18}
                className="loading-icon"
              />

              {t("analyzingAll")}
            </>
          ) : (
            <>
              <ScanSearch size={30} />

              {t("analyzeWithAI")}
            </>
          )}

        </button>


        {/* STOP CAMERA */}

        <button
          className="control-button danger"
          onClick={stopCamera}
          disabled={loading}
          style={{
            background: "#14532d",
            color: "#ffffff",
            borderColor: "#14532d"
          }}
        >

          <Square size={30} />

          {t("stopCamera")}

        </button>

      </div>


      {/* LOADING MESSAGE */}

      {loading && (
        <p
          style={{
            marginTop: "15px",
            textAlign: "center"
          }}
        >
          {t("capturing")}
        </p>
      )}

    </>
  )}

</div>


      {/* ====================================================
          ERROR
      ==================================================== */}

      {error && (

        <div
          className="error-message"
          style={{
            marginTop: "20px"
          }}
        >

          <strong>
            {t("analysisError")}
          </strong>

          <p>
            {error}
          </p>

        </div>

      )}


      {/* ====================================================
          CAPTURED FRAME WITH BOUNDING BOX
      ==================================================== */}

      {snapshotUrl && (

        <div style={{ marginTop: "25px" }}>

          <div className="eyebrow">
            {t("capturedFrame")}
          </div>

          <AnnotatedImage
            src={snapshotUrl}
            animals={result?.animals}
          />

        </div>

      )}


      {/* ====================================================
          NO CATTLE — IMAGE SIDE
      ==================================================== */}

      {result && result.animal_count === 0 && (

        <div
          className="error-message"
          style={{ marginTop: "20px" }}
        >

          <strong>
            {t("noCattle")}
          </strong>

          <p>
            {t("pointCamera")}
          </p>

        </div>

      )}


      {/* ====================================================
          UNIFIED RESULT — ALL 5 TASKS TOGETHER
      ==================================================== */}

      {result && animal && (

        <div
          className="analysis-result"
          style={{
            marginTop: "25px"
          }}
        >

          {/* SUCCESS */}

          <div className="result-success">

            <Activity size={22} />

            <div>

              <strong>
                {t("aiCompleted")}
              </strong>

              <p>
                {t("aiCompletedMsg")}
              </p>

            </div>

          </div>


          {/* ==================================================
              TASK 1 — DETECTION
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
                {result.animal_count || 0}{" "}
                {result.animal_count === 1 ? t("animal") : t("animals")}{" "}
                {t("detected")}
              </h2>

              <div className="confidence-row">
                <span>{t("confidence")}</span>
                <strong>
                  {formatConfidence(animal.detection?.confidence)}
                </strong>
              </div>

              <div className="confidence-bar">
                <div
                  className="confidence-fill"
                  style={{
                    width: `${Math.min(
                      Number(animal.detection?.confidence || 0) * 100,
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
                <span>{t("confidence")}</span>
                <strong>
                  {formatConfidence(animal.species_confidence)}
                </strong>
              </div>

              <div className="confidence-bar">
                <div
                  className="confidence-fill"
                  style={{
                    width: `${Math.min(
                      Number(animal.species_confidence || 0) * 100,
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
                <span>{t("confidence")}</span>
                <strong>
                  {formatConfidence(animal.breed_confidence)}
                </strong>
              </div>

              <div className="confidence-bar">
                <div
                  className="confidence-fill"
                  style={{
                    width: `${Math.min(
                      Number(animal.breed_confidence || 0) * 100,
                      100
                    )}%`
                  }}
                />
              </div>

            </div>

          </div>


          {/* ==================================================
              TASK 3 — BCS
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
                <span>{t("confidence")}</span>
                <strong>
                  {formatConfidence(animal.bcs_confidence)}
                </strong>
              </div>

              <div className="confidence-bar">
                <div
                  className="confidence-fill"
                  style={{
                    width: `${Math.min(
                      Number(animal.bcs_confidence || 0) * 100,
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
                <span>{t("confidence")}</span>
                <strong>
                  {formatConfidence(animal.health_risk_confidence)}
                </strong>
              </div>

              <div className="confidence-bar">
                <div
                  className="confidence-fill"
                  style={{
                    width: `${Math.min(
                      Number(animal.health_risk_confidence || 0) * 100,
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


          {/* ==================================================
              TASK 5 — BEHAVIOUR (SKIPPED / NO CATTLE)
          ================================================== */}

          {behaviourResult && behaviourResult.status === "no_cattle" && (

            <div className="result-card">

              <div className="result-card-icon">
                <Activity size={25} />
              </div>

              <div className="result-card-content">

                <div className="eyebrow">
                  {t("behaviourEyebrow")}
                </div>

                <h2>
                  {t("skipped")}
                </h2>

                <p className="health-risk-note">
                  {behaviourResult.message}
                </p>

              </div>

            </div>

          )}


          {/* ==================================================
              TASK 5 — BEHAVIOUR (RESULT)
          ================================================== */}

          {behaviourResult && behaviourResult.status !== "no_cattle" && (

            <div className="result-card">

              <div className="result-card-icon">
                <Activity size={25} />
              </div>

              <div className="result-card-content">

                <div className="eyebrow">
                  {t("behaviourEyebrow")}
                </div>

                <h2>
                  {behaviourResult.low_confidence
                    ? `${t("uncertain")} (${t("closest")}: ${tv(behaviourResult.behaviour)})`
                    : tv(behaviourResult.behaviour)}
                </h2>

                <div className="confidence-row">
                  <span>{t("confidence")}</span>
                  <strong>
                    {behaviourResult.confidence?.toFixed(2)}%
                  </strong>
                </div>

                <div className="confidence-bar">
                  <div
                    className="confidence-fill"
                    style={{
                      width: `${Math.min(
                        Number(behaviourResult.confidence || 0),
                        100
                      )}%`
                    }}
                  />
                </div>

                <p className="health-risk-note">
                  CNN + LSTM temporal analysis on{" "}
                  {behaviourResult.clips_analyzed} clips of{" "}
                  {behaviourResult.frames_analyzed} frames each.
                  Clip agreement:{" "}
                  {Math.round((behaviourResult.agreement ?? 0) * 100)}%.
                </p>

              </div>

            </div>

          )}


          {/* ==================================================
              TASK 5 — BEHAVIOUR (STILL PROCESSING)
          ================================================== */}

          {!behaviourResult && (

            <div className="result-card">

              <div className="result-card-icon">
                <LoaderCircle size={25} className="loading-icon" />
              </div>

              <div className="result-card-content">

                <div className="eyebrow">
                  {t("behaviourEyebrow")}
                </div>

                <h2>
                  {t("processing")}
                </h2>

                <p className="health-risk-note">
                  {t("processingNote")}
                </p>

              </div>

            </div>

          )}


          {/* ==================================================
              SUMMARY
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
                {t("typeLive")}
              </strong>
            </div>

          </div>

        </div>

      )}

    </div>

  );

}


export default LiveDetection;