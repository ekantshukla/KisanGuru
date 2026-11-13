# KisanGuru को GitHub पर डालना और होस्ट करना (Deploy guide)

The whole app (Angular website + .NET API) runs as **one Docker container**: the API serves the website from `wwwroot` and the data from `/api`.
So there is one thing to host, one address, and no CORS setup.

---

## 1. GitHub पर डालें (Push to GitHub)

1. github.com पर नया **खाली** repository बनाएं, जैसे `kisanguru`. README, .gitignore या license न जोड़ें, क्योंकि ये पहले से zip में हैं.
2. Zip खोलें, फिर इस फ़ोल्डर (जहां यह फ़ाइल है) में terminal खोलकर चलाएं:

```bash
git init
git add .
git commit -m "KisanGuru: first version"
git branch -M main
git remote add origin https://github.com/<your-username>/kisanguru.git
git push -u origin main
```

3. GitHub पर **Actions** tab खोलें. "Build" workflow API, website और Docker image बनाकर ✅ या ❌ दिखाता है.
   ❌ आए तो उस step का error message कॉपी करके मुझे भेजें.

> इस code में कोई API key या पासवर्ड नहीं है, इसलिए इसे public repo में रखना सुरक्षित है. Keys सिर्फ़ hosting की settings में डालें (step 2), GitHub पर कभी नहीं.

---

## 2. होस्ट करें — Render.com (free, सबसे आसान)

1. render.com पर GitHub से sign in करें.
2. **New → Blueprint** चुनें, फिर अपना `kisanguru` repo चुनें. `render.yaml` अपने आप पढ़ लिया जाता है.
3. यह दो keys मांगेगा. अभी खाली छोड़ सकते हैं, बाद में **Environment** में डाल सकते हैं:

| Key | क्या है | कहां से मिलेगी |
|---|---|---|
| `Advisory__ApiKey` | AI सलाह, और 10 भाषाओं में अनुवाद | console.anthropic.com → API Keys |
| `Mandi__ApiKey` | असली मंडी भाव | data.gov.in → sign up → My Account → API key |

4. **Apply** दबाएं. पहली बार build में 5 से 10 मिनट लगते हैं. फिर `https://kisanguru-xxxx.onrender.com` पर साइट खुल जाएगी.
5. जांच के लिए `https://<your-app>.onrender.com/api/health` खोलें. जवाब `{"status":"ok"}` आना चाहिए.

Free plan में 15 मिनट तक कोई न आए तो app सो जाता है, और अगली बार खुलने में करीब 30 सेकंड लगते हैं. हमेशा चालू रखना हो तो Starter plan लें.

**Keys के बिना भी साइट चलती है:**
- मौसम, खेत का कैलेंडर, योजनाएं, फसल जानकारी, कैलकुलेटर और हिंदी व अंग्रेज़ी पूरी तरह चलते हैं.
- AI सलाह और बाकी 10 भाषाओं में योजनाओं और फसलों का अनुवाद के लिए `Advisory__ApiKey` चाहिए.
- असली मंडी भाव के लिए `Mandi__ApiKey` चाहिए.

### Other hosts (same Dockerfile)

- **Railway / Fly.io / Google Cloud Run**: deploy the repo's `Dockerfile`. The app listens on `$PORT` if the host sets it, otherwise on 8080.
- **Azure App Service (Linux, container)**: point it at the image, and set `WEBSITES_PORT=8080`.
- **Your own VPS**:

  ```bash
  docker build -t kisanguru .
  docker run -d -p 80:8080 -e Advisory__ApiKey=... -e Mandi__ApiKey=... --restart unless-stopped kisanguru
  ```

---

## 2-B. Website को GitHub Pages पर चलाना (API Render पर)

Website `https://ekantshukla.github.io/KisanGuru/` पर खुलेगी और data Render वाली API से लेगी.

1. ऊपर step 2 से API को Render पर deploy करें और उसका पता कॉपी करें, जैसे `https://kisanguru.onrender.com`.
2. GitHub repo → **Settings → Secrets and variables → Actions → Variables → New repository variable**
   - Name: `API_URL`
   - Value: Render वाला पता (आख़िर में `/` न लगाएं)
3. GitHub repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. **Actions → GitHub Pages → Run workflow** (या कोई भी commit करें). 2 से 3 मिनट में साइट चालू.
5. API Pages वाली साइट को data देने के लिए `https://ekantshukla.github.io` को पहले से allow करती है (`appsettings.json → Cors:AllowedOrigins`).
   Repo या username बदले तो Render → Environment में `Cors__AllowedOrigins__4` = नया पता जोड़ें.
6. Firebase login चालू करें तो Authorized domains में `ekantshukla.github.io` भी जोड़ें.

Render का free plan सोता है, इसलिए कुछ देर बाद पहली बार खोलने पर data आने में करीब 30 सेकंड लग सकते हैं.

---

## 3. अपनी settings (push से पहले या बाद में)

ये settings code में हैं. बदलकर commit और push करें, Render अपने आप दोबारा deploy कर देगा.

| फ़ाइल | क्या डालें |
|---|---|
| `frontend/kisanguru-web/src/app/core/app-info.ts` → `SUPPORT.upiId` | आपकी UPI ID. इसके बाद ही 🙏 सहयोग बटन दिखेगा |
| same file → `FIREBASE_CONFIG` | login/sign up के लिए. पूरे steps ACCOUNTS.md में हैं |
| same file → `WEBSITE_URL` | आपकी साइट का पता, जैसे `https://kisanguru.in` |
| same file → `API_URL` | सिर्फ़ Android ऐप के लिए: आपकी साइट का पता (MOBILE.md) |

**Firebase:** login चालू करने के बाद Firebase console → Authentication → Settings → **Authorized domains** में अपना Render domain (और custom domain) जोड़ें.

---

## 4. अपना domain (optional)

Render → your service → **Settings → Custom Domains** → `kisanguru.in` जोड़ें. Render जो DNS record बताए, उसे अपने domain provider के यहां डालें. HTTPS अपने आप चालू हो जाता है.

---

## 5. Run on your computer (for development)

```bash
# API  (http://localhost:5080, Swagger at /swagger)
cd backend/KisanGuru.Api
dotnet user-secrets init
dotnet user-secrets set "Advisory:ApiKey" "<key>"     # optional
dotnet run

# Website (http://localhost:4200, /api is proxied to the API)
cd frontend/kisanguru-web
npm install
npx ng serve
```

Requirements: .NET 10 SDK, Node 24 (or 22.22+).
