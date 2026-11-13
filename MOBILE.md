# KisanGuru Android app (APK) — daily field reminders

The phone app is the **same Angular app** in an Android wrapper made with Capacitor 8.
Every page works the same. The app adds **reminders on the phone**:

- **Every morning** (6:30 by default): today's field work for each crop the farmer added in **My fields**. For example:
  "Wheat: urea top-dressing — Urea 34 kg (1 bag)", or "1st irrigation — the most important (CRI)".
  On days with no special work it says to walk the field and look for pests, weeds and dry patches.
- **Every evening** (5:30 by default): a field check, plus **tomorrow's work**, so the farmer can get urea or spray ready.
- **Weather warnings**: when rain is coming, the reminder says to wait before spraying or putting urea. When good rain is coming, it says to skip watering.
  When the wind is strong, it says not to spray.
- The farmer can change the morning and evening times or turn reminders off on the **My fields** page. Tapping a reminder opens My fields.

The reminders are scheduled **on the phone** for the next 30 days. They still arrive when there is no internet in the village.
They are planned again every time the app opens, and when a crop is added, a task is ticked done, or the language changes.
The plan for each crop comes from the .NET API (`GET /api/calendar/plan`) and is saved on the phone.

## What you need

- Node 22+ and the Angular CLI (as for the website)
- Android Studio (Otter 2025.2.1 or newer) with an Android SDK, to build the APK
- The .NET API running somewhere the phone can reach, such as `https://api.yoursite.in`

## One-time setup

```bash
cd frontend/kisanguru-web
npm install
```

1. **API address.** In `src/app/core/app-info.ts`, set
   `export const API_URL = 'https://api.yoursite.in';`
   The website can leave this empty. The app must have it, because it runs from the phone.
2. **CORS.** The API must allow the app. `backend/KisanGuru.Api/appsettings.json` already lists
   `https://localhost` and `capacitor://localhost` under `Cors:AllowedOrigins`. Keep them in your production settings.
3. **Create the Android project:**

   ```bash
   npx ng build
   npx cap add android
   ```

4. **Notification icon.** Add a small white-on-transparent icon called `ic_stat_kisan`, for example a wheat ear.
   In Android Studio: right-click `android/app/src/main/res` → New → Image Asset → *Notification Icons*.
5. **Exact timing (optional).** Add this inside `<manifest>` in `android/app/src/main/AndroidManifest.xml`:

   ```xml
   <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
   ```

   Without it, Android may deliver a reminder a few minutes late. That is fine for field reminders.
   On Android 14+, users grant this permission themselves under Settings → Apps → KisanGuru → Alarms & reminders.
   The notification permission (Android 13+) is asked for automatically the first time the farmer adds a crop.

## Build and run

```bash
npm run android        # ng build + cap sync + opens Android Studio
```

In Android Studio, press ▶ to run on a phone, or use **Build → Generate Signed App Bundle / APK** to make a release APK or AAB for the Play Store.
After changing the Angular code, run `npm run android:sync` again.

## Testing reminders

Open **My fields**, add a crop with an old sowing date (for example wheat sown 20 days ago), then tap **Send a test notification**.
You should see one notification within 5 seconds. Set the morning time 2 minutes ahead to see a real daily reminder.

## Logged-in farmers

When the farmer is logged in (see ACCOUNTS.md), their crops are also saved to their account
(`users/{uid}.fields`). After they log in on a new phone, the crops and their reminders come back.
