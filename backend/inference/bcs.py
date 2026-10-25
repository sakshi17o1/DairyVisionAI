from pathlib import Path

import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image


# ============================================================
# PATH
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_PATH = (
    BASE_DIR
    / "models"
    / "body_condition"
    / "best_efficientnet_b0_bcs.pth"
)


# ============================================================
# DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# ============================================================
# MODEL
# ============================================================

model = models.efficientnet_b0(
    weights=None
)

model.classifier[1] = nn.Linear(
    1280,
    2
)


# ============================================================
# LOAD TRAINED MODEL
# ============================================================

state_dict = torch.load(
    MODEL_PATH,
    map_location=DEVICE,
    weights_only=True
)

model.load_state_dict(
    state_dict
)

model.to(DEVICE)

model.eval()


# ============================================================
# CLASS MAPPING
# ============================================================

IDX_TO_CLASS = {
    0: "Normal",
    1: "Overweight"
}


# ============================================================
# IMAGE TRANSFORM
# ============================================================

transform = transforms.Compose([

    transforms.Resize(
        (224, 224)
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[
            0.485,
            0.456,
            0.406
        ],
        std=[
            0.229,
            0.224,
            0.225
        ]
    )
])


# ============================================================
# PREDICTION
# ============================================================

def predict_bcs(image):

    """
    Predict body condition category
    from an animal crop.
    """

    if not isinstance(
        image,
        Image.Image
    ):
        image = Image.fromarray(image)

    image = image.convert("RGB")


    # --------------------------------------------------------
    # PREPROCESS
    # --------------------------------------------------------

    input_tensor = transform(
        image
    )

    input_tensor = input_tensor.unsqueeze(
        0
    )

    input_tensor = input_tensor.to(
        DEVICE
    )


    # --------------------------------------------------------
    # INFERENCE
    # --------------------------------------------------------

    with torch.no_grad():

        logits = model(
            input_tensor
        )


    # --------------------------------------------------------
    # PROBABILITIES
    # --------------------------------------------------------

    probabilities = torch.softmax(
        logits,
        dim=1
    )


    confidence, predicted_index = torch.max(
        probabilities,
        dim=1
    )


    predicted_index = int(
        predicted_index.item()
    )

    confidence = float(
        confidence.item()
    )


    # --------------------------------------------------------
    # CLASS
    # --------------------------------------------------------

    predicted_class = IDX_TO_CLASS[
        predicted_index
    ]


    return {

        "bcs_class": predicted_class,

        "bcs_confidence": round(
            confidence,
            4
        )
    }