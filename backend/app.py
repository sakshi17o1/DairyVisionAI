from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from collections import defaultdict
import io
import os
import tempfile
import cv2
import numpy as np

from inference.detector import detect_animals
from inference.species_breed import predict_species_breed
from inference.bcs import predict_bcs
from inference.health_risk import predict_health_risk, explain_health_risk
from inference.behaviour import predict_behaviour

from lsd_advice import router as advice_router
from chatbot import router as chat_router
# ============================================================
# BEHAVIOUR SETTINGS
# ============================================================
#
# !! STRIDE must match TRAINING.
# !! Open ACD_BACKEND (1).ipynb and check how the 6 frames for the
# !! CNN-LSTM were built (consecutive frames = 1, every 5th frame = 5).
#
# ============================================================

SEQ_LEN = 6             # frames per clip (model input length)
STRIDE = 1              # source-frame gap between frames INSIDE one clip
NUM_CLIPS = 5           # clips sampled across the whole video
MIN_DET_CONF = 0.40     # a cow must be detected at least this confident
LOW_CONF_PCT = 70.0     # below this, behaviour is shown as "Uncertain"
                        # (placeholder: tune on validation data)

# Set True ONLY if the behaviour model was trained on cow crops
# instead of full frames. Check the training notebook.
CROP_FOR_BEHAVIOUR = True


# ============================================================
# PREDICTION GUARDS  (reduce confidently-wrong answers)
# ============================================================
#
# All thresholds are simple heuristics, NOT tuned on a validation set.
# Tune them on your own test photos before quoting them anywhere.

MIN_ANIMAL_CONF = 0.40      # ignore detections below this
SPECIES_MIN_CONF = 0.60     # below -> species shown as "uncertain"
BREED_MIN_CONF = 0.50       # below -> UI shows top-3 breed suggestions
BCS_MIN_CONF = 0.75         # below -> body condition shown as "Uncertain"
MIN_BOX_AREA_RATIO = 0.04   # animal smaller than 4% of the photo = too far
MAX_BOX_ASPECT = 1.5        # height / width above this = head / front / partial view
EDGE_MARGIN = 0.02          # box within 2% of a border = touching that edge


def is_partial_view(box, img_w, img_h):

    """
    True when the animal is probably not fully visible
    (only a head, cut off by the frame, or very far away).
    Body condition needs the whole body.
    """

    bw = max(1, box["x2"] - box["x1"])
    bh = max(1, box["y2"] - box["y1"])

    area_ratio = (bw * bh) / float(img_w * img_h)

    mx = EDGE_MARGIN * img_w
    my = EDGE_MARGIN * img_h

    touches = sum([
        box["x1"] <= mx,
        box["y1"] <= my,
        box["x2"] >= img_w - mx,
        box["y2"] >= img_h - my,
    ])

    return (
        area_ratio < MIN_BOX_AREA_RATIO
        or (bh / bw) > MAX_BOX_ASPECT
        or touches >= 3
    )


def assemble_animal(detection, crop, image_size):

    """
    Run species/breed, body condition and health risk on one crop and
    attach reliability flags ("guards") for the UI.
    """

    img_w, img_h = image_size

    sb = predict_species_breed(crop)
    bcs = predict_bcs(crop)
    health = predict_health_risk(crop)

    partial = is_partial_view(detection["box"], img_w, img_h)

    species_unc = sb["species_confidence"] < SPECIES_MIN_CONF
    breed_unc = sb["breed_confidence"] < BREED_MIN_CONF
    bcs_unc = partial or bcs["bcs_confidence"] < BCS_MIN_CONF

    return {

        "detection": detection,

        "species": "uncertain" if species_unc else sb["species"],
        "species_confidence": sb["species_confidence"],

        "breed": sb["breed"],
        "breed_confidence": sb["breed_confidence"],
        "breed_top3": sb.get("breed_top3", []),

        "bcs_class": "Uncertain" if bcs_unc else bcs["bcs_class"],
        "bcs_confidence": bcs["bcs_confidence"],

        "health_risk_class": health["health_risk_class"],
        "health_risk_confidence": health["health_risk_confidence"],

        "guards": {
            "partial_view": partial,
            "species_uncertain": species_unc,
            "breed_uncertain": breed_unc,
            "bcs_uncertain": bcs_unc,
        },
    }


def confident_detections(image):

    return [
        d for d in detect_animals(image)
        if d.get("confidence", 0) >= MIN_ANIMAL_CONF
    ]


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="ALSD-AI API",
    description="Backend API for Animal Lumpy Skin Disease AI Detector (ALSD-AI)",
    version="1.0.0"
)

app.include_router(advice_router)
app.include_router(chat_router)

# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():
    return {
        "message": "ALSD-AI Backend is running!"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "backend": "ALSD-AI",
        "message": "Backend connection successful"
    }


# ============================================================
# ANALYZE IMAGE
# ============================================================

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):

    # --------------------------------------------------------
    # Read uploaded file
    # --------------------------------------------------------

    contents = await file.read()


    # --------------------------------------------------------
    # Convert uploaded file to PIL image
    # --------------------------------------------------------

    try:
        image = Image.open(
            io.BytesIO(contents)
        ).convert("RGB")

    except Exception:
        return {
            "status": "error",
            "message": "Could not read image"
        }


    # --------------------------------------------------------
    # MODEL 1 — YOLO DETECTION
    # --------------------------------------------------------

    detections = confident_detections(image)


    # --------------------------------------------------------
    # NEW — NO CATTLE FOUND: stop here, do not run other models
    # --------------------------------------------------------

    if not detections:

        return {
            "status": "success",
            "filename": file.filename,
            "analysis_type": "image",
            "animal_count": 0,
            "animals": [],
            "message": "No cattle detected in the image."
        }


    # --------------------------------------------------------
    # STORE ALL ANIMAL RESULTS
    # --------------------------------------------------------

    animal_results = []


    # ========================================================
    # PROCESS EACH DETECTED ANIMAL
    # ========================================================

    for detection in detections:

        box = detection["box"]


        # ----------------------------------------------------
        # Crop detected animal
        # ----------------------------------------------------

        crop = image.crop(
            (
                box["x1"],
                box["y1"],
                box["x2"],
                box["y2"]
            )
        )


        # ----------------------------------------------------
        # MODELS 2-4 + reliability guards
        # ----------------------------------------------------

        animal_results.append(
            assemble_animal(
                detection,
                crop,
                image.size
            )
        )


    # ========================================================
    # FINAL IMAGE RESPONSE
    # ========================================================

    return {

        "status": "success",

        "filename":
            file.filename,

        "analysis_type":
            "image",

        "animal_count":
            len(animal_results),

        "animals":
            animal_results
    }


# ============================================================
# NEW — GRAD-CAM EXPLANATION (health risk)
# ============================================================
#
# Same proxy-friendly /api prefix as /api/health, so no change is
# needed in vite.config.js.

@app.post("/api/explain")
async def explain(file: UploadFile = File(...)):

    contents = await file.read()

    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not read image"
        )

    detections = confident_detections(image)

    if not detections:
        return {
            "status": "no_cattle",
            "message": "No cattle detected in the image."
        }

    # Explain the biggest animal in the picture

    biggest = max(
        detections,
        key=lambda d: (
            (d["box"]["x2"] - d["box"]["x1"])
            * (d["box"]["y2"] - d["box"]["y1"])
        )
    )

    box = biggest["box"]

    crop = image.crop(
        (box["x1"], box["y1"], box["x2"], box["y2"])
    )

    result = explain_health_risk(crop)

    return {
        "status": "success",
        "box": box,
        **result
    }


# ============================================================
# NEW — BEHAVIOUR HELPERS
# ============================================================

def count_frames(video_path):

    """
    Count frames with grab() (no decoding, no seeking).

    cv2.CAP_PROP_FRAME_COUNT is unreliable for browser-recorded
    .webm files, so we count by reading through the file once.
    """

    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():

        raise RuntimeError(
            "Unable to open uploaded video."
        )

    total = 0

    while cap.grab():
        total += 1

    cap.release()

    return total


def extract_behaviour_clips(
    video_path,
    seq_len=SEQ_LEN,
    stride=STRIDE,
    num_clips=NUM_CLIPS
):

    """
    Return several clips spread across the whole video.

    Each clip = seq_len frames, `stride` source-frames apart.
    Predictions on all clips are aggregated later, so one unlucky
    moment (start of video, cow turning its head) cannot decide
    the final answer.
    """

    total = count_frames(video_path)

    span = (seq_len - 1) * stride + 1

    if total < span:

        raise RuntimeError(
            f"Video too short: need at least {span} frames, "
            f"found {total}."
        )

    last_start = total - span

    starts = sorted(set(
        np.linspace(
            0,
            last_start,
            num_clips
        ).astype(int).tolist()
    ))

    needed = {
        s + k * stride
        for s in starts
        for k in range(seq_len)
    }


    # Second pass: keep only the frames we need (memory-light)

    grabbed = {}

    cap = cv2.VideoCapture(video_path)

    index = 0
    last_needed = max(needed)

    while index <= last_needed:

        if not cap.grab():
            break

        if index in needed:

            ok, frame = cap.retrieve()

            if ok:
                grabbed[index] = frame

        index += 1

    cap.release()


    clips = []

    for s in starts:

        idxs = [s + k * stride for k in range(seq_len)]

        if all(i in grabbed for i in idxs):
            clips.append([grabbed[i] for i in idxs])

    if not clips:

        raise RuntimeError(
            "Could not decode frames from the video."
        )

    return clips


def cattle_in_frame(frame_bgr):

    """
    Run the YOLO detector on one OpenCV (BGR) frame.
    Returns only the detections that pass MIN_DET_CONF.
    """

    rgb = cv2.cvtColor(
        frame_bgr,
        cv2.COLOR_BGR2RGB
    )

    detections = detect_animals(
        Image.fromarray(rgb)
    )

    return [
        d for d in detections
        if d.get("confidence", 0) >= MIN_DET_CONF
    ]


def crop_clip_to_box(clip, detection, margin=0.15):

    """
    Only used when CROP_FOR_BEHAVIOUR = True.
    Crops every frame of a clip to the detected cow (+ margin).
    """

    b = detection["box"]

    h, w = clip[0].shape[:2]

    bw = b["x2"] - b["x1"]
    bh = b["y2"] - b["y1"]

    x1 = max(0, int(b["x1"] - margin * bw))
    y1 = max(0, int(b["y1"] - margin * bh))
    x2 = min(w, int(b["x2"] + margin * bw))
    y2 = min(h, int(b["y2"] + margin * bh))

    return [f[y1:y2, x1:x2] for f in clip]


def aggregate_predictions(preds):

    """
    Majority vote across clips.

    confidence = mean confidence of the clips that voted for the winner
    agreement  = share of clips that voted for the winner
    """

    votes = defaultdict(list)

    for p in preds:
        votes[p["behaviour"]].append(
            float(p["confidence"])
        )

    best = max(
        votes,
        key=lambda k: (len(votes[k]), sum(votes[k]))
    )

    return {
        "behaviour": best,
        "confidence": sum(votes[best]) / len(votes[best]),
        "agreement": len(votes[best]) / len(preds),
        "votes": {k: len(v) for k, v in votes.items()},
    }


# ============================================================
# NEW — BEHAVIOUR ANALYSIS
# ============================================================

@app.post("/analyze-behaviour")
async def analyze_behaviour(
    file: UploadFile = File(...)
):

    # --------------------------------------------------------
    # Validate filename
    # --------------------------------------------------------

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No video file provided."
        )


    # --------------------------------------------------------
    # Allowed video formats
    # --------------------------------------------------------

    allowed_extensions = {
        ".mp4",
        ".avi",
        ".mov",
        ".mkv",
        ".webm"
    }


    extension = os.path.splitext(
        file.filename
    )[1].lower()


    if extension not in allowed_extensions:

        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported video format. "
                "Use MP4, AVI, MOV, MKV or WEBM."
            )
        )


    temp_path = None


    try:

        # ----------------------------------------------------
        # Save uploaded video temporarily
        # ----------------------------------------------------

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extension
        ) as temp_file:

            content = await file.read()

            temp_file.write(content)

            temp_path = temp_file.name


        # ----------------------------------------------------
        # Several clips spread across the video
        # ----------------------------------------------------

        clips = extract_behaviour_clips(
            temp_path
        )


        # ----------------------------------------------------
        # GATE: keep only clips where a cow is actually visible
        # ----------------------------------------------------

        valid_clips = []

        for clip in clips:

            middle_frame = clip[len(clip) // 2]

            detections = cattle_in_frame(
                middle_frame
            )

            if not detections:
                continue

            if CROP_FOR_BEHAVIOUR:

                biggest = max(
                    detections,
                    key=lambda d: (
                        (d["box"]["x2"] - d["box"]["x1"])
                        * (d["box"]["y2"] - d["box"]["y1"])
                    )
                )

                clip = crop_clip_to_box(
                    clip,
                    biggest
                )

            valid_clips.append(clip)


        if not valid_clips:

            return {
                "success": True,
                "status": "no_cattle",
                "analysis_type": "behaviour",
                "message": (
                    "No cattle detected in the video. "
                    "Behaviour analysis skipped."
                )
            }


        # ----------------------------------------------------
        # CNN + LSTM prediction on every valid clip,
        # then majority vote
        # ----------------------------------------------------

        predictions = [
            predict_behaviour(c)
            for c in valid_clips
        ]

        aggregated = aggregate_predictions(
            predictions
        )


        # ----------------------------------------------------
        # FINAL BEHAVIOUR RESPONSE
        # (confidence stays in percent, like before)
        # ----------------------------------------------------

        return {

            "success": True,

            "status": "success",

            "analysis_type":
                "behaviour",

            "behaviour":
                aggregated["behaviour"],

            "confidence":
                aggregated["confidence"],

            "low_confidence":
                aggregated["confidence"] < LOW_CONF_PCT,

            "agreement":
                aggregated["agreement"],

            "votes":
                aggregated["votes"],

            "clips_analyzed":
                len(valid_clips),

            "frames_analyzed":
                SEQ_LEN
        }


    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=(
                f"Behaviour analysis failed: {str(e)}"
            )
        )


    finally:

        # ----------------------------------------------------
        # Delete temporary uploaded video
        # ----------------------------------------------------

        if (
            temp_path
            and os.path.exists(temp_path)
        ):

            os.remove(temp_path)



# ============================================================
# NEW — LIVE DETECTION (multi-frame capture → all 5 tasks)
# ============================================================

@app.post("/analyze-live")
async def analyze_live(files: list[UploadFile] = File(...)):

    if len(files) != SEQ_LEN:
        raise HTTPException(
            status_code=400,
            detail=f"Expected exactly {SEQ_LEN} frames, got {len(files)}."
        )

    # --------------------------------------------------------
    # Decode all captured frames
    # --------------------------------------------------------
    frames_bgr = []
    for f in files:
        contents = await f.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise HTTPException(status_code=400, detail="Could not decode one of the captured frames.")
        frames_bgr.append(frame)

    # --------------------------------------------------------
    # Representative frame (middle) — for species/breed/bcs/health
    # --------------------------------------------------------
    middle_frame_bgr = frames_bgr[len(frames_bgr) // 2]
    middle_rgb = cv2.cvtColor(middle_frame_bgr, cv2.COLOR_BGR2RGB)
    middle_image = Image.fromarray(middle_rgb)

    detections = confident_detections(middle_image)

    if not detections:
        return {
            "success": True,
            "status": "success",
            "analysis_type": "live",
            "animal_count": 0,
            "animals": [],
            "message": "No cattle detected in the captured frames."
        }

    # --------------------------------------------------------
    # Behaviour — full 6-frame sequence (single clip, no aggregation needed)
    # --------------------------------------------------------
    behaviour_result = predict_behaviour(frames_bgr)

    # --------------------------------------------------------
    # Per-animal results (same pattern as /analyze and /analyze-behaviour)
    # --------------------------------------------------------
    animal_results = []

    for detection in detections:
        box = detection["box"]
        crop = middle_image.crop((box["x1"], box["y1"], box["x2"], box["y2"]))

        animal = assemble_animal(detection, crop, middle_image.size)
        animal["behaviour"] = behaviour_result["behaviour"]
        animal["behaviour_confidence"] = behaviour_result["confidence"]
        animal_results.append(animal)

    return {
        "success": True,
        "status": "success",
        "analysis_type": "live",
        "animal_count": len(animal_results),
        "animals": animal_results
    }