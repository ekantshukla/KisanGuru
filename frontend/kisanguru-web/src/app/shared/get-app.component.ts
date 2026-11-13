import { Component, computed, inject, signal } from '@angular/core';
import { APP_DOWNLOAD_URL } from '../core/app-info';
import { I18nService } from '../core/i18n.service';

/** Chrome's install prompt event (not in the TypeScript DOM types yet). */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const HIDE_KEY = 'km.getapp.hiddenUntil';
const HIDE_DAYS = 7;

/**
 * "Get the KisanGuru app" bar at the very top of the website (like VaidikPandit).
 * Hidden inside the Android app and when the site is already installed. Tapping the button:
 * opens APP_DOWNLOAD_URL on Android if it is set, else shows the browser's "Install app" prompt,
 * else (iPhone) tells how to add it to the home screen.
 */
@Component({
  selector: 'km-get-app',
  template: `
    @if (show()) {
      <aside class="getapp" [attr.aria-label]="i18n.t('getapp.title')">
        <img class="ga-icon" src="icons/icon-192.png" alt="" width="40" height="40" />
        <div class="ga-txt">
          <strong>{{ i18n.t('getapp.title') }}</strong>
          <small>{{ iosTip() ? i18n.t('getapp.ios') : i18n.t('getapp.sub') }}</small>
        </div>
        @if (!iosTip()) { <button type="button" class="ga-btn" (click)="get()">{{ i18n.t('getapp.btn') }}</button> }
        <button type="button" class="ga-x" (click)="hide()" [attr.aria-label]="i18n.t('getapp.close')">✕</button>
      </aside>
    }
  `
})
export class GetAppComponent {
  protected readonly i18n = inject(I18nService);

  private readonly prompt = signal<InstallPromptEvent | null>(null);
  private readonly dismissed = signal(this.wasHidden());
  private readonly installed = signal(this.isInstalled());
  protected readonly iosTip = signal(false);

  private readonly ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  private readonly isAndroid = /Android/i.test(this.ua);
  private readonly isIos = /iPhone|iPad|iPod/i.test(this.ua) || (/Macintosh/.test(this.ua) && typeof document !== 'undefined' && 'ontouchend' in document);

  protected readonly show = computed(() => {
    if (this.dismissed() || this.installed()) return false;
    return !!this.prompt() || this.isIos || (this.isAndroid && !!APP_DOWNLOAD_URL);
  });

  constructor() {
    if (typeof window === 'undefined') return;
    if ((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()) {
      this.installed.set(true);
      return;
    }
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.prompt.set(e as InstallPromptEvent);
    });
    window.addEventListener('appinstalled', () => this.installed.set(true));
  }

  protected async get(): Promise<void> {
    if (this.isAndroid && APP_DOWNLOAD_URL) {
      window.open(APP_DOWNLOAD_URL, '_blank', 'noopener');
      return;
    }
    const p = this.prompt();
    if (p) {
      await p.prompt();
      const { outcome } = await p.userChoice.catch(() => ({ outcome: 'dismissed' as const }));
      this.prompt.set(null);
      if (outcome === 'accepted') this.installed.set(true);
      return;
    }
    if (this.isIos) this.iosTip.set(true);
  }

  protected hide(): void {
    this.dismissed.set(true);
    try { localStorage.setItem(HIDE_KEY, String(Date.now() + HIDE_DAYS * 86_400_000)); } catch { /* private mode */ }
  }

  private wasHidden(): boolean {
    try { return Number(localStorage.getItem(HIDE_KEY) || 0) > Date.now(); } catch { return false; }
  }

  private isInstalled(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  }
}
