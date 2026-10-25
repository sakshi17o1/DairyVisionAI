# Mobile + PWA + Dashboard translation

Copy (keep same folder names) into E:\DairyVisionAI\frontend\
  index.html, vite.config.js            -> frontend\
  public\*  (4 files)                   -> frontend\public\
  src\main.jsx, src\mobile.css          -> frontend\src\
  src\pages\Dashboard.jsx               -> frontend\src\pages\
  src\components\Chatbot.jsx            -> frontend\src\components\
  src\services\api.js                   -> frontend\src\services\
  src\i18n\translations.js, LanguageContext.jsx -> frontend\src\i18n\

Run (2 terminals):
  backend : uvicorn app:app --reload --port 8000
  frontend: npm run dev            (restart it, vite.config.js changed)

Phone test, same Wi-Fi: open http://<laptop-ip>:5173  (layout + analysis work; camera/install need HTTPS)
Phone with camera + install as app (needs HTTPS) - use a free tunnel:
  cloudflared tunnel --url http://localhost:5173      -> open the https://....trycloudflare.com link on phone
  Chrome menu -> "Add to Home screen" / "Install app"
For the installable (production) version:  npm run build ; npm run preview
