# Farmer accounts (log in / sign up): setup

KisanGuru lets farmers create a free account. They sign up with their name, mobile number and farm (**State → District → Tehsil → Village**, land and main crops), plus an email and password. The saved farm becomes the app's location for weather, mandi prices and AI advice, on any phone they log in from.

Accounts use **Firebase** (Google), the same as VaidikPandit. The free Spark plan is enough and needs no card. Until you finish these steps, the account page says accounts are not set up yet, and the rest of the site works without logging in.

## One-time setup (about 15 minutes)

### 1. Create the Firebase project
1. Open https://console.firebase.google.com and sign in.
2. Click **Create a project** and name it, for example `kisanguru`. Google Analytics is optional.

### 2. Turn on email login
1. Go to **Build → Authentication → Get started**.
2. Under **Sign-in method**, choose **Email/Password**, turn on the first switch and click **Save**.
3. Under **Settings → Authorized domains**, add the domain your site runs on. `localhost` is already listed.

### 3. Create the database
1. Go to **Build → Firestore Database → Create database**.
2. Pick `asia-south1 (Mumbai)`. You can't change the location later.
3. Start in **production mode**.
4. In the **Rules** tab, replace everything with the contents of [`firestore.rules`](firestore.rules) and click **Publish**.

### 4. Put the web config in the app
1. In Firebase, open the gear icon → **Project settings** → **Your apps** → the **Web** icon `</>`, and register an app named `KisanGuru web`.
2. Copy the `firebaseConfig = { … }` block it shows.
3. Paste it into `frontend/kisanguru-web/src/app/core/app-info.ts` as `FIREBASE_CONFIG` (the JSON or the snippet both work). If the site has a fixed address, also set `WEBSITE_URL`, e.g. `https://kisanguru.in/`, so the "verify email" and "reset password" links come back to `/account`.

The web config is public by design. `firestore.rules` is what keeps each farmer's profile private.

### 5. Build and deploy
`npm run build` and deploy as usual. The header now shows **Log in**, and `/account` has **Log in**, **Sign up** and **Forgot password?**.

## What is stored

`users/{uid}`: `name`, `email`, `phone` (10 digits), `role: "farmer"`, `farm` (state, district, tehsil and village names and LGD codes, plus the district centre), `landAcres`, `crops` and `createdAt`. Only the farmer can read or change their own profile. KisanGuru never asks for Aadhaar, bank details or OTPs.

## Later
- **Mobile OTP login:** Firebase Phone Auth works too, but SMS costs money beyond the free quota and needs reCAPTCHA. Email login is free, which is why VaidikPandit uses it.
- **Using the login in the .NET API**, e.g. to save each farmer's chat history: send the Firebase ID token as `Authorization: Bearer …` and validate it with `Microsoft.AspNetCore.Authentication.JwtBearer`, using authority `https://securetoken.google.com/<projectId>` and audience `<projectId>`.
