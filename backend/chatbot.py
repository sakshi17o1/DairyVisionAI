"""Cattle-care + LSD chatbot. Key stays on the server (env var ANTHROPIC_API_KEY)."""
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

MODEL = os.getenv("CHATBOT_MODEL", "claude-sonnet-5-5")
LANG_NAME = {"en": "English", "hi": "Hindi (Devanagari script)", "pa": "Punjabi (Gurmukhi script)"}

SYSTEM_PROMPT = """You are the ALSD-AI assistant (Animal Lumpy Skin Disease AI Detector), helping farmers and students in India.
Scope: cattle and buffalo care, feeding, housing, breeds, body condition, milk-yield basics, common behaviour, biosecurity, and especially Lumpy Skin Disease (LSD): signs, spread by flies/mosquitoes/ticks, isolation, vaccination, prevention, and when to call a vet.
Rules:
- Reply ONLY in {lang}. Use short, simple sentences and short bullet points.
- You are not a veterinarian. Never give medicine names with doses; for treatment, fever, wounds or any sick animal, tell the user to contact a local veterinarian / Animal Husbandry Department.
- If the user describes lumps on skin, fever and reduced milk or feed, say it may be LSD and advise isolation and calling a vet immediately.
- If a question is outside cattle/livestock topics, politely say you can only help with cattle and LSD.
- If you are not sure, say so instead of guessing.
- Briefly explain the app when asked: it detects cattle (YOLO), identifies species/breed, body condition score, lumpy-skin health risk and behaviour (CNN-LSTM), and it is a screening aid, not a diagnosis."""


class Msg(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(max_length=1500)


class ChatRequest(BaseModel):
    messages: list[Msg] = Field(min_length=1, max_length=20)
    lang: str = "en"


PROVIDER = os.getenv("CHAT_PROVIDER", "gemini").lower()   # "gemini" (free tier) or "anthropic" (paid)
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


def _ask_gemini(msgs, system):
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise HTTPException(503, "Chatbot not configured: set GEMINI_API_KEY on the server.")
    from google import genai
    from google.genai import types
    client = genai.Client(api_key=key)
    contents = [
        types.Content(role="user" if m["role"] == "user" else "model",
                      parts=[types.Part(text=m["content"])])
        for m in msgs
    ]
    resp = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(system_instruction=system, max_output_tokens=800),
    )
    return resp.text or ""


def _ask_anthropic(msgs, system):
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        raise HTTPException(503, "Chatbot not configured: set ANTHROPIC_API_KEY on the server.")
    import anthropic
    client = anthropic.Anthropic(api_key=key)
    resp = client.messages.create(model=MODEL, max_tokens=600, system=system, messages=msgs)
    return "".join(b.text for b in resp.content if b.type == "text")


@router.post("/chat")
def chat(req: ChatRequest):
    msgs = [m.model_dump() for m in req.messages[-10:]]
    if msgs[0]["role"] != "user":
        msgs = msgs[1:]
    system = SYSTEM_PROMPT.format(lang=LANG_NAME.get(req.lang, "English"))
    try:
        reply = _ask_anthropic(msgs, system) if PROVIDER == "anthropic" else _ask_gemini(msgs, system)
        return {"reply": reply}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(502, f"Chatbot error: {e}")
