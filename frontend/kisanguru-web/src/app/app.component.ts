import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AccountService } from './core/account.service';
import { SUPPORT } from './core/app-info';
import { ChatService } from './core/chat.service';
import { I18nService } from './core/i18n.service';
import { LocationService } from './core/location.service';
import { ReminderService } from './core/reminder.service';
import { BotAvatarComponent } from './shared/bot-avatar.component';
import { GetAppComponent } from './shared/get-app.component';
import { HeroBandComponent } from './shared/hero-band.component';
import { IconComponent } from './shared/icon.component';
import { FieldsService } from './core/fields.service';
import { UiService } from './core/ui.service';
import { WeatherStore } from './core/weather.store';
import { ChatPanelComponent } from './shared/chat-panel.component';
import { PlacePickerComponent } from './shared/place-picker.component';

const KIND_ICON: Record<string, string> = {
  prep: '🚜', sowing: '🌱', fertilizer: '🧂', irrigation: '💧', weeding: '🌿', protection: '🧴', scouting: '🔍', harvest: '🌾'
};

@Component({
  selector: 'km-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PlacePickerComponent, BotAvatarComponent, ChatPanelComponent, IconComponent, HeroBandComponent, GetAppComponent],
  template: `
    <km-get-app />
    <header class="topbar">
      <div class="wrap topbar-inner">
        <a routerLink="/" class="brand" (click)="ui.closeAll()">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 48 48">
              <g fill="#f2b631">@for (r of rays; track r) { <path d="M24 1 L26.2 8 L21.8 8Z" [attr.transform]="'rotate(' + r + ' 24 24)'" /> }</g>
              <circle cx="24" cy="24" r="15" fill="#f2b631" /><circle cx="24" cy="24" r="12.5" fill="#e07b1f" />
              <g stroke="#fff6dc" stroke-width="1.6" stroke-linecap="round" fill="none">
                <path d="M24 35V15" />
                <path d="M24 20c-3-1-4.5-3-4.5-5.5 3 .6 4.5 2.4 4.5 5.5ZM24 20c3-1 4.5-3 4.5-5.5-3 .6-4.5 2.4-4.5 5.5ZM24 26c-3-1-4.5-3-4.5-5.5 3 .6 4.5 2.4 4.5 5.5ZM24 26c3-1 4.5-3 4.5-5.5-3 .6-4.5 2.4-4.5 5.5ZM24 32c-3-1-4.5-3-4.5-5.5 3 .6 4.5 2.4 4.5 5.5ZM24 32c3-1 4.5-3 4.5-5.5-3 .6-4.5 2.4-4.5 5.5Z" />
              </g>
            </svg>
          </span>
          <span class="brand-txt"><strong>{{ i18n.t('app.name') }}</strong><small>{{ i18n.lang() === 'en' ? 'किसान गुरु' : 'KisanGuru' }}</small></span>
        </a>

        <!-- Only three things on top (like VaidikPandit): Support (Dakshina), notifications, account -->
        <div class="top-actions">
          @if (supportOn) { <a routerLink="/support" class="support-pill"><km-icon name="support" /><span>{{ i18n.t('nav.support') }}</span></a> }
          <button type="button" class="round-btn" (click)="toggleNotif()" [attr.aria-expanded]="ui.notifOpen()" [attr.aria-label]="i18n.t('notif.title')">
            <km-icon name="bell" />
            @if (notifications().length) { <span class="badge-n">{{ notifications().length }}</span> }
          </button>
          <a routerLink="/account" class="round-btn" [attr.aria-label]="acc.signedIn() ? i18n.t('nav.myAccount') : i18n.t('nav.account')">
            @if (acc.signedIn()) { <span class="avatar sm">{{ initial() }}</span> } @else { <km-icon name="account" /> }
          </a>
        </div>
      </div>

      <div class="wrap prefs">
        <label class="pill">
          <span class="lbl">{{ langLabel() }}</span>
          <select (change)="i18n.set($any($event.target).value)" [attr.aria-label]="i18n.t('lang.label')">
            @for (l of i18n.languages; track l.code) { <option [value]="l.code" [selected]="l.code === i18n.lang()">{{ l.label }}</option> }
          </select>
          <km-icon name="down" class="chev" />
        </label>
        <km-place-picker />
      </div>

      <!-- Wide screens: the full menu. Phones use the bottom tab bar. -->
      <nav class="wrap nav">
        @for (item of nav; track item.path) {
          <a [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.path === '/' }">
            <km-icon [name]="item.icon" /> {{ i18n.t(item.key) }}
          </a>
        }
      </nav>
    </header>

    @if (onHome()) { <section class="hero-band"><km-hero-band /></section> }

    <main class="wrap page">
      <router-outlet />
    </main>

    <footer class="footer">
      <div class="wrap">
        <p>{{ i18n.t('footer.note') }}</p>
        <p>{{ i18n.t('home.kcc') }}: <a href="tel:18001801551"><strong>1800-180-1551</strong></a></p>
      </div>
    </footer>

    <!-- Phones: bottom tab bar + "More" sheet (like VaidikPandit) -->
    <nav class="tabbar" aria-label="Main">
      @for (t of tabs; track t.path) {
        <a [routerLink]="t.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: t.path === '/' }" (click)="ui.closeAll()">
          <km-icon [name]="t.icon" /><span>{{ i18n.t(t.key) }}</span>
        </a>
      }
      <button type="button" [class.active]="ui.moreOpen()" (click)="toggleMore()" [attr.aria-expanded]="ui.moreOpen()">
        <km-icon name="more" /><span>{{ i18n.t('nav.more') }}</span>
      </button>
    </nav>

    @if (ui.moreOpen()) {
      <div class="sheet-scrim" (click)="ui.moreOpen.set(false)"></div>
      <section class="more" role="dialog" aria-modal="true" [attr.aria-label]="i18n.t('home.allServices')" (keydown.escape)="ui.moreOpen.set(false)">
        <span class="grab" aria-hidden="true"></span>
        <button type="button" class="ask-card" (click)="ui.askBot()">
          <km-bot-avatar [size]="52" />
          <span><b>✨ {{ i18n.t('bot.title') }}</b><small>{{ i18n.t('home.askLine') }}</small></span>
        </button>
        @if (supportOn) {
        <a routerLink="/support" class="hl-card" (click)="ui.moreOpen.set(false)">
          <span class="hl-ic"><km-icon name="support" /></span>
          <span><b>{{ i18n.t('support.title') }}</b><small>{{ i18n.t('support.note') }}</small></span>
        </a>
        }
        <div class="grid">
          @for (item of allShown; track item.path) {
            <a [routerLink]="item.path" routerLinkActive="on" (click)="ui.moreOpen.set(false)"><km-icon [name]="item.icon" /><span>{{ i18n.t(item.key) }}</span></a>
          }
        </div>
      </section>
    }

    @if (ui.notifOpen()) {
      <div class="np-scrim" (click)="ui.notifOpen.set(false)"></div>
      <section class="np" role="dialog" [attr.aria-label]="i18n.t('notif.title')" (keydown.escape)="ui.notifOpen.set(false)">
        <h2><km-icon name="bell" /> {{ i18n.t('notif.title') }}</h2>
        @if (notifications().length) {
          <ul>
            @for (n of notifications(); track $index) {
              <li><a [routerLink]="n.link" (click)="ui.notifOpen.set(false)"><span>{{ n.icon }}</span>{{ n.text }}</a></li>
            }
          </ul>
        } @else {
          <p class="muted">{{ i18n.t('notif.empty') }}</p>
        }
        <a routerLink="/khet" class="np-set" (click)="ui.notifOpen.set(false)">🔔 {{ i18n.t('notif.settings') }} →</a>
      </section>
    }

    <!-- Floating KisanGuru bot (like VaidikPandit's PanditJi) -->
    @if (!onChatPage()) {
      @if (!ui.botOpen() && !ui.moreOpen()) {
        <button type="button" class="bot-fab" (click)="openBot()" [attr.aria-expanded]="ui.botOpen()" aria-controls="botwin"
                [attr.aria-label]="i18n.t('bot.ask')">
          @if (teaser()) { <span class="teaser" role="status">{{ i18n.t('bot.hello') }}</span> }
          @else { <span class="fab-label">✨ {{ i18n.t('bot.ask') }}</span> }
          <span class="ring"><km-bot-avatar [size]="58" [animate]="true" /></span>
          <span class="live" [class.off]="chat.aiOnline() === false" aria-hidden="true"></span>
        </button>
      } @else if (ui.botOpen()) {
        <div class="bot-scrim" (click)="ui.botOpen.set(false)"></div>
        <section id="botwin" class="botwin" role="dialog" aria-modal="true" [attr.aria-label]="i18n.t('bot.title')" (keydown.escape)="ui.botOpen.set(false)">
          <header class="bw-h">
            <km-bot-avatar [size]="40" [animate]="true" />
            <div class="bw-t">
              <h2>{{ i18n.t('bot.title') }}</h2>
              <span class="bw-s"><i [class.off]="chat.aiOnline() === false"></i>{{ chat.aiOnline() === false ? i18n.t('bot.offline') : i18n.t('bot.online') }}</span>
            </div>
            @if (chat.messages().length) {
              <button type="button" class="bw-b" (click)="chat.clear()" [attr.aria-label]="i18n.t('bot.new')" [attr.title]="i18n.t('bot.new')">＋</button>
            }
            <a routerLink="/sahayak" class="bw-b" (click)="ui.botOpen.set(false)" [attr.aria-label]="i18n.t('bot.full')" [attr.title]="i18n.t('bot.full')">⛶</a>
            <button type="button" class="bw-b" (click)="ui.botOpen.set(false)" [attr.aria-label]="i18n.t('bot.close')" [attr.title]="i18n.t('bot.close')">✕</button>
          </header>
          <div class="bw-body"><km-chat-panel /></div>
        </section>
      }
    }
  `
})
export class AppComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly acc = inject(AccountService);
  protected readonly chat = inject(ChatService);
  private readonly loc = inject(LocationService);
  private readonly router = inject(Router);
  /** Started with the app so the phone reminders are planned on every launch. */
  private readonly reminders = inject(ReminderService);

  protected readonly ui = inject(UiService);
  private readonly fields = inject(FieldsService);
  private readonly weather = inject(WeatherStore);
  /** The Support button shows only once a UPI ID is set in core/app-info.ts. */
  protected readonly supportOn = !!SUPPORT.upiId;
  protected readonly rays = Array.from({ length: 12 }, (_, i) => i * 30);
  /** A friendly "Namaste!" bubble for a few seconds on the first visit of the session. */
  protected readonly teaser = signal(false);

  private readonly url = toSignal(
    this.router.events.pipe(filter(e => e instanceof NavigationEnd), map(() => this.router.url.split(/[?#]/)[0])),
    { initialValue: '/' }
  );
  protected readonly onChatPage = computed(() => this.url().startsWith('/sahayak'));
  protected readonly onHome = computed(() => this.url() === '/' || this.url() === '');

  protected readonly langLabel = computed(() => this.i18n.languages.find(l => l.code === this.i18n.lang())?.label ?? '');

  /** Bell: today's field work not done yet, then the weather alerts. */
  protected readonly notifications = computed(() => {
    const list: { icon: string; text: string; link: string }[] = [];
    for (const it of this.fields.todayAll()) {
      if (it.task.kind === 'scouting' || it.field.done.includes(it.task.id)) continue;
      const crop = it.field.plan ? this.i18n.loc(it.field.plan.cropName) : '';
      list.push({ icon: KIND_ICON[it.task.kind] ?? '•', text: `${it.plot.name} · ${crop}: ${this.i18n.loc(it.task.title)}`, link: '/khet' });
    }
    for (const a of (this.weather.forecast()?.alerts ?? []).slice(0, 2))
      list.push({ icon: a.icon, text: this.i18n.loc(a.message), link: '/mausam' });
    return list;
  });

  protected readonly tabs = [
    { path: '/', key: 'nav.today', icon: 'today' },
    { path: '/khet', key: 'nav.khet', icon: 'khet' },
    { path: '/mausam', key: 'nav.mausam', icon: 'mausam' },
    { path: '/mandi', key: 'tab.mandi', icon: 'mandi' }
  ];
  protected readonly all = [
    { path: '/sahayak', key: 'nav.sahayak', icon: 'sahayak' },
    { path: '/khet', key: 'nav.khet', icon: 'khet' },
    { path: '/mausam', key: 'nav.mausam', icon: 'mausam' },
    { path: '/mandi', key: 'nav.mandi', icon: 'mandi' },
    { path: '/yojana', key: 'nav.yojana', icon: 'yojana' },
    { path: '/fasal', key: 'nav.fasal', icon: 'fasal' },
    { path: '/calculator', key: 'nav.calc', icon: 'calculator' },
    { path: '/madad', key: 'nav.madad', icon: 'madad' },
    { path: '/support', key: 'nav.support', icon: 'support' },
    { path: '/account', key: 'nav.account', icon: 'account' }
  ];
  /**
   * The More grid shows only what is not already on screen: the bottom tabs, the header (Support, account)
   * and the AI card at the top of the sheet are left out.
   */
  protected readonly allShown = this.all.filter(x =>
    !this.tabs.some(t => t.path === x.path) && !['/sahayak', '/support', '/account'].includes(x.path));

  protected readonly nav = [
    { path: '/', key: 'nav.home', icon: 'today' },
    { path: '/khet', key: 'nav.khet', icon: 'khet' },
    { path: '/mausam', key: 'nav.mausam', icon: 'mausam' },
    { path: '/sahayak', key: 'nav.sahayak', icon: 'sahayak' },
    { path: '/mandi', key: 'nav.mandi', icon: 'mandi' },
    { path: '/yojana', key: 'nav.yojana', icon: 'yojana' },
    { path: '/fasal', key: 'nav.fasal', icon: 'fasal' },
    { path: '/calculator', key: 'nav.calc', icon: 'calculator' },
    { path: '/madad', key: 'nav.madad', icon: 'madad' }
  ];

  constructor() {
    // Any navigation closes the More sheet and the notifications list
    effect(() => { this.url(); this.ui.closeAll(); });

    // The farm saved in the farmer's profile becomes the app's location (weather, mandi, AI advice).
    effect(() => {
      const farm = this.acc.profile()?.farm;
      if (farm) this.loc.set(farm);
    });

    try {
      if (!sessionStorage.getItem('km.teased')) {
        sessionStorage.setItem('km.teased', '1');
        setTimeout(() => this.teaser.set(true), 1500);
        setTimeout(() => this.teaser.set(false), 8000);
      }
    } catch { /* storage unavailable */ }
  }

  protected initial(): string {
    return (this.acc.profile()?.name || this.acc.user()?.email || '?').trim().charAt(0).toUpperCase();
  }

  protected openBot(): void {
    this.teaser.set(false);
    this.ui.askBot();
  }

  protected toggleMore() { this.ui.notifOpen.set(false); this.ui.moreOpen.update(o => !o); }
  protected toggleNotif() { this.ui.moreOpen.set(false); this.ui.notifOpen.update(o => !o); }
}
