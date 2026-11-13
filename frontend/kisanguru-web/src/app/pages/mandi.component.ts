import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import { LocationService, STATES } from '../core/location.service';
import { MandiResult } from '../core/models';

/** Where Agmarknet spells a state differently from the districts list. */
const AGMARKNET_STATE: Record<string, string> = {
  'Chhattisgarh': 'Chattisgarh',
  'Jammu & Kashmir': 'Jammu and Kashmir',
  'Puducherry': 'Pondicherry',
  'Andaman & Nicobar Islands': 'Andaman and Nicobar',
  'Dadra & Nagar Haveli and Daman & Diu': 'Dadra and Nagar Haveli'
};

@Component({
  selector: 'km-mandi',
  imports: [DecimalPipe],
  template: `
    <h1>📈 {{ i18n.t('mandi.title') }}</h1>
    <p class="lead">{{ i18n.t('mandi.intro') }}</p>

    <form class="card filters" (submit)="$event.preventDefault(); load()">
      <label>
        {{ i18n.t('mandi.state') }}
        <select (change)="state.set($any($event.target).value)">
          <option value="" [selected]="!state()">—</option>
          @for (s of states; track s.n) {
            <option [value]="s.n" [selected]="s.n === state()">{{ i18n.stateName(s.n, s.h) }}</option>
          }
        </select>
      </label>
      <label>
        {{ i18n.t('mandi.district') }}
        <select (change)="district.set($any($event.target).value)">
          <option value="" [selected]="!district()">—</option>
          @for (d of districts(); track d) {
            <option [value]="d" [selected]="d === district()">{{ d }}</option>
          }
        </select>
      </label>
      <label>
        {{ i18n.t('mandi.commodity') }}
        <select (change)="commodity.set($any($event.target).value)">
          <option value="">—</option>
          @for (c of commodities; track c.value) {
            <option [value]="c.value" [selected]="c.value === commodity()">{{ i18n.t(c.key) }}</option>
          }
        </select>
      </label>
      <button class="btn btn-primary" type="submit">{{ i18n.t('mandi.search') }}</button>
    </form>

    @if (loading()) {
      <p class="muted">{{ i18n.t('common.loading') }}</p>
    } @else if (failed()) {
      <p class="error">{{ i18n.t('common.error') }}</p>
    } @else {
      @if (result(); as r) {
        @if (r.isSample) {
          <p class="notice">⚠️ {{ i18n.t('mandi.sample') }}</p>
        }
        @if (r.prices.length === 0) {
          <p class="muted">{{ i18n.t('mandi.none') }}</p>
        } @else {
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{{ i18n.t('mandi.commodity') }}</th>
                  <th>{{ i18n.t('mandi.market') }}</th>
                  <th class="num">{{ i18n.t('mandi.min') }}</th>
                  <th class="num">{{ i18n.t('mandi.max') }}</th>
                  <th class="num">{{ i18n.t('mandi.modal') }}</th>
                  <th>{{ i18n.t('mandi.date') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (p of r.prices; track $index) {
                  <tr>
                    <td><strong>{{ commodityName(p.commodity) }}</strong><br /><span class="muted small">{{ p.variety }}</span></td>
                    <td>{{ p.market }}<br /><span class="muted small">{{ p.district }}, {{ p.state }}</span></td>
                    <td class="num">₹{{ p.minPrice | number: '1.0-0' }}</td>
                    <td class="num">₹{{ p.maxPrice | number: '1.0-0' }}</td>
                    <td class="num"><strong>₹{{ p.modalPrice | number: '1.0-0' }}</strong></td>
                    <td>{{ p.arrivalDate }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        <p class="muted small">{{ i18n.t('mandi.source') }}: {{ r.source }}</p>
      }
    }
  `
})
export class MandiComponent {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(ApiService);

  protected readonly states = STATES;
  protected readonly state = signal('');
  protected readonly district = signal('');
  protected readonly commodity = signal('');
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  protected readonly result = signal<MandiResult | null>(null);

  /** Agmarknet commodity names (used as filter values) with their UI text keys. */
  protected readonly commodities = [
    { value: 'Wheat', key: 'commodity.wheat' },
    { value: 'Paddy(Dhan)(Common)', key: 'commodity.paddy' },
    { value: 'Bengal Gram(Gram)(Whole)', key: 'commodity.gram' },
    { value: 'Lentil (Masur)(Whole)', key: 'commodity.lentil' },
    { value: 'Mustard', key: 'commodity.mustard' },
    { value: 'Soyabean', key: 'commodity.soybean' },
    { value: 'Maize', key: 'commodity.maize' },
    { value: 'Onion', key: 'commodity.onion' },
    { value: 'Potato', key: 'commodity.potato' },
    { value: 'Tomato', key: 'commodity.tomato' }
  ];

  protected districts(): string[] {
    return STATES.find(s => s.n === this.state())?.d.map(d => d[0]) ?? [];
  }

  constructor() {
    // Start with the farmer's own state and district.
    const l = inject(LocationService).location();
    if (l) {
      this.state.set(l.state);
      this.district.set(l.district);
    }
    this.load();
  }

  protected commodityName(agmarknet: string): string {
    const c = this.commodities.find(x => x.value === agmarknet);
    return c ? this.i18n.t(c.key) : agmarknet;
  }

  protected load(): void {
    this.loading.set(true);
    this.failed.set(false);
    const state = AGMARKNET_STATE[this.state()] ?? this.state();
    this.api.mandi({ state, district: this.district(), commodity: this.commodity() }).subscribe({
      next: r => {
        // If a small district has no mandi reporting today, fall back to the whole state.
        if (r.prices.length === 0 && this.district()) {
          this.api.mandi({ state, commodity: this.commodity() }).subscribe({
            next: s => { this.result.set(s); this.loading.set(false); },
            error: () => { this.failed.set(true); this.loading.set(false); }
          });
          return;
        }
        this.result.set(r);
        this.loading.set(false);
      },
      error: () => { this.failed.set(true); this.loading.set(false); }
    });
  }
}
