import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import { STATES, StateInfo, placeFromDistrict } from '../core/location.service';
import { FarmLocation, Subdistrict, Village } from '../core/models';

/**
 * Four dropdowns: State → District → Tehsil/Taluka/Mandal → Village (all India, LGD).
 * Used by the header location sheet and by the sign-up / "my farm" form.
 * Emits a FarmLocation once a district is chosen; tehsil and village are optional.
 */
@Component({
  selector: 'km-place-select',
  template: `
    <label class="field">
      <span>{{ i18n.t('loc.state') }}@if (required()) {<b class="req">*</b>}</span>
      <select (change)="pickState($any($event.target).value)">
        <option value="" [selected]="!stateName()">{{ i18n.t('loc.chooseState') }}</option>
        @for (s of states; track s.c) {
          <option [value]="s.n" [selected]="s.n === stateName()">{{ i18n.stateName(s.n, s.h) }}</option>
        }
      </select>
    </label>

    <label class="field">
      <span>{{ i18n.t('loc.district') }}@if (required()) {<b class="req">*</b>}</span>
      <select [disabled]="!state()" (change)="pickDistrict($any($event.target).value)">
        <option value="" [selected]="!current()">{{ i18n.t('loc.chooseDistrict') }}</option>
        @for (d of state()?.d ?? []; track d[3]) {
          <option [value]="d[3]" [selected]="d[3] === current()?.districtCode">{{ d[0] }}</option>
        }
      </select>
    </label>

    <label class="field">
      <span>{{ i18n.t('loc.subdistrict') }} <em>{{ i18n.t('loc.optional') }}</em></span>
      <select [disabled]="!current() || loadingTehsils()" (change)="pickTehsil($any($event.target).value)">
        <option value="">{{ loadingTehsils() ? i18n.t('common.loading') : i18n.t('loc.chooseSubdistrict') }}</option>
        @for (t of tehsils(); track t.code) {
          <option [value]="t.code" [selected]="t.code === current()?.tehsilCode">{{ t.name }}</option>
        }
      </select>
    </label>

    <label class="field">
      <span>{{ i18n.t('loc.village') }} <em>{{ i18n.t('loc.optional') }}</em>
        @if (villages().length) { <small>· {{ villages().length }} {{ i18n.t('loc.villages') }}</small> }
      </span>
      <select [disabled]="!current()?.tehsilCode || loadingVillages()" (change)="pickVillage($any($event.target).value)">
        <option value="">{{ loadingVillages() ? i18n.t('common.loading') : i18n.t('loc.village') + ' —' }}</option>
        @for (v of villages(); track v.code) {
          <option [value]="v.code" [selected]="v.code === current()?.villageCode">{{ v.local ? v.local + ' (' + v.name + ')' : v.name }}</option>
        }
      </select>
    </label>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; gap: 12px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field > span { font-size: 0.85rem; color: var(--muted); font-weight: 700; }
    .field em { font-weight: 400; font-style: normal; }
    .req { color: var(--danger); margin-left: 2px; }
    select:disabled { opacity: 0.6; }
  `]
})
export class PlaceSelectComponent {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(ApiService);
  protected readonly states = STATES;

  readonly value = input<FarmLocation | null>(null);
  readonly required = input(false);
  readonly valueChange = output<FarmLocation | null>();

  /** Working copy; starts from `value` and follows it when the parent changes it. */
  protected readonly current = signal<FarmLocation | null>(null);
  protected readonly stateName = signal('');
  protected readonly state = computed<StateInfo | undefined>(() => STATES.find(s => s.n === this.stateName()));

  protected readonly tehsils = signal<Subdistrict[]>([]);
  protected readonly loadingTehsils = signal(false);
  protected readonly villages = signal<Village[]>([]);
  protected readonly loadingVillages = signal(false);

  private readonly districtCode = computed(() => this.current()?.districtCode ?? 0);
  private readonly tehsilKey = computed(() => {
    const c = this.current();
    return c?.tehsilCode ? `${c.stateCode}:${c.tehsilCode}` : '';
  });

  constructor() {
    effect(() => {
      const v = this.value();
      this.current.set(v);
      if (v) this.stateName.set(v.state);
    });
    effect(() => {
      const code = this.districtCode();
      if (!code) { this.tehsils.set([]); return; }
      this.loadingTehsils.set(true);
      this.api.subdistricts(code).subscribe({
        next: t => { this.tehsils.set(t); this.loadingTehsils.set(false); },
        error: () => { this.tehsils.set([]); this.loadingTehsils.set(false); }
      });
    });
    effect(() => {
      const key = this.tehsilKey();
      if (!key) { this.villages.set([]); return; }
      const [state, tehsil] = key.split(':').map(Number);
      this.loadingVillages.set(true);
      this.api.villages(state, tehsil).subscribe({
        next: v => { this.villages.set(v); this.loadingVillages.set(false); },
        error: () => { this.villages.set([]); this.loadingVillages.set(false); }
      });
    });
  }

  protected pickState(name: string): void {
    this.stateName.set(name);
    if (this.current()?.state !== name) this.emit(null);
  }

  protected pickDistrict(code: string): void {
    const s = this.state();
    const d = s?.d.find(x => x[3] === Number(code));
    this.emit(s && d ? placeFromDistrict(s, d) : null);
  }

  protected pickTehsil(code: string): void {
    const c = this.current();
    if (!c) return;
    const t = this.tehsils().find(x => x.code === Number(code));
    this.emit({ ...c, tehsilCode: t?.code, tehsil: t?.name, villageCode: undefined, village: undefined, villageLocal: undefined });
  }

  protected pickVillage(code: string): void {
    const c = this.current();
    if (!c) return;
    const v = this.villages().find(x => x.code === Number(code));
    this.emit({ ...c, villageCode: v?.code, village: v?.name, villageLocal: v?.local ?? undefined });
  }

  private emit(l: FarmLocation | null): void {
    this.current.set(l);
    this.valueChange.emit(l);
  }
}
