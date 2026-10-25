from pathlib import Path
from ultralytics import YOLO


# Project root
BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_PATH = BASE_DIR / "models" / "detection" / "best.pt"


# Load YOLO model once when backend starts
detector = YOLO(str(MODEL_PATH))


# Two boxes overlapping more than this are treated as the same animal
DUPLICATE_IOU = 0.60


def _iou(a, b):

    """Intersection-over-union of two {"x1","y1","x2","y2"} boxes."""

    ix1 = max(a["x1"], b["x1"])
    iy1 = max(a["y1"], b["y1"])
    ix2 = min(a["x2"], b["x2"])
    iy2 = min(a["y2"], b["y2"])

    inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)

    area_a = (a["x2"] - a["x1"]) * (a["y2"] - a["y1"])
    area_b = (b["x2"] - b["x1"]) * (b["y2"] - b["y1"])

    union = area_a + area_b - inter

    return inter / union if union > 0 else 0.0


def _remove_duplicates(detections):

    """Keep the most confident box of every heavily-overlapping group."""

    kept = []

    for det in sorted(
        detections,
        key=lambda d: d["confidence"],
        reverse=True
    ):

        if all(
            _iou(det["box"], k["box"]) < DUPLICATE_IOU
            for k in kept
        ):
            kept.append(det)

    return kept


def detect_animals(image):
    """
    Detect animals in an image using YOLO.
    """

    results = detector.predict(
        source=image,
        conf=0.25,
        iou=0.5,          # stricter NMS -> fewer double boxes
        verbose=False
    )

    result = results[0]

    detections = []

    if result.boxes is None:
        return detections

    for box in result.boxes:

        x1, y1, x2, y2 = box.xyxy[0].tolist()

        confidence = float(box.conf[0])

        class_id = int(box.cls[0])

        class_name = detector.names.get(
            class_id,
            str(class_id)
        )

        detections.append({
            "class_id": class_id,
            "class_name": class_name,
            "confidence": round(confidence, 4),
            "box": {
                "x1": int(x1),
                "y1": int(y1),
                "x2": int(x2),
                "y2": int(y2)
            }
        })

    return _remove_duplicates(detections)