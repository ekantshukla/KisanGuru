import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccountService } from './account.service';
import { ApiService } from './api.service';
import { I18nService } from './i18n.service';
import { LocationService } from './location.service';
import { FarmField, FarmPlot, PlanTask, SuggestResponse } from './models';

const STORAGE_KEY = 'km.fields.v1';
const PLOTS_KEY = 'km.plots.v1';
const MAX_FIELDS = 60;
const MAX_PLOTS = 30;
const PLAN_MAX_AGE_MS = 6 * 60 * 60 * 1000;   // weather flags are refreshed every 6 hours

const newId = () => Math.random().toString(36).slice(2, 10);

/** Local date as yyyy-MM-dd (India time on an Indian phone). */
export function isoDay(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return isoDay(new Date(y, m - 1, d + n));
}
export function daysBetween(fromIso: string, toIso: string): number {
  const a = fromIso.split('-').map(Number), b = toIso.split('-').map(Number);
  return Math.round((Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2])) / 86_400_000);
}

/** Is this task's window open on `day`? */
export function activeOn(t: PlanTask, day: string): boolean {
  return t.date <= day && day <= (t.endDate || t.date);
}

/** Work that should be done but isn't (scouting tasks are watch-only, so never "pending"). */
export function isPending(t: PlanTask, f: FarmField, today: string): boolean {
  return t.kind !== 'scouting' && !f.done.includes(t.id) && (t.endDate || t.date) < today && daysBetween(t.endDate || t.date, today) <= 14;
}

/** A task for today, with the field (khet) and crop it belongs to. */
export interface TodayItem { plot: FarmPlot; field: FarmField; task: PlanTask; }

/**
 * The farmer's fields (khet: name, area, water) and the crops sown in each ("My fields"). Each field keeps its sowing-to-harvest plan from the API on the phone,
 * so today's work and the reminders work without internet. Logged-in farmers also get the fields
 * saved in their account (without the plan, which is rebuilt from the API).
 */
@Injectable({ providedIn: 'root' })
export class FieldsService {
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);
  private readonly loc = inject(LocationService);
  private readonly acc = inject(AccountService);

  readonly plots = signal<FarmPlot[]>(this.readPlots());
  readonly fields = signal<FarmField[]>(this.read());
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly today = signal(isoDay());

  /** Crops not harvested yet (with a few days' grace). */
  readonly active = computed(() => this.fields().filter(f => !f.plan || addDays(f.plan.harvestTo, 7) >= this.today()));

  /** Today's work in every field, field by field. */
  readonly todayAll = computed<TodayItem[]>(() => {
    const day = this.today(), out: TodayItem[] = [];
    for (const plot of this.plots())
      for (const field of this.active().filter(f => f.plotId === plot.id))
        for (const task of this.tasksOn(field, day)) out.push({ plot, field, task });
    return out;
  });

  /** Sowing suggestions, by language + place + water + soil (see suggestKey). */
  readonly suggestions = signal<Record<string, SuggestResponse>>({});
  private readonly suggestLoading = new Set<string>();

  constructor() {
    this.migrate();
    effect(() => {
      const list = this.fields(), plots = this.plots();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        localStorage.setItem(PLOTS_KEY, JSON.stringify(plots));
      } catch { /* storage full or off */ }
    });
    // New language or new location → fresh plans (translated text, local weather flags)
    effect(() => {
      this.i18n.lang(); this.loc.location();
      untracked(() => this.refresh(true));
    });
    // Fields saved in the account come to this phone on log in
    effect(() => {
      const p = this.acc.profile();
      if (!p?.fields?.length && !p?.plots?.length) return;
      untracked(() => {
        const myPlots = this.plots();
        const newPlots = (p.plots ?? []).filter(x => !myPlots.some(m => m.id === x.id));
        if (newPlots.length) this.plots.set([...myPlots, ...newPlots]);
        const mine = this.fields();
        const added = (p.fields ?? []).filter(s => !mine.some(m => m.id === s.id)).map(s => ({ ...s, done: s.done ?? [] }));
        if (added.length) { this.fields.set([...mine, ...added]); this.migrate(); this.refresh(); }
      });
    });
    // Date changes at midnight while the app stays open
    setInterval(() => { const d = isoDay(); if (d !== this.today()) this.today.set(d); }, 60_000);
  }

  dayOf(f: FarmField, on = this.today()): number { return daysBetween(f.sownOn, on); }

  tasksOn(f: FarmField, day: string): PlanTask[] {
    return (f.plan?.tasks ?? []).filter(t => activeOn(t, day));
  }

  pending(f: FarmField): PlanTask[] {
    const today = this.today();
    return (f.plan?.tasks ?? []).filter(t => isPending(t, f, today));
  }

  upcoming(f: FarmField, count = 3): PlanTask[] {
    const today = this.today();
    return (f.plan?.tasks ?? []).filter(t => t.date > today && t.kind !== 'scouting').slice(0, count);
  }

  /** "Urea 42 kg (1 bag) · DAP 52 kg (2 bags)" for this field's area. Bags: urea 45 kg, DAP and MOP 50 kg. */
  amountText(t: PlanTask): string {
    const a = t.amounts;
    if (!a) return '';
    const kg = this.i18n.t('khet.kg'), bag = this.i18n.t('khet.bags');
    const one = (key: string, v: number | null | undefined, bagKg: number) =>
      v ? `${this.i18n.t(key)} ${Math.round(v)} ${kg} (${Math.max(0.5, Math.ceil(v / bagKg * 2) / 2)} ${bag})` : '';
    return [one('khet.urea', a.ureaKg, 45), one('khet.dap', a.dapKg, 50), one('khet.mop', a.mopKg, 50)].filter(Boolean).join(' · ');
  }

  stageName(f: FarmField): string {
    const d = this.dayOf(f);
    const s = f.plan?.stages.find(x => d >= x.from && d <= x.to);
    return s ? this.i18n.loc(s.name) : '';
  }

  plot(id: string): FarmPlot | undefined { return this.plots().find(p => p.id === id); }

  cropsIn(plotId: string): FarmField[] { return this.fields().filter(f => f.plotId === plotId); }

  /** Crops still growing in this field. */
  activeIn(plotId: string): FarmField[] { return this.active().filter(f => f.plotId === plotId); }

  /** Acres of this field not yet under a growing crop. */
  freeArea(plotId: string): number {
    const p = this.plot(plotId);
    if (!p) return 0;
    const used = this.activeIn(plotId).reduce((a, f) => a + f.areaAcres, 0);
    return Math.max(0, Math.round((p.areaAcres - used) * 100) / 100);
  }

  addPlot(input: { name: string; areaAcres: number; irrigated: boolean; soil?: FarmPlot['soil'] }): string | null {
    if (this.plots().length >= MAX_PLOTS) return null;
    const plot: FarmPlot = {
      id: newId(), name: input.name.trim().slice(0, 40) || this.defaultName(),
      areaAcres: input.areaAcres, irrigated: input.irrigated, soil: input.soil ?? null
    };
    this.plots.update(list => [...list, plot]);
    this.syncAccount();
    return plot.id;
  }

  /** Rename, resize or change the water or soil of a field; its crops get fresh plans if water or soil changed. */
  updatePlot(id: string, patch: Partial<Omit<FarmPlot, 'id'>>) {
    const before = this.plot(id);
    this.plots.update(list => list.map(p => p.id === id ? { ...p, ...patch, name: (patch.name ?? p.name).trim().slice(0, 40) || p.name } : p));
    const water = patch.irrigated !== undefined && patch.irrigated !== before?.irrigated;
    const soil = patch.soil !== undefined && patch.soil !== before?.soil;
    if (before && (water || soil)) {
      this.fields.update(list => list.map(f => f.plotId === id ? { ...f, irrigated: patch.irrigated ?? f.irrigated, planAt: 0 } : f));
      this.refresh();
    }
    this.syncAccount();
  }

  removePlot(id: string) {
    this.plots.update(list => list.filter(p => p.id !== id));
    this.fields.update(list => list.filter(f => f.plotId !== id));
    this.syncAccount();
  }

  defaultName(): string {
    return this.i18n.t('khet.defaultName').replace('{n}', String(this.plots().length + 1));
  }

  private suggestKey(p: FarmPlot): string {
    const l = this.loc.location();
    return [this.i18n.lang(), l?.state ?? '', l?.district ?? '', p.irrigated, p.soil ?? ''].join('|');
  }

  /**
   * What to sow in this field now: worked out for the farmer's region (state, and district for Bundelkhand)
   * and this field's water and soil. Undefined while loading; loads once per place/language/water/soil.
   */
  suggestionsFor(p: FarmPlot): SuggestResponse | undefined {
    const key = this.suggestKey(p);
    const have = this.suggestions()[key];
    if (!have && !this.suggestLoading.has(key)) {
      this.suggestLoading.add(key);
      const l = this.loc.location();
      this.api.suggest({ irrigated: p.irrigated, soil: p.soil, state: l?.state, district: l?.district }, this.i18n.lang()).subscribe({
        next: res => { this.suggestLoading.delete(key); this.suggestions.update(s => ({ ...s, [key]: res })); },
        error: () => { setTimeout(() => this.suggestLoading.delete(key), 30_000); }
      });
    }
    return have;
  }

  async add(input: { plotId: string; cropId: string; sownOn: string; areaAcres: number }): Promise<boolean> {
    const plot = this.plot(input.plotId);
    if (!plot || this.fields().length >= MAX_FIELDS) return false;
    const field: FarmField = { id: newId(), ...input, irrigated: plot.irrigated, done: [] };
    const ok = await this.fetchPlan(field);
    if (!ok) return false;
    this.fields.update(list => [...list, field]);
    this.syncAccount();
    return true;
  }

  remove(id: string) {
    this.fields.update(list => list.filter(f => f.id !== id));
    this.syncAccount();
  }

  toggleDone(fieldId: string, taskId: string) {
    this.fields.update(list => list.map(f => f.id !== fieldId ? f
      : { ...f, done: f.done.includes(taskId) ? f.done.filter(x => x !== taskId) : [...f.done, taskId] }));
    this.syncAccount();
  }

  /** Re-fetch plans that are old, in another language, or (force) after a location change. */
  async refresh(force = false) {
    const lang = this.i18n.lang();
    const stale = this.fields().filter(f => force || !f.plan || f.planLang !== lang || Date.now() - (f.planAt ?? 0) > PLAN_MAX_AGE_MS);
    if (!stale.length) return;
    this.loading.set(true);
    const updated = new Map<string, FarmField>();
    for (const f of stale) {
      const copy = { ...f };
      if (await this.fetchPlan(copy)) updated.set(f.id, copy);
    }
    this.loading.set(false);
    if (updated.size) this.fields.update(list => list.map(f => updated.get(f.id) ?? f));
  }

  private async fetchPlan(f: FarmField): Promise<boolean> {
    try {
      this.error.set(false);
      const lang = this.i18n.lang();
      f.plan = await firstValueFrom(this.api.plan(f, lang, this.loc.location(), this.plot(f.plotId)?.soil));
      f.planLang = lang;
      f.planAt = Date.now();
      return true;
    } catch {
      this.error.set(true);   // offline: the saved plan keeps working
      return false;
    }
  }

  private syncAccount() {
    if (!this.acc.profile()) return;
    const fields = this.fields().map(({ id, plotId, cropId, sownOn, areaAcres, irrigated, done }) => ({ id, plotId, cropId, sownOn, areaAcres, irrigated, done }));
    this.acc.updateProfile({ fields, plots: this.plots() }).catch(() => { /* saved on the phone anyway */ });
  }

  /** Crops saved before fields had names go into a field of their own. */
  private migrate() {
    const orphans = this.fields().filter(f => !f.plotId || !this.plot(f.plotId));
    if (!orphans.length) return;
    const id = newId();
    const area = orphans.reduce((a, f) => Math.max(a, f.areaAcres), 0) || 1;
    this.plots.update(list => [...list, { id, name: this.defaultName(), areaAcres: area, irrigated: orphans[0].irrigated }]);
    this.fields.update(list => list.map(f => orphans.includes(f) ? { ...f, plotId: id } : f));
  }

  private readPlots(): FarmPlot[] {
    try {
      const list = JSON.parse(localStorage.getItem(PLOTS_KEY) || '[]');
      return Array.isArray(list) ? list.filter(p => p && p.id && p.name) : [];
    } catch {
      return [];
    }
  }

  private read(): FarmField[] {
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(list) ? list.filter(f => f && f.id && f.cropId && f.sownOn) : [];
    } catch {
      return [];
    }
  }
}
