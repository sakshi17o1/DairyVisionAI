import os
import cv2
import numpy as np
import torch
import torch.nn as nn

from torchvision.models import efficientnet_b0, EfficientNet_B0_Weights


# ============================================================
# CONFIG
# ============================================================

# Alphabetical order — matches CLASS_NAMES = sorted(df["label"].unique())
# from the Kaggle training notebook. DO NOT reorder without retraining.
BEHAVIOUR_CLASSES = [
    "drink",
    "eat",
    "lie",
    "ruminate",
    "stand"
]

SEQUENCE_LENGTH = 6
IMAGE_SIZE = 224

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

PROJECT_ROOT = os.path.dirname(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)

MODEL_PATH = os.path.join(
    PROJECT_ROOT,
    "models",
    "behaviour",
    "best_cnn_lstm_behaviour_v2.pth"
)


# ============================================================
# FROZEN CNN FEATURE EXTRACTOR
# ============================================================
#
# Matches the Kaggle training pipeline exactly: EfficientNet-B0,
# pretrained ImageNet weights, classifier removed, fully frozen.
# CNN features were pre-extracted offline during training — only
# the LSTM + FC head below was trained. This module must stay
# frozen and use the SAME preprocessing as training, or the LSTM
# will receive out-of-distribution features.
# ============================================================

cnn = efficientnet_b0(weights=EfficientNet_B0_Weights.DEFAULT)
cnn.classifier = nn.Identity()
cnn = cnn.to(DEVICE).eval()

for p in cnn.parameters():
    p.requires_grad = False

# Same normalization constants used in the training notebook
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def preprocess_frame(frame_bgr):
    """
    OpenCV BGR frame -> normalized CHW numpy array, resized to
    IMAGE_SIZE x IMAGE_SIZE. Matches training preprocessing exactly
    (direct resize, not resize+center-crop).
    """

    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    frame_rgb = cv2.resize(frame_rgb, (IMAGE_SIZE, IMAGE_SIZE))

    frame_norm = (frame_rgb.astype(np.float32) / 255.0 - MEAN) / STD
    frame_chw = np.transpose(frame_norm, (2, 0, 1))

    return frame_chw


def extract_sequence_features(frames):
    """
    Runs the frozen CNN over a sequence of frames.
    frames: list of SEQUENCE_LENGTH OpenCV BGR frames.
    Returns a tensor of shape [SEQUENCE_LENGTH, 1280].
    """

    batch = [preprocess_frame(f) for f in frames]
    batch = torch.tensor(np.stack(batch), dtype=torch.float32).to(DEVICE)

    with torch.no_grad():
        feats = cnn(batch)

    return feats  # [SEQUENCE_LENGTH, 1280], stays on DEVICE


# ============================================================
# LSTM MODEL
# ============================================================
#
# This matches the Kaggle training notebook's BehaviourLSTM
# exactly. No CNN inside — it operates on pre-extracted features.
# ============================================================

class BehaviourLSTM(nn.Module):

    def __init__(self, num_classes=5, hidden_size=256, num_layers=2):
        super().__init__()

        self.lstm = nn.LSTM(
            input_size=1280,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=0.3
        )

        self.dropout = nn.Dropout(0.3)
        self.fc = nn.Linear(hidden_size, num_classes)

    def forward(self, x):
        # x: [batch, sequence, 1280]
        out, _ = self.lstm(x)
        last_output = out[:, -1, :]
        return self.fc(self.dropout(last_output))


# ============================================================
# LOAD MODEL
# ============================================================

def load_behaviour_model():

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Behaviour model not found:\n{MODEL_PATH}"
        )

    print("\n" + "=" * 60)
    print("Loading Behaviour CNN-LSTM model (v2)")
    print("=" * 60)

    print(f"Model path: {MODEL_PATH}")
    print(f"Device: {DEVICE}")

    checkpoint = torch.load(
        MODEL_PATH,
        map_location=DEVICE,
        weights_only=False
    )

    if not isinstance(checkpoint, dict):
        raise RuntimeError("Invalid behaviour checkpoint format.")

    if "model_state_dict" not in checkpoint:
        raise RuntimeError(
            "Invalid behaviour checkpoint. "
            "'model_state_dict' not found."
        )

    # Sanity check: class order in checkpoint must match BEHAVIOUR_CLASSES
    checkpoint_classes = checkpoint.get("class_names")
    if checkpoint_classes is not None and checkpoint_classes != BEHAVIOUR_CLASSES:
        raise RuntimeError(
            "BEHAVIOUR_CLASSES does not match the checkpoint's "
            f"class_names.\nExpected: {checkpoint_classes}\n"
            f"Got: {BEHAVIOUR_CLASSES}"
        )

    model = BehaviourLSTM(num_classes=len(BEHAVIOUR_CLASSES))
    model.load_state_dict(checkpoint["model_state_dict"], strict=True)

    model.to(DEVICE)
    model.eval()

    print("LSTM + FC: checkpoint weights loaded")
    print(f"Behaviour classes: {BEHAVIOUR_CLASSES}")
    print(f"Sequence length: {SEQUENCE_LENGTH}")
    print("Behaviour model ready")
    print("=" * 60 + "\n")

    return model


# ============================================================
# LOAD MODEL ONCE
# ============================================================

behaviour_model = load_behaviour_model()


# ============================================================
# BEHAVIOUR PREDICTION
# ============================================================

def predict_behaviour(frames):
    """
    frames: list of SEQUENCE_LENGTH OpenCV BGR frames
    (same contract as before — app.py does not need to change).
    """

    if len(frames) != SEQUENCE_LENGTH:
        raise ValueError(
            f"Behaviour model requires exactly "
            f"{SEQUENCE_LENGTH} frames, "
            f"but received {len(frames)}."
        )

    for frame in frames:
        if frame is None:
            raise ValueError("Behaviour received an empty frame.")

    # CNN feature extraction (frozen, matches training)
    features = extract_sequence_features(frames)       # [6, 1280]
    sequence = features.unsqueeze(0)                   # [1, 6, 1280]

    with torch.no_grad():
        outputs = behaviour_model(sequence)
        probabilities = torch.softmax(outputs, dim=1)
        confidence, predicted_idx = torch.max(probabilities, dim=1)

    predicted_index = predicted_idx.item()
    behaviour = BEHAVIOUR_CLASSES[predicted_index]
    confidence_value = confidence.item()

    return {
        "behaviour": behaviour,
        "confidence": round(confidence_value * 100, 2)
    }