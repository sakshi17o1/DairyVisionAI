from pathlib import Path
import base64
import io

import cv2
import numpy as np
import torch
import torch.nn.functional as F
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
    / "health_risk"
    / "best_resnet50_health_risk.pth"
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

model = models.resnet50(
    weights=None
)


# Checkpoint contains:
# fc.weight -> [2, 2048]
# fc.bias   -> [2]

model.fc = nn.Linear(
    2048,
    2
)


# ============================================================
# LOAD CHECKPOINT
# ============================================================

checkpoint = torch.load(
    MODEL_PATH,
    map_location=DEVICE,
    weights_only=True
)


# Best checkpoint contains model_state_dict

if "model_state_dict" in checkpoint:

    state_dict = checkpoint[
        "model_state_dict"
    ]

else:

    state_dict = checkpoint


model.load_state_dict(
    state_dict
)


model.to(DEVICE)

model.eval()


# ============================================================
# CLASS MAPPING
# ============================================================

IDX_TO_CLASS = {
    0: "Lumpy Skin",
    1: "Normal Skin"
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

def predict_health_risk(image):

    """
    Predict visible skin condition
    from an animal crop.
    """

    # --------------------------------------------------------
    # Convert to PIL
    # --------------------------------------------------------

    if not isinstance(
        image,
        Image.Image
    ):

        image = Image.fromarray(
            image
        )


    image = image.convert(
        "RGB"
    )


    # --------------------------------------------------------
    # Preprocess
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
    # Inference
    # --------------------------------------------------------

    with torch.no_grad():

        logits = model(
            input_tensor
        )


    # --------------------------------------------------------
    # Probabilities
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
    # Class
    # --------------------------------------------------------

    predicted_class = IDX_TO_CLASS[
        predicted_index
    ]


    # --------------------------------------------------------
    # Result
    # --------------------------------------------------------

    return {

        "health_risk_class":
            predicted_class,

        "health_risk_confidence":
            round(
                confidence,
                4
            )

    }


# ============================================================
# GRAD-CAM EXPLANATION
# ============================================================

def explain_health_risk(image):

    """
    Grad-CAM for the health-risk model.

    Shows which image regions pushed the model towards the class it
    predicted. This is a visual explanation of the MODEL, not proof of
    a lesion -- a veterinarian must always confirm.

    Returns the same class/confidence as predict_health_risk plus
    "heatmap_png_base64": the crop with the heat-map blended on top.
    """

    if not isinstance(image, Image.Image):
        image = Image.fromarray(image)

    image = image.convert("RGB")

    input_tensor = transform(image).unsqueeze(0).to(DEVICE)

    store = {}
    layer = model.layer4[-1]          # last conv block of ResNet50

    def forward_hook(module, inputs, output):
        store["activations"] = output.detach()
        # gradient of the chosen logit w.r.t. this feature map
        output.register_hook(
            lambda grad: store.__setitem__("gradients", grad.detach())
        )

    handle = layer.register_forward_hook(forward_hook)

    try:

        model.zero_grad()

        with torch.enable_grad():

            logits = model(input_tensor)

            probabilities = torch.softmax(logits, dim=1)

            confidence, predicted_index = torch.max(probabilities, dim=1)

            predicted_index = int(predicted_index.item())

            logits[0, predicted_index].backward()

    finally:

        handle.remove()

    activations = store["activations"][0]            # [C, h, w]
    gradients = store["gradients"][0]                # [C, h, w]

    weights = gradients.mean(dim=(1, 2))             # [C]

    cam = F.relu((weights[:, None, None] * activations).sum(dim=0))

    cam = cam.cpu().numpy()

    cam = cam - cam.min()

    if cam.max() > 0:
        cam = cam / cam.max()

    width, height = image.size

    cam = cv2.resize(cam, (width, height))

    heat = cv2.applyColorMap(
        np.uint8(255 * cam),
        cv2.COLORMAP_JET
    )[:, :, ::-1]                                    # BGR -> RGB

    overlay = (
        0.55 * np.asarray(image, dtype=np.float32)
        + 0.45 * heat.astype(np.float32)
    ).clip(0, 255).astype(np.uint8)

    buffer = io.BytesIO()

    Image.fromarray(overlay).save(buffer, format="PNG")

    return {

        "health_risk_class":
            IDX_TO_CLASS[predicted_index],

        "health_risk_confidence":
            round(float(confidence.item()), 4),

        "heatmap_png_base64":
            base64.b64encode(buffer.getvalue()).decode("ascii")

    }