// Farmer accounts on Firebase (Authentication + Cloud Firestore), the same approach as VaidikPandit:
// the Firebase SDK is loaded from Google's CDN on first use, so the site stays small and the build needs
// no extra packages. Profiles are protected by firestore.rules (see ACCOUNTS.md).
import { Injectable, computed, signal } from '@angular/core';
import { FIREBASE_CONFIG, WEBSITE_URL } from './app-info';
import { FarmField, FarmLocation, FarmPlot } from './models';

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
// Keep the bundler from trying to resolve the CDN URLs
const load = new Function('u', 'return import(u)') as (u: string) => Promise<any>;

export interface FarmerProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;        // 10 digits, never shown to others
  role: 'farmer';
  farm: FarmLocation | null;
  landAcres: number | null;
  crops: string[];      // commodity keys, e.g. 'wheat', 'gram'
  /** My fields: crop, sowing date, area, water, tasks done (the plan itself is rebuilt from the API). */
  fields?: SavedField[];
  /** The farmer's named fields (khet). */
  plots?: FarmPlot[];
  createdAt?: number;
}

export type SavedField = Pick<FarmField, 'id' | 'plotId' | 'cropId' | 'sownOn' | 'areaAcres' | 'irrigated' | 'done'>;

export interface SignUpData {
  name: string; email: string; password: string; phone: string;
  farm: FarmLocation; landAcres: number | null; crops: string[];
}

/** Accepts the JSON config, or the `const firebaseConfig = { … }` snippet from the Firebase console. */
function parseConfig(raw: string): Record<string, string> | null {
  if (!raw.trim()) return null;
  try { const j = JSON.parse(raw); if (j?.apiKey) return j; } catch { /* not strict JSON */ }
  const out: Record<string, string> = {};
  for (const m of raw.matchAll(/(\w+)\s*:\s*["']([^"']+)["']/g)) out[m[1]] = m[2];
  return out['apiKey'] && out['projectId'] ? out : null;
}
function hadAccount(): boolean { try { return localStorage.getItem('km.acct') === '1'; } catch { return true; } }
function rememberAccount(on: boolean) { try { if (on) localStorage.setItem('km.acct', '1'); else localStorage.removeItem('km.acct'); } catch { /* ignore */ } }
const ts = (v: any): number | undefined => (v?.toMillis ? v.toMillis() : typeof v === 'number' ? v : undefined);

/** Firebase error code → UI text key. */
export function authErrorKey(e: unknown): string {
  const code = String((e as { code?: string })?.code ?? '');
  if (/invalid-credential|wrong-password|user-not-found|invalid-login/.test(code)) return 'acc.err.login';
  if (code.includes('email-already-in-use')) return 'acc.err.exists';
  if (code.includes('weak-password')) return 'acc.err.weak';
  if (code.includes('invalid-email')) return 'acc.err.email';
  return 'acc.err.generic';
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly cfg = parseConfig(FIREBASE_CONFIG);
  readonly configured = !!this.cfg;

  /** null = not signed in; undefined = still checking. */
  readonly user = signal<{ uid: string; email: string; verified: boolean } | null | undefined>(undefined);
  readonly profile = signal<FarmerProfile | null>(null);
  readonly signedIn = computed(() => !!this.user());

  private fb?: Promise<{ auth: any; db: any; A: any; F: any }>;

  constructor() {
    if (typeof window !== 'undefined') {
      // Back from the verification email: refresh "verified" without a manual reload
      window.addEventListener('focus', () => { const u = this.user(); if (u && !u.verified) this.reloadUser().catch(() => undefined); });
    }
    // The Firebase SDK (~300 kB) is fetched only for people who have signed in on this device,
    // which keeps start-up fast on low-cost phones.
    if (this.configured && hadAccount()) this.init().catch(() => this.user.set(null));
    else this.user.set(null);
  }

  private backLink() { return { url: (WEBSITE_URL || location.origin + '/') + 'account' }; }

  private init() {
    this.fb ??= this.boot().catch(e => { console.warn('Firebase failed to load', e); this.fb = undefined; throw e; });
    return this.fb;
  }

  private boot() {
    return (async () => {
      const [appMod, A, F] = await Promise.all([load(SDK + 'firebase-app.js'), load(SDK + 'firebase-auth.js'), load(SDK + 'firebase-firestore.js')]);
      const app = appMod.initializeApp(this.cfg);
      // Email sign-in only (no popup/redirect), which also works inside an Android WebView
      const auth = A.initializeAuth(app, { persistence: [A.indexedDBLocalPersistence, A.browserLocalPersistence] });
      const dbId = this.cfg?.['databaseId'];
      const db = dbId && dbId !== '(default)' ? F.getFirestore(app, dbId) : F.getFirestore(app);
      A.onAuthStateChanged(auth, async (u: any) => {
        this.user.set(u ? { uid: u.uid, email: u.email ?? '', verified: !!u.emailVerified } : null);
        rememberAccount(!!u);
        this.profile.set(null);
        if (u) await this.loadProfile(u.uid).catch(e => console.warn('Profile failed to load', e));
      });
      return { auth, db, A, F };
    })();
  }

  private async loadProfile(uid: string) {
    const { db, F, auth } = await this.init();
    const snap = await F.getDoc(F.doc(db, 'users', uid));
    if (snap.exists()) {
      const d = snap.data();
      this.profile.set({ uid, name: d.name ?? '', email: d.email ?? auth.currentUser?.email ?? '', phone: d.phone ?? '', role: 'farmer',
        farm: d.farm ?? null, landAcres: d.landAcres ?? null, crops: d.crops ?? [], createdAt: ts(d.createdAt) });
    } else {
      // Login exists but the profile was never saved (e.g. the database wasn't ready at sign-up)
      const basic = { name: '', email: auth.currentUser?.email ?? '', phone: '', role: 'farmer', farm: null, landAcres: null, crops: [], createdAt: F.serverTimestamp() };
      await F.setDoc(F.doc(db, 'users', uid), basic);
      this.profile.set({ uid, ...basic, role: 'farmer', createdAt: Date.now() });
    }
  }

  async signUp(d: SignUpData) {
    const { auth, db, A, F } = await this.init();
    const cred = await A.createUserWithEmailAndPassword(auth, d.email.trim(), d.password);
    const profile = {
      name: d.name.trim(), email: d.email.trim(), phone: d.phone.trim(), role: 'farmer',
      farm: d.farm, landAcres: d.landAcres, crops: d.crops, createdAt: F.serverTimestamp()
    };
    await F.setDoc(F.doc(db, 'users', cred.user.uid), profile);
    this.profile.set({ uid: cred.user.uid, ...profile, role: 'farmer', createdAt: Date.now() });
    await A.sendEmailVerification(cred.user, this.backLink()).catch(() => A.sendEmailVerification(cred.user)).catch(() => undefined);
  }

  async signIn(email: string, password: string) {
    const { auth, A } = await this.init();
    await A.signInWithEmailAndPassword(auth, email.trim(), password);
  }

  async signOut() {
    const { auth, A } = await this.init();
    await A.signOut(auth);
  }

  async resetPassword(email: string) {
    const { auth, A } = await this.init();
    await A.sendPasswordResetEmail(auth, email.trim(), this.backLink())
      .catch((e: any) => { if (String(e?.code).includes('continue')) return A.sendPasswordResetEmail(auth, email.trim()); throw e; });
  }

  async resendVerification() {
    const { auth, A } = await this.init();
    if (auth.currentUser) await A.sendEmailVerification(auth.currentUser, this.backLink()).catch(() => A.sendEmailVerification(auth.currentUser));
  }

  async reloadUser() {
    const { auth } = await this.init();
    const u = auth.currentUser;
    if (!u) return;
    await u.reload();
    this.user.set({ uid: u.uid, email: u.email ?? '', verified: !!u.emailVerified });
  }

  async updateProfile(d: Partial<Pick<FarmerProfile, 'name' | 'phone' | 'farm' | 'landAcres' | 'crops' | 'fields' | 'plots'>>) {
    const { db, F } = await this.init();
    const u = this.user();
    if (!u) return;
    await F.updateDoc(F.doc(db, 'users', u.uid), d);
    this.profile.update(p => (p ? { ...p, ...d } : p));
  }
}
