from pathlib import Path

import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

MODEL_PATH = (
    BASE_DIR
    / "models"
    / "breed_species"
    / "best_multitask_b3.pth"
)


# ============================================================
# DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# ============================================================
# MULTI-TASK EFFICIENTNET-B3
# ============================================================

class MultiTaskEfficientNetB3(nn.Module):

    def __init__(
        self,
        num_species=2,
        num_breeds=41
    ):

        super().__init__()

        backbone = models.efficientnet_b3(
            weights=None
        )

        self.features = backbone.features

        self.avgpool = nn.AdaptiveAvgPool2d(
            (1, 1)
        )

        self.species_head = nn.Linear(
            1536,
            num_species
        )

        self.breed_head = nn.Linear(
            1536,
            num_breeds
        )

    def forward(self, x):

        x = self.features(x)

        x = self.avgpool(x)

        x = torch.flatten(
            x,
            1
        )

        species_output = self.species_head(x)

        breed_output = self.breed_head(x)

        return species_output, breed_output


# ============================================================
# LOAD CHECKPOINT
# ============================================================

checkpoint = torch.load(
    MODEL_PATH,
    map_location=DEVICE,
    weights_only=False
)


breed_to_idx = checkpoint["breed_to_idx"]

idx_to_breed = {
    int(k): v
    for k, v in checkpoint["idx_to_breed"].items()
}

model = MultiTaskEfficientNetB3(
    num_species=checkpoint["num_species"],
    num_breeds=checkpoint["num_breeds"]
)

model.load_state_dict(
    checkpoint["model_state_dict"]
)

model.to(DEVICE)

model.eval()


# ============================================================
# SPECIES MAPPING
# ============================================================

idx_to_species = {
    0: "buffalo",
    1: "cow"
}


# ============================================================
# IMAGE TRANSFORM
# ============================================================

transform = transforms.Compose([

    transforms.Resize(
        (300, 300)
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

def predict_species_breed(image):

    """
    Predict species and breed from an animal crop.
    """

    if not isinstance(image, Image.Image):

        image = Image.fromarray(image)

    image = image.convert("RGB")

    input_tensor = transform(image)

    input_tensor = input_tensor.unsqueeze(0)

    input_tensor = input_tensor.to(DEVICE)


    with torch.no_grad():

        species_logits, breed_logits = model(
            input_tensor
        )


    # --------------------------------------------------------
    # SPECIES
    # --------------------------------------------------------

    species_probabilities = torch.softmax(
        species_logits,
        dim=1
    )

    species_confidence, species_index = torch.max(
        species_probabilities,
        dim=1
    )

    species_index = int(
        species_index.item()
    )

    species_confidence = float(
        species_confidence.item()
    )

    species = idx_to_species[
        species_index
    ]


    # --------------------------------------------------------
    # BREED
    # --------------------------------------------------------

    breed_probabilities = torch.softmax(
        breed_logits,
        dim=1
    )

    breed_confidence, breed_index = torch.max(
        breed_probabilities,
        dim=1
    )

    breed_index = int(
        breed_index.item()
    )

    breed_confidence = float(
        breed_confidence.item()
    )

    breed = idx_to_breed[
        breed_index
    ]


    # Top-3 breeds: breed accuracy is only ~66%, so the UI shows
    # alternatives when the model is not sure.

    top_probs, top_idx = torch.topk(
        breed_probabilities[0],
        k=min(3, breed_probabilities.shape[1])
    )

    breed_top3 = [
        {
            "breed": idx_to_breed[int(i)],
            "confidence": round(float(p), 4)
        }
        for p, i in zip(top_probs, top_idx)
    ]


    return {

        "species": species,

        "species_confidence": round(
            species_confidence,
            4
        ),

        "breed": breed,

        "breed_confidence": round(
            breed_confidence,
            4
        ),

        "breed_top3": breed_top3
    }