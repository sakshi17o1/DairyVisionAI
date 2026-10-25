# ALSD-AI — Animal Lumpy Skin Disease AI Detector

A multi-task deep-learning pipeline and multilingual web app (English, Hindi, Punjabi) for cattle and buffalo:

1. **Detection** — YOLO11n finds animals in a photo / frame
2. **Species + breed** — multi-task EfficientNet-B3 (cow/buffalo, 41 breeds)
3. **Body condition** — EfficientNet-B0 (Normal vs Overweight)
4. **Lumpy skin disease risk screening** — ResNet50 (Lumpy Skin vs Normal Skin)
5. **Behaviour** — CNN-LSTM on video (drink, eat, lie, ruminate, stand)

Extras: LSD advice in 3 languages, cattle-care chatbot (Gemini), Grad-CAM explanation, downloadable PDF report, alerts/notifications, installable PWA.

> **ALSD-AI is a screening aid, not a diagnostic tool.** Always consult a qualified veterinarian.

## Results (held-out data)

| Task | Result |
|---|---|
| Detection (validation, 350 images) | mAP@0.5 = 0.941, mAP@0.5-0.95 = 0.716 |
| Species (1,186 samples) | accuracy 98.15% |
| Breed, 41 classes (1,186 samples) | accuracy 65.9% |
| LSD screening (103 test images; 33 lumpy) | accuracy 94.17%, macro-F1 0.933 |
| Body condition (4,548 test images) | accuracy 96.77%, macro-F1 0.9666 |
| Behaviour (434 test clips) | accuracy 91%, macro-F1 0.90 |

## Known limitations

- LSD test set is small (103 images, 33 lumpy); not validated on real farm photographs.
- Body-condition split is image-level (frames of the same cow may appear in train and test), and the data are overhead-camera Holstein images, so results on phone photos of other breeds may be lower.
- Breed accuracy is 65.9% — breed is shown as a suggestion with top-3 alternatives.
- Behaviour model was trained on beef cattle; "drink" has only 24 test clips.
- Prediction guards (thresholds for "uncertain", partial-view detection) are heuristics, not tuned on a validation set.

## Project structure

```
backend/    FastAPI service (app.py, chatbot.py, lsd_advice.py, inference/*)
frontend/   React + Vite PWA (English / हिन्दी / ਪੰਜਾਬੀ)
models/     trained weights — NOT in this repo (see below)
```

## Model weights

Weights are not stored in GitHub. Download them from: **[Google Drive link — add here]**
and place them like this:

```
models/detection/best.pt
models/breed_species/best_multitask_b3.pth
models/body_condition/best_efficientnet_b0_bcs.pth
models/health_risk/best_resnet50_health_risk.pth
models/behaviour/<behaviour weights file>      # check backend/inference/behaviour.py for the exact path
```

## Run locally

**Backend** (Python 3.10+):

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
$env:GEMINI_API_KEY="your_key"        # only needed for the chatbot (free key: aistudio.google.com/apikey)
uvicorn app:app --reload --port 8000
```

**Frontend** (Node 18+):

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/analyze`, `/chat`, `/advice` and `/api` to the backend on port 8000.

**On a phone (HTTPS needed for camera / install):**
`cloudflared tunnel --url http://localhost:5173`

## Datasets

All public. Check each licence before reuse.

- Cows and Buffalo Computer Vision Dataset — Kaggle, `raghavdharwal`
- Indian Bovine Breeds — Kaggle, `lukex9442`
- Lumpy Skin Images Dataset — Kaggle, `warcoder`
- Dairy cow body condition score data set — Science Data Bank; Zheng et al., *Animals* 14(24):3668, 2024
- Beef Cattle Behavior Data Set — Kaggle, `lucyfirst`; Cao et al., *Sci. Rep.* 15:17131, 2025 (CC BY-NC-ND 4.0)

## Authors

Sakshi, Baba Banda Singh Bahadur Engineering College (BBSBEC), Fatehgarh Sahib, Punjab, India.