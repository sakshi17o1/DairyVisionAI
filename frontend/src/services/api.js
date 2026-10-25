// Empty base = same origin. In dev the Vite proxy (vite.config.js) forwards
// /analyze, /chat, /advice, /api to the FastAPI backend, so the same build works
// on laptop, phone and through an HTTPS tunnel. Set VITE_API_URL only if the
// backend is hosted elsewhere.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

export async function checkBackend() {
  const response = await fetch(`${API_BASE_URL}/api/health`);

  if (!response.ok) {
    throw new Error("Backend connection failed");
  }

  return response.json();
}

export { API_BASE_URL };
