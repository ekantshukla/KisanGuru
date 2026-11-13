/**
 * Site settings filled in at deploy time (see ACCOUNTS.md).
 */

/** The live website address, used in "verify email" / "reset password" links. Empty = the current address. */
export const WEBSITE_URL: string = '';

/**
 * Accounts (log in / sign up). The web config of your Firebase project — paste the JSON, or the
 * `const firebaseConfig = { apiKey: "…", … }` snippet the Firebase console shows. It is public by design:
 * firestore.rules protects the data. Empty = the account page says accounts are not set up yet,
 * and everything else on the site works without logging in.
 */
export const FIREBASE_CONFIG: string = '';

/**
 * Address of the .NET API, e.g. "https://api.kisanguru.in". Empty = same address as the website (/api),
 * which is right for the website. The Android app (see MOBILE.md) runs from the phone, so it needs the full address.
 */
export const API_URL: string = '';

/**
 * "Support us" (like VaidikPandit's Dakshina): farmers and well-wishers can pay any amount by UPI.
 * Put your own UPI ID (VPA) and the name it should show. Leave upiId empty to hide the button.
 */
export const SUPPORT = {
  upiId: 'shuklaekant@okhdfcbank',
  payeeName: 'KisanGuru',
  amounts: [10, 20, 50, 100, 200, 500],
  note: 'KisanGuru support'
};
