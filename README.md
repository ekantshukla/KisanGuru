# KisanGuru – किसान गुरु

> **Deploying for the first time?** See **[DEPLOY.md](DEPLOY.md)**: push to GitHub, then host the whole app (website + API) as one Docker container on Render.com for free.
> Android app: [MOBILE.md](MOBILE.md) · Login (Firebase): [ACCOUNTS.md](ACCOUNTS.md) · Data credits: [NOTICE.md](NOTICE.md)


A bilingual (Hindi / English) website for Indian farmers. It has:

**Pan-India, in 12 languages.** The header has a language selector and a 📍 location chip, just like VaidikPandit.

- **Location: State → District → Tehsil/Taluka/Mandal → Village.** On the first visit a sheet opens (the same pattern as VaidikPandit) covering **36 states/UTs, 763 districts, 6,923 tehsils and 6,62,269 villages**. District is required; tehsil and village are optional. Farmers find their village by typing in English or their own script, and LGD village names in local scripts are shown where available. **Use my location (GPS)** picks the nearest district. The choice is saved in the browser and drives the weather, the default mandi state and district, and the AI advice.
  - **Data:** Local Government Directory (LGD), Ministry of Panchayati Raj, Govt. of India, released under the Government Open Data License – India; attribution required (see the note in the picker). The snapshot used is the March 2022 village list mirrored at github.com/planemad/india-local-government-directory. District centres come from DataMeet's Census-2011 district boundaries (CC BY 2.5 India).
  - **Rebuild with newer LGD data:** download *All Villages / Sub-Districts / Districts of India* from https://lgdirectory.gov.in/downloadDirectory.do (or https://ramseraph.github.io/opendata/lgd/), then run `python3 tools/build_places.py <lgd_csv_dir> <datameet_maps_dir>`. This writes `core/data/places.json` (bundled with the app, about 26 KB) and `App_Data/places/` (tehsils, plus one village file per state, 17 MB in total, loaded per state on demand).
  - **Weather point:** LGD has no coordinates. The API looks up the chosen village, or else the tehsil, by name with Open-Meteo's place search, keeps only a match in the same state and close to the district, caches it, and forecasts for that point. Otherwise it uses the district centre. The weather page shows which one was used. The 123 districts created after 2011 have only a rough centre until a name match refines it.
- **Languages:** Hindi, English, Bengali, Marathi, Telugu, Tamil, Gujarati, Kannada, Malayalam, Odia, Punjabi and Assamese.
  - **Menus, buttons and labels** are hand-written in every language (`src/app/core/i18n/*.ts`). Hindi and English load with the app; the others load when chosen.
  - **State names** are shown in the reader's script, transliterated from Hindi as in VaidikPandit, with the English name in brackets.
  - **Content** (schemes, crop guide, helplines, weather alerts) is written by hand in Hindi and English. For the other 10 languages the API translates the English text with Claude **once per sentence**, then saves it in `backend/KisanGuru.Api/App_Data/translations/{lang}.json`. Commit those files and every language works without calling the API again. Without an API key the site shows English for that content, or Hindi for Marathi, with all menus still in the farmer's language.
  - **The AI Sahayak** replies in the chosen language, and voice input and read-aloud use that language's locale.
  - To add a language (Urdu, Kashmiri, Konkani and others), add `core/i18n/{code}.ts`, one line in `core/languages.ts` and one in `Models/Languages.cs`.

| Page | What it does |
|---|---|
| **Mausam** (`/mausam`) | Current weather, a 7-day forecast with rain chance (%) and rain amount (mm), and farming alerts: heavy rain, don't-spray days, frost, heat and strong wind |
| **AI Sahayak** (`/sahayak`) | Ask any farming question by typing or speaking. Add a crop photo to identify a disease. Answers can be read aloud. |
| **Mandi Bhav** (`/mandi`) | Mandi prices by state, district and crop (live from Agmarknet via data.gov.in) |
| **Yojana** (`/yojana`) | PM-KISAN, PMFBY crop insurance, KCC, Soil Health Card, e-NAM, PM-KUSUM |
| **Fasal** (`/fasal`) | Crop guide covering sowing time, seed rate, irrigation and N:P:K for 8 major crops |
| **Calculator** (`/calculator`) | Fertiliser (DAP / urea / MOP bags), KCC loan interest, profit per acre |
| **Madad** (`/madad`) | Government helpline numbers with one-tap calling |

**Stack:** C# / ASP.NET Core Web API on **.NET 10 (LTS)** and **Angular 22** (standalone components, signals, zoneless, OnPush by default).

```
KisanGuru/
├── KisanGuru.sln
├── backend/KisanGuru.Api/        .NET 10 Web API
│   ├── Controllers/               schemes, crops, helplines, mandi, calculators, advisory
│   ├── Services/                  CalculatorService, MandiService (data.gov.in), AdvisoryService (Claude API)
│   ├── Data/                      SeedData (bilingual content) + IKnowledgeRepository
│   ├── Models/  Options/
│   └── appsettings.json
└── frontend/kisanguru-web/       Angular 22 app
    └── src/app/
        ├── core/                  ApiService, I18nService (Hindi/English), models
        └── pages/                 home, sahayak, mandi, schemes, crops, calculators, helplines
```

## Requirements

- **.NET 10 SDK**
- **Node.js 22.22+ or 24 LTS**. Angular 22 does not support Node 20.
- Angular 22 uses **TypeScript 6.0**, which is already set in `package.json`.

## Run it

**1. Backend** (http://localhost:5080, Swagger UI at `/swagger`)

```bash
cd backend/KisanGuru.Api
dotnet run
```

**2. Frontend** (http://localhost:4200, with `/api` proxied to the backend)

```bash
cd frontend/kisanguru-web
npm install
npm start
```

The site works straight away with the built-in content. Two features need free or paid keys:

### Weather and location search (no key)

Weather uses [Open-Meteo](https://open-meteo.com), which needs no key. **The free API is for non-commercial use only.** If KisanGuru earns money (ads, paid features), buy an Open-Meteo plan and set `Weather:ForecastUrl` and `Weather:ApiKey` to the customer endpoint. Forecasts are cached for 30 minutes per location to stay within fair use.

The farming alerts are simple rules in `Services/WeatherService.cs` (`FarmAlerts`), for example: ≥20 mm of rain means a heavy-rain warning, a minimum of ≤4°C means frost risk, and wind ≥25 km/h means don't spray. Tune the thresholds with local agronomists.

### Live mandi prices (free)

1. Sign up at https://data.gov.in and copy your API key from *My Account*.
2. Store it with user-secrets (keep keys out of git):

```bash
cd backend/KisanGuru.Api
dotnet user-secrets init
dotnet user-secrets set "Mandi:ApiKey" "YOUR_DATA_GOV_IN_KEY"
```

Without a key, the Mandi page shows **sample prices with a clear warning banner**.

### AI Sahayak (Claude API)

```bash
dotnet user-secrets set "Advisory:ApiKey" "YOUR_ANTHROPIC_API_KEY"
```

Get a key at https://console.anthropic.com. The key stays on the server and the browser never sees it. Without a key, the assistant replies with the Kisan Call Centre number. To change the model, set `Advisory:Model` in `appsettings.json`.

Voice input and read-aloud use the browser's built-in Web Speech API (best in Chrome or Edge on Android and desktop). Both support Hindi (`hi-IN`).

## Mobile look (like VaidikPandit)

- **Top bar has only three things**: 🙏 **सहयोग / Support** (like VaidikPandit's Dakshina), 🔔 **notifications** (today's unfinished field work and weather alerts, with a count) and 👤 **account**. Language and location are pills on the second row.
- **Home "today" band**: date and place, today's weather in big type, season chip, a farm alert, sunrise / sunset / 7-day rain, and an **Ask KisanGuru** box that opens the floating chat with the question.
- **Phones get a bottom tab bar**: आज (Today) · मेरा खेत (My fields) · मौसम (Weather) · मंडी (Market) · और (More). **More** opens a sheet with the AI card, the Support card and only the sections not already on screen (Schemes, Crop info, Calculators, Helplines). Wide screens keep the top menu.
- **Support page** (`/support`): ₹10 / 20 / 50 / 100 / 200 / 500 or any amount. It uses a UPI deep link, which opens PhonePe, Google Pay, Paytm or BHIM on the phone, plus a copyable UPI ID for computers. **Set `SUPPORT.upiId` in `core/app-info.ts`**; until then the Support button stays hidden. Giving is voluntary and nothing is locked behind it.

## My fields — crop calendar and daily reminders (Android app)

- **My fields** (`/khet`): the farmer adds each of their fields (khet) by name, for example "कुएं वाला खेत", with its area and water source (irrigated or rain-fed). Then they add the crops sown in each field, with sowing date (transplanting date for paddy) and area. A field can have more than one crop. **Today's work in all fields** is shown together at the top, grouped by field. Reminders name the field and crop. For an empty or harvested field, KisanGuru **suggests what to sow now** (`GET /api/calendar/suggest`), from each crop's sowing window and water need.
  KisanGuru then shows the whole season, from field preparation to harvest:
  - today's work, pending work and what is coming next
  - irrigations at the right stages (CRI, flowering and so on)
  - when to put urea, with **kg and bags for the farmer's own area**, plus DAP and MOP at sowing
  - weeding and weedicide, pests to watch and sprays (generic names and doses per acre)
  - harvest

  The farmer ticks tasks done. 8 crops have calendars (wheat, paddy, chana, mustard, soybean, maize, masoor, moong) in `Data/CropCalendars.cs`.
- **Location decides the suggestions**: the farmer's state picks the region (North plains, Central, **Bundelkhand** — Jhansi, Lalitpur, Jalaun, Hamirpur, Mahoba, Banda, Chitrakoot, Sagar, Chhatarpur, Tikamgarh, Niwari, Damoh, Panna, Datia — West, South, East/NE, Hills). Each region has its own sowing windows. Crops that don't suit a region are not suggested there (no wheat in Tamil Nadu, for example). Region tips are shown with the suggestions. Data: `Data/AgroZones.cs`.
- **Soil per field**:
  - **Black (mar)**: drops the optional irrigations (wheat jointing and dough, chana/mustard/masoor pod, maize grain filling) and adds "water before wide cracks, no standing water".
  - **Sandy**: adds "light, frequent water" and "split the urea".
  - **Red / stony (rakar)**: low-water crops and mulch.
  - **Mixed (kabar)** and **loam (padua)**: their own notes.
  - Each crop gets a soil fit (good / ok / poor), shown on the suggestions.
- **Weather-aware**: tasks in the next 7 days get a flag from the forecast. "Rain coming — don't spray or put urea", "good rain — skip watering", "strong wind — don't spray".
- **Android app with morning and evening reminders**: the Angular app is packaged as an APK with Capacitor 8.
  The reminders are scheduled on the phone, so they work without internet. See **MOBILE.md**.

## Accounts and the floating bot

- **Log in / Sign up** (`/account`) works like VaidikPandit: Firebase email + password, email verification and password reset. Sign-up saves the farmer's name, mobile, farm (state → district → tehsil → village dropdowns), land in acres and main crops to Firestore (`users/{uid}`). The saved farm becomes the site location automatically. Logging in is optional; every page works without it. Setup steps: see **ACCOUNTS.md** (paste your Firebase config into `core/app-info.ts` and deploy `firestore.rules`).
- **Location is not asked on the first visit.** It comes from the account, or the farmer taps the 📍 chip in the header.
- **KisanGuru AI** floats as a bot button at the bottom right of every page (with a one-time "Namaste!" teaser). It opens a chat window with photo, voice input and read-aloud. ⛶ opens the same conversation full screen at `/sahayak`. The last 8 messages are sent as `history` so follow-up questions work.

## API endpoints

- `GET /api/calendar/plan?crop=wheat&sown=2026-11-15&area=2&irrigated=true&lang=hi&lat=..&lon=..` — dated sowing-to-harvest plan for one field (with weather flags when lat/lon are given). `GET /api/calendar/crops` lists the crops with a calendar. The plan also takes `soil=black|mixed|loam|sandy|red`.
- `GET /api/calendar/suggest?irrigated=false&soil=black&state=Uttar Pradesh&district=Jhansi&lang=hi` — what to sow now, for that region, water and soil.


| Method | Route | |
|---|---|---|
| GET | `/api/schemes?category=&lang=bn` | income, insurance, credit, soil, market, energy |
| GET | `/api/schemes/{id}` | |
| GET | `/api/crops?season=&lang=te` | kharif, rabi, zaid |
| GET | `/api/crops/{id}` | |
| GET | `/api/helplines?lang=gu` | |
| GET | `/api/places/subdistricts?district=153` | tehsils/talukas of a district (LGD codes) |
| GET | `/api/places/villages?state=9&subdistrict=856` | villages of a tehsil, with local-script names |
| GET | `/api/weather?lat=25.5&lon=78.95&state=Uttar Pradesh&district=Jhansi&tehsil=Moth&village=Ahroli&lang=hi` | forecast for the village/tehsil if found, else district; 7 days + farm alerts |
| GET | `/api/mandi/prices?state=&district=&commodity=` | Agmarknet names, e.g. `Uttar Pradesh`, `Wheat` |
| POST | `/api/calculators/fertilizer` | `{ areaAcres, n, p, k }`, kg per acre |
| POST | `/api/calculators/loan` | `{ principal, months, annualRatePercent, promptRepayment }` |
| POST | `/api/calculators/profit` | `{ areaAcres, yieldQuintalPerAcre, pricePerQuintal, costPerAcre }` |
| POST | `/api/advisory/ask` | `{ question, language, imageBase64?, imageMediaType?, location? }` |

## Keeping content correct

- Scheme facts in `Data/SeedData.cs` were checked in November 2026. Amounts and limits change, so review them each season. The site always links to the official portal.
- Crop numbers are general guides. The site tells farmers to follow their Soil Health Card and local KVK.

## Ideas for next versions

1. **Database:** move `SeedData` into SQL Server or PostgreSQL with EF Core (swap `InMemoryKnowledgeRepository`), plus a small admin screen to edit content.
2. **Crop-specific weather alerts:** combine the farmer's crops and their growth stage with the forecast, and add IMD district warnings.
3. **Farmer login with OTP:** save each farmer's crops and land, and send personalised reminders.
4. **Kisan Bazaar:** let farmers list produce for sale and rent out tractors and equipment.
5. **WhatsApp bot:** the same advisory API over WhatsApp Business, which reaches far more farmers than a website.
6. **PWA and offline mode:** `ng add @angular/pwa` so the site works with poor network in villages.
7. **More languages and dialects:** Urdu (right-to-left), Bundeli, Bhojpuri, Konkani and others, plus a review of the translations by native-speaker agronomists.
