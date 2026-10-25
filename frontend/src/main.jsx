import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./mobile.css";
import App from "./App.jsx";
import { LanguageProvider } from "./i18n/LanguageContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>
);

// PWA: register service worker only in production builds (avoids stale cache while developing)
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
