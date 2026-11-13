import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { FieldsService, addDays, daysBetween, isoDay } from './fields.service';
import { I18nService } from './i18n.service';
import { FarmField, PlanTask } from './models';

export interface ReminderSettings {
  on: boolean;
  morning: string;   // "06:30"
  evening: string;   // "17:30"
}

const STORAGE_KEY = 'km.reminders.v1';
const DAYS_AHEAD = 30;          // re-planned every time the app opens
const ID_BASE = 1000;           // notification ids 1000–1099 belong to the daily reminders
const CHANNEL = 'field-work';
const KIND_ORDER = ['harvest', 'sowing', 'fertilizer', 'protection', 'weeding', 'irrigation', 'prep', 'scouting'];

/**
 * Morning and evening field reminders on the phone (Android app built with Capacitor, see MOBILE.md).
 * They are scheduled on the phone itself for the next 30 days, so they arrive even without internet,
 * and are planned again whenever the app opens, the language changes or a field is added or ticked off.
 * On the website there is no background, so the "My fields" page shows today's work instead.
 */
@Injectable({ providedIn: 'root' })
export class ReminderService {
  private readonly fieldsSvc = inject(FieldsService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);

  readonly settings = signal<ReminderSettings>(this.read());
  /** 'native' = Android/iOS app; 'web' = browser (no background reminders). */
  readonly platform = signal<'native' | 'web'>('web');
  readonly permission = signal<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');
  readonly scheduledDays = signal(0);

  private plugin: any = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const s = this.settings();
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
    });
    this.init();
    // Plan again (debounced) when fields, done ticks, language or times change
    effect(() => {
      this.fieldsSvc.fields(); this.settings(); this.i18n.lang(); this.fieldsSvc.today();
      untracked(() => this.planSoon());
    });
  }

  private async init() {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;
      this.platform.set('native');
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      this.plugin = LocalNotifications;
      if (Capacitor.getPlatform() === 'android') {
        await LocalNotifications.createChannel({
          id: CHANNEL, name: 'Field work', description: 'Daily field reminders', importance: 4, visibility: 1, vibration: true
        });
      }
      this.permission.set((await LocalNotifications.checkPermissions()).display as any);
      // Tapping a reminder opens My fields
      LocalNotifications.addListener('localNotificationActionPerformed', () => this.router.navigateByUrl('/khet'));
      // Coming back to the app: fresh plans (weather) and reminders
      const { App } = await import('@capacitor/app');
      App.addListener('resume', () => { this.fieldsSvc.today.set(isoDay()); this.fieldsSvc.refresh(); this.planSoon(); });
      this.planSoon();
    } catch {
      this.platform.set('web');
    }
  }

  update(patch: Partial<ReminderSettings>) {
    this.settings.update(s => ({ ...s, ...patch }));
  }

  /** Ask for permission (Android 13+ shows the system dialog). */
  async enable(): Promise<boolean> {
    if (!this.plugin) return false;
    const r = await this.plugin.requestPermissions();
    this.permission.set(r.display);
    if (r.display === 'granted') { this.update({ on: true }); return true; }
    return false;
  }

  async test() {
    if (!this.plugin || !(await this.enable())) return;
    await this.plugin.schedule({ notifications: [{
      id: ID_BASE - 1, channelId: CHANNEL, title: '🌾 KisanGuru', body: this.i18n.t('notif.test'),
      schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true }
    }] });
  }

  private planSoon() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.plan(), 800);
  }

  private async plan() {
    const p = this.plugin;
    if (!p) return;
    const pending = await p.getPending();
    const ours = pending.notifications.filter((n: any) => n.id >= ID_BASE && n.id < ID_BASE + 2 * DAYS_AHEAD);
    if (ours.length) await p.cancel({ notifications: ours.map((n: any) => ({ id: n.id })) });

    const s = this.settings();
    const fields = this.fieldsSvc.active().filter(f => f.plan);
    if (!s.on || this.permission() !== 'granted' || !fields.length) { this.scheduledDays.set(0); return; }

    const now = Date.now();
    const notifications: any[] = [];
    let days = 0;
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const day = addDays(isoDay(), i);
      const growing = fields.filter(f => day >= addDays(f.sownOn, -10) && day <= f.plan!.harvestTo);
      if (!growing.length) continue;
      days++;
      const morning = this.at(day, s.morning), evening = this.at(day, s.evening);
      if (morning.getTime() > now + 60_000)
        notifications.push(this.note(ID_BASE + 2 * i, '🌅 ' + this.i18n.t('notif.morning'), this.morningBody(growing, day), morning));
      if (evening.getTime() > now + 60_000)
        notifications.push(this.note(ID_BASE + 2 * i + 1, '🌇 ' + this.i18n.t('notif.evening'), this.eveningBody(growing, day), evening));
    }
    if (notifications.length) await p.schedule({ notifications });
    this.scheduledDays.set(days);
  }

  private note(id: number, title: string, body: string, at: Date) {
    return { id, channelId: CHANNEL, title, body, largeBody: body, summaryText: 'KisanGuru', schedule: { at, allowWhileIdle: true } };
  }

  private at(day: string, hhmm: string): Date {
    const [y, m, d] = day.split('-').map(Number);
    const [hh, mm] = (hhmm || '06:30').split(':').map(Number);
    return new Date(y, m - 1, d, hh || 0, mm || 0);
  }

  /** "Wheat: 1st irrigation — the most important (CRI)" + amounts + weather warning */
  private line(f: FarmField, t: PlanTask, day: string): string {
    let s = `${this.label(f)}: ${this.i18n.loc(t.title)}`;
    const amt = this.fieldsSvc.amountText(t);
    if (amt) s += ` — ${amt}`;
    if (t.weather && daysBetween(isoDay(), day) <= 6) s += ` (⚠️ ${this.i18n.t('khet.wx.' + t.weather)})`;
    return s;
  }

  /** "Kuen wala khet · Wheat" — which field and which crop. */
  private label(f: FarmField): string {
    const crop = this.i18n.loc(f.plan!.cropName), plot = this.fieldsSvc.plot(f.plotId);
    return plot ? `${plot.name} · ${crop}` : crop;
  }

  private morningBody(fields: FarmField[], day: string): string {
    const lines: string[] = [];
    for (const f of fields) {
      const tasks = this.fieldsSvc.tasksOn(f, day)
        .filter(t => !f.done.includes(t.id))
        .sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
      for (const t of tasks.slice(0, 2)) lines.push('• ' + this.line(f, t, day));
    }
    if (lines.length > 5) {
      const more = lines.length - 4;
      lines.splice(4, lines.length, `+${more} …`);
    }
    if (lines.length) return lines.join('\n');
    const f = fields[0];
    return this.i18n.t('notif.visit')
      .replace('{crop}', this.label(f))
      .replace('{n}', String(Math.max(0, this.fieldsSvc.dayOf(f, day))));
  }

  private eveningBody(fields: FarmField[], day: string): string {
    const tomorrow = addDays(day, 1);
    const next: string[] = [];
    for (const f of fields) {
      for (const t of (f.plan!.tasks).filter(x => x.date === tomorrow && x.kind !== 'scouting' && !f.done.includes(x.id)))
        next.push(this.line(f, t, tomorrow));
    }
    const check = this.i18n.t('notif.eveningBody');
    return next.length ? `${check}\n${this.i18n.t('notif.tomorrow')}: ${next.slice(0, 3).join(' · ')}` : check;
  }

  private read(): ReminderSettings {
    const def: ReminderSettings = { on: true, morning: '06:30', evening: '17:30' };
    try { return { ...def, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; } catch { return def; }
  }
}
