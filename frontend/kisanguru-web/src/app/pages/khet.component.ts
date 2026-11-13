import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { FieldsService, TodayItem, activeOn, isoDay } from '../core/fields.service';
import { I18nService } from '../core/i18n.service';
import { Crop, FarmField, FarmPlot, PlanTask, SOIL_TYPES, SoilType } from '../core/models';
import { LocationService } from '../core/location.service';
import { ReminderService } from '../core/reminder.service';

const KIND_ICON: Record<string, string> = {
  prep: '🚜', sowing: '🌱', fertilizer: '🧂', irrigation: '💧', weeding: '🌿', protection: '🧴', scouting: '🔍', harvest: '🌾'
};
/** Crops with a full sowing-to-harvest calendar on the server. */
const CALENDAR_CROPS = ['wheat', 'paddy', 'chana', 'mustard', 'soybean', 'maize', 'masoor', 'moong'];

/**
 * "My fields": the farmer adds each of their fields (khet) by name — area and water source — and the crops
 * sown in each. The page shows today's work in all fields together, then field by field: every crop's
 * pending and coming work and full calendar, and for empty fields what can be sown now.
 */
@Component({
  selector: 'km-khet',
  imports: [NgTemplateOutlet],
  template: `
    <h1>🚜 {{ i18n.t('khet.title') }}</h1>
    <p class="lead">{{ i18n.t('khet.lead') }}</p>
    @if (fs.error() && !fs.loading()) { <p class="notice">📴 {{ i18n.t('khet.offline') }}</p> }

    <!-- Today in all fields -->
    @if (fs.plots().length) {
      <section class="card all-today">
        <h2>📅 {{ i18n.t('khet.allToday') }} <small class="muted">· {{ date(fs.today()) }}</small></h2>
        @if (fs.todayAll().length) {
          @for (g of todayGroups(); track g.plot.id) {
            <h3>🏞️ {{ g.plot.name }}</h3>
            <ul class="tasks">
              @for (it of g.items; track it.field.id + it.task.id) {
                <ng-container *ngTemplateOutlet="task; context: { f: it.field, t: it.task, now: true, crop: true }" />
              }
            </ul>
          }
        } @else {
          <p class="calm">🙂 {{ i18n.t('khet.nothingAll') }}</p>
        }
      </section>
    }

    <!-- Each field -->
    @for (p of fs.plots(); track p.id) {
      <section class="card plot">
        <header class="field-head">
          <div>
            <h2>🏞️ {{ p.name }}</h2>
            <p class="muted small">{{ p.areaAcres }} {{ i18n.t('khet.acres') }} · {{ i18n.t(p.irrigated ? 'khet.irrigated' : 'khet.rainfed') }}
              · 🟤 {{ i18n.t(p.soil ? 'soil.' + p.soil : 'khet.soilUnknown') }}</p>
          </div>
          <div class="head-btns">
            <button type="button" class="link-btn" (click)="startEdit(p)">✏️ {{ i18n.t('khet.editPlot') }}</button>
            <button type="button" class="link-btn" (click)="removePlot(p)">{{ i18n.t('khet.remove') }}</button>
          </div>
        </header>

        @if (editing() === p.id) {
          <ng-container *ngTemplateOutlet="plotForm; context: { p: p }" />
        }
        @if (p.soil) { <p class="soil-tip">🟤 {{ i18n.t('soil.' + p.soil + '.tip') }}</p> }

        @for (f of fs.cropsIn(p.id); track f.id) {
          <article class="field">
            <header class="field-head">
              <div>
                <h3>{{ f.plan ? i18n.loc(f.plan.cropName) : f.cropId }}</h3>
                <p class="muted small">
                  {{ i18n.t(f.plan?.dayZeroIsTransplanting ? 'khet.transplanted' : 'khet.sownOn') }} {{ date(f.sownOn) }} · {{ f.areaAcres }} {{ i18n.t('khet.acres') }}
                </p>
              </div>
              <button type="button" class="link-btn" (click)="removeCrop(f)">{{ i18n.t('khet.remove') }}</button>
            </header>

            @if (f.plan; as plan) {
              @if (harvested(f)) {
                <p class="calm">🌾 {{ i18n.t('khet.harvested') }}</p>
              } @else {
                <div class="progress">
                  <div class="bar"><span [style.width.%]="progress(f)"></span></div>
                  <p class="day">
                    @if (fs.dayOf(f) < 0) { {{ i18n.t('khet.startsIn').replace('{n}', '' + -fs.dayOf(f)) }} }
                    @else {
                      <b>{{ i18n.t('khet.day').replace('{n}', '' + fs.dayOf(f)) }}</b>
                      @if (fs.stageName(f)) { · {{ fs.stageName(f) }} }
                    }
                    <span class="muted"> · 🌾 {{ i18n.t('khet.harvest') }} {{ date(plan.harvestFrom) }} – {{ date(plan.harvestTo) }}</span>
                  </p>
                </div>
                @let pend = fs.pending(f);
                @if (pend.length) {
                  <h4>⏳ {{ i18n.t('khet.pending') }}</h4>
                  <ul class="tasks">@for (t of pend; track t.id) { <ng-container *ngTemplateOutlet="task; context: { f: f, t: t, now: true, crop: false }" /> }</ul>
                }
                @let next = fs.upcoming(f);
                @if (next.length) {
                  <h4>🔜 {{ i18n.t('khet.next') }}</h4>
                  <ul class="tasks">@for (t of next; track t.id) { <ng-container *ngTemplateOutlet="task; context: { f: f, t: t, now: false, crop: false }" /> }</ul>
                }
              }
              <details class="all">
                <summary>{{ i18n.t('khet.all') }} ({{ plan.tasks.length }})</summary>
                <ol class="timeline">
                  @for (t of plan.tasks; track t.id) {
                    <li [class.past]="(t.endDate || t.date) < fs.today()" [class.now]="isNow(t)" [class.done]="f.done.includes(t.id)">
                      <span class="when">{{ date(t.date) }} @if (t.endDate) { – {{ date(t.endDate) }} }
                        <small>({{ i18n.t('khet.day').replace('{n}', '' + t.day) }})</small></span>
                      <b>{{ icon(t.kind) }} {{ i18n.loc(t.title) }}</b>
                      <span class="det">{{ i18n.loc(t.details) }}</span>
                      @if (fs.amountText(t)) { <span class="amt">🧂 {{ fs.amountText(t) }}</span> }
                    </li>
                  }
                </ol>
                @if (i18n.isAutoTranslated(plan.cropName)) { <p class="auto-note">{{ i18n.t('common.autoTranslated') }}</p> }
              </details>
            } @else {
              <p class="muted">{{ i18n.t('common.loading') }}</p>
            }
          </article>
        }

        <!-- Empty (or partly empty) field: what to sow now -->
        @if (!growing(p).length) {
          <p class="muted">{{ i18n.t('khet.noCrop') }}</p>
          @let res = fs.suggestionsFor(p);
          @if (!loc.location()) {
            <p class="notice">📍 {{ i18n.t('khet.setLocation') }}
              <button type="button" class="btn btn-ghost" (click)="loc.pickerOpen.set(true)">{{ i18n.t('khet.chooseLoc') }}</button></p>
          }
          @if (res && res.items.length) {
            <div class="suggest">
              <h4>💡 {{ i18n.t('khet.suggest') }}</h4>
              <p class="for">📍 {{ i18n.t('khet.forRegion').replace('{region}', i18n.loc(res.regionName)) }}
                @if (p.soil) { · 🟤 {{ i18n.t('soil.' + p.soil) }} }
                · {{ i18n.t(p.irrigated ? 'khet.irrigated' : 'khet.rainfed') }}</p>
              @if (res.regionTip) { <p class="muted small">{{ i18n.loc(res.regionTip) }}</p> }
              <ul>
                @for (s of res.items.slice(0, 6); track s.cropId + s.sowFrom) {
                  <li [class.dim]="(!p.irrigated && s.needsIrrigation) || s.soilFit === 'poor'">
                    <div>
                      <b>{{ i18n.loc(s.name) }}</b>
                      <span [class]="'badge badge-' + s.season">{{ i18n.t('season.' + s.season) }}</span>
                      @if (s.status === 'soon') { <span class="soon">{{ i18n.t('khet.suggestSoon') }}</span> }
                      @if (p.soil && s.soilFit !== 'ok') { <span [class]="'fit fit-' + s.soilFit">{{ i18n.t('khet.fit.' + s.soilFit) }}</span> }
                      <small class="muted">
                        {{ i18n.t('khet.sowWindow').replace('{a}', date(s.sowFrom)).replace('{b}', date(s.sowTo)) }}
                        · {{ s.durationMinDays }}–{{ s.durationMaxDays }} {{ i18n.t('fasal.days') }}
                        @if (s.needsIrrigation) { · 💧 {{ i18n.t('khet.needsWater') }} }
                      </small>
                    </div>
                    <button type="button" class="btn btn-ghost" (click)="openAdd(p, s.cropId, s.status === 'now' ? today : s.sowFrom)">
                      ➕ {{ i18n.t('khet.pick') }}</button>
                  </li>
                }
              </ul>
              <p class="muted small">{{ i18n.t('khet.suggestNote') }}</p>
            </div>
          }
        }

        @if (addingTo() === p.id) {
          <form class="add" (submit)="$event.preventDefault(); saveCrop(p)">
            <h4>🌱 {{ i18n.t('khet.addCropHere') }}</h4>
            <label>{{ i18n.t('khet.crop') }}
              <select [value]="cropId()" (change)="cropId.set($any($event.target).value)">
                @for (c of crops(); track c.id) { <option [value]="c.id" [selected]="c.id === cropId()">{{ i18n.loc(c.name) }}</option> }
              </select>
            </label>
            <label>{{ i18n.t(cropId() === 'paddy' ? 'khet.transplantDate' : 'khet.sowDate') }}
              <input type="date" [value]="sownOn()" [max]="maxDate" (change)="sownOn.set($any($event.target).value)">
            </label>
            <label>{{ i18n.t('khet.cropArea') }}
              <input type="number" min="0.1" step="0.1" inputmode="decimal" [value]="area()" (input)="area.set(+$any($event.target).value)">
            </label>
            @if (addError()) { <p class="error">{{ i18n.t('common.error') }}</p> }
            <div class="actions">
              <button class="btn btn-primary" type="submit" [disabled]="busy() || !sownOn() || !(area() > 0)">
                {{ busy() ? i18n.t('common.loading') : i18n.t('khet.start') }}</button>
              <button class="btn btn-ghost" type="button" (click)="addingTo.set(null)">{{ i18n.t('khet.cancel') }}</button>
            </div>
          </form>
        } @else {
          <button type="button" class="btn btn-ghost add-crop" (click)="openAdd(p)">🌱 {{ i18n.t('khet.addCropHere') }}</button>
        }
      </section>
    }

    <!-- New field -->
    @if (editing() === 'new') {
      <section class="card"><ng-container *ngTemplateOutlet="plotForm; context: { p: null }" /></section>
    } @else {
      <button class="btn btn-primary btn-lg" type="button" (click)="startEdit(null)">➕ {{ i18n.t('khet.addPlot') }}</button>
    }

    <ng-template #plotForm let-p="p">
      <form class="add" (submit)="$event.preventDefault(); savePlot(p)">
        <h3>{{ p ? '✏️ ' + p.name : '➕ ' + i18n.t('khet.addPlot') }}</h3>
        <label>{{ i18n.t('khet.plotName') }}
          <input type="text" maxlength="40" [value]="pName()" [placeholder]="i18n.t('khet.plotNameHint')" (input)="pName.set($any($event.target).value)">
        </label>
        <label>{{ i18n.t('khet.area') }}
          <input type="number" min="0.1" step="0.1" inputmode="decimal" [value]="pArea()" (input)="pArea.set(+$any($event.target).value)">
        </label>
        <fieldset>
          <legend>{{ i18n.t('khet.water') }}</legend>
          <label class="check"><input type="radio" name="pw" [checked]="pIrr()" (change)="pIrr.set(true)"> 💧 {{ i18n.t('khet.irrigated') }}</label>
          <label class="check"><input type="radio" name="pw" [checked]="!pIrr()" (change)="pIrr.set(false)"> 🌧️ {{ i18n.t('khet.rainfed') }}</label>
        </fieldset>
        <fieldset class="soils">
          <legend>🟤 {{ i18n.t('khet.soil') }}</legend>
          <p class="muted small">{{ i18n.t('khet.soilHint') }}</p>
          @for (s of soilTypes; track s) {
            <label class="soil-opt" [attr.data-soil]="s">
              <input type="radio" name="ps" [checked]="pSoil() === s" (change)="pSoil.set(s)">
              <span class="sw" aria-hidden="true"></span>
              <span><b>{{ i18n.t('soil.' + s) }}</b><small>{{ i18n.t('soil.' + s + '.desc') }}</small></span>
            </label>
          }
          <label class="soil-opt"><input type="radio" name="ps" [checked]="!pSoil()" (change)="pSoil.set(null)">
            <span class="sw unknown" aria-hidden="true">?</span><span><b>{{ i18n.t('khet.soilUnknown') }}</b></span></label>
        </fieldset>
        <div class="actions">
          <button class="btn btn-primary" type="submit" [disabled]="!(pArea() > 0)">{{ i18n.t('khet.save') }}</button>
          @if (fs.plots().length) { <button class="btn btn-ghost" type="button" (click)="editing.set(null)">{{ i18n.t('khet.cancel') }}</button> }
        </div>
      </form>
    </ng-template>

    <ng-template #task let-f="f" let-t="t" let-now="now" let-crop="crop">
      <li class="task" [class.done]="f.done.includes(t.id)" [attr.data-kind]="t.kind">
        <span class="ic" aria-hidden="true">{{ icon(t.kind) }}</span>
        <div class="body">
          @if (crop && f.plan) { <span class="crop-tag">{{ i18n.loc(f.plan.cropName) }}</span> }
          <b>{{ i18n.loc(t.title) }}</b>
          <span class="when">{{ when(t) }}</span>
          @if (now || t.kind === 'fertilizer') { <span class="det">{{ i18n.loc(t.details) }}</span> }
          @if (fs.amountText(t)) { <span class="amt">🧂 {{ fs.amountText(t) }}</span> }
          @if (t.weather) { <span class="wx">⚠️ {{ i18n.t('khet.wx.' + t.weather) }}</span> }
          @if (t.soilNote) { <span class="soilnote">🟤 {{ i18n.loc(t.soilNote) }}</span> }
        </div>
        @if (now && t.kind !== 'scouting') {
          <button type="button" class="tick" [class.on]="f.done.includes(t.id)" (click)="fs.toggleDone(f.id, t.id)"
                  [attr.aria-pressed]="f.done.includes(t.id)">
            {{ f.done.includes(t.id) ? '✅ ' + i18n.t('khet.done') : '◻️ ' + i18n.t('khet.markDone') }}
          </button>
        }
      </li>
    </ng-template>

    <section class="card reminders">
      <h2>🔔 {{ i18n.t('rem.title') }}</h2>
      <p class="muted">{{ i18n.t('rem.lead') }}</p>
      @if (rem.platform() === 'native') {
        @if (rem.permission() === 'denied') { <p class="error">{{ i18n.t('rem.denied') }}</p> }
        <label class="check">
          <input type="checkbox" [checked]="rem.settings().on" (change)="toggle($any($event.target).checked)"> {{ i18n.t('rem.on') }}
        </label>
        <div class="times">
          <label>🌅 {{ i18n.t('rem.morning') }}
            <input type="time" [value]="rem.settings().morning" (change)="rem.update({ morning: $any($event.target).value })"></label>
          <label>🌇 {{ i18n.t('rem.evening') }}
            <input type="time" [value]="rem.settings().evening" (change)="rem.update({ evening: $any($event.target).value })"></label>
        </div>
        @if (rem.scheduledDays()) { <p class="okmsg">✅ {{ i18n.t('rem.scheduled').replace('{n}', '' + rem.scheduledDays()) }}</p> }
        <button class="btn btn-ghost" type="button" (click)="rem.test()">🔔 {{ i18n.t('rem.test') }}</button>
      } @else {
        <p class="notice">📱 {{ i18n.t('rem.appOnly') }}</p>
      }
    </section>
  `
})
export class KhetComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly fs = inject(FieldsService);
  protected readonly rem = inject(ReminderService);
  private readonly api = inject(ApiService);

  protected readonly today = isoDay();
  protected readonly maxDate = isoDay(new Date(Date.now() + 120 * 86_400_000));
  protected readonly crops = signal<Crop[]>([]);

  // Field (khet) form: editing = plot id, 'new', or null
  protected readonly editing = signal<string | null>(null);
  protected readonly pName = signal('');
  protected readonly pArea = signal(1);
  protected readonly pIrr = signal(true);
  protected readonly pSoil = signal<SoilType | null>(null);
  protected readonly soilTypes = SOIL_TYPES;
  protected readonly loc = inject(LocationService);

  // Crop form, open in one field at a time
  protected readonly addingTo = signal<string | null>(null);
  protected readonly cropId = signal('wheat');
  protected readonly sownOn = signal(isoDay());
  protected readonly area = signal(1);
  protected readonly busy = signal(false);
  protected readonly addError = signal(false);

  /** Today's work grouped by field. */
  protected readonly todayGroups = computed(() => {
    const groups: { plot: FarmPlot; items: TodayItem[] }[] = [];
    for (const it of this.fs.todayAll()) {
      let g = groups.find(x => x.plot.id === it.plot.id);
      if (!g) groups.push(g = { plot: it.plot, items: [] });
      g.items.push(it);
    }
    return groups;
  });

  constructor() {
    if (!this.fs.plots().length) this.startEdit(null);
    effect(() => {
      const lang = this.i18n.lang();
      this.api.crops(lang).subscribe({
        next: list => this.crops.set(list.filter(c => CALENDAR_CROPS.includes(c.id))),
        error: () => this.crops.set([])
      });
    });
    this.fs.refresh();
  }

  protected startEdit(p: FarmPlot | null) {
    this.editing.set(p ? p.id : 'new');
    this.pName.set(p ? p.name : '');
    this.pArea.set(p ? p.areaAcres : 1);
    this.pIrr.set(p ? p.irrigated : true);
    this.pSoil.set(p?.soil ?? null);
  }

  protected savePlot(p: FarmPlot | null) {
    const data = { name: this.pName(), areaAcres: this.pArea(), irrigated: this.pIrr(), soil: this.pSoil() };
    if (p) this.fs.updatePlot(p.id, data);
    else this.fs.addPlot(data);
    this.editing.set(null);
  }

  protected removePlot(p: FarmPlot) {
    if (confirm(this.i18n.t('khet.removePlotAsk'))) this.fs.removePlot(p.id);
  }

  protected openAdd(p: FarmPlot, cropId = 'wheat', sownOn = isoDay()) {
    this.addingTo.set(p.id);
    this.cropId.set(cropId);
    this.sownOn.set(sownOn);
    this.area.set(this.fs.freeArea(p.id) || p.areaAcres);
    this.addError.set(false);
  }

  protected async saveCrop(p: FarmPlot) {
    this.busy.set(true);
    this.addError.set(false);
    const ok = await this.fs.add({ plotId: p.id, cropId: this.cropId(), sownOn: this.sownOn(), areaAcres: this.area() });
    this.busy.set(false);
    if (!ok) { this.addError.set(true); return; }
    this.addingTo.set(null);
    if (this.rem.platform() === 'native' && this.rem.permission() !== 'granted') this.rem.enable();
  }

  protected removeCrop(f: FarmField) {
    if (confirm(this.i18n.t('khet.removeAsk'))) this.fs.remove(f.id);
  }

  /** Crops in this field not harvested yet. */
  protected growing(p: FarmPlot) { return this.fs.activeIn(p.id).filter(f => !this.harvested(f)); }

  protected harvested(f: FarmField) { return !!f.plan && f.plan.harvestTo < this.fs.today(); }

  protected icon(kind: string) { return KIND_ICON[kind] ?? '•'; }

  protected date(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(this.i18n.locale(), { day: 'numeric', month: 'short' });
  }

  protected when(t: PlanTask): string {
    const today = this.fs.today();
    if (activeOn(t, today)) {
      if (!t.endDate) return this.i18n.t('khet.todayShort');
      // "until 17 Nov" in English; Indian languages put the word after the date ("17 नव॰ तक")
      return this.i18n.lang() === 'en' ? `until ${this.date(t.endDate)}` : `${this.date(t.endDate)} ${this.i18n.t('khet.until')}`;
    }
    if ((t.endDate || t.date) < today) return this.date(t.date);
    const n = Math.round((new Date(t.date).getTime() - new Date(today).getTime()) / 86_400_000);
    return n === 1 ? this.i18n.t('khet.tomorrow') : `${this.date(t.date)} · ${this.i18n.t('khet.inDays').replace('{n}', '' + n)}`;
  }

  protected isNow(t: PlanTask) { return activeOn(t, this.fs.today()); }

  protected progress(f: FarmField): number {
    const total = f.plan?.durationDays || 120;
    return Math.min(100, Math.max(0, (this.fs.dayOf(f) / total) * 100));
  }

  protected async toggle(on: boolean) {
    if (on && this.rem.permission() !== 'granted') { await this.rem.enable(); return; }
    this.rem.update({ on });
  }
}
