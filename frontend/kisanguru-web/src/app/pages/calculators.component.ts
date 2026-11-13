import { Component, effect, inject, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import { Crop, FertilizerResult, LoanResult, ProfitResult } from '../core/models';

type Tab = 'fert' | 'loan' | 'profit';

@Component({
  selector: 'km-calculators',
  imports: [DecimalPipe],
  template: `
    <h1>🧮 {{ i18n.t('calc.title') }}</h1>

    <div class="tabs" role="tablist">
      @for (t of tabs; track t) {
        <button type="button" role="tab" [attr.aria-selected]="tab() === t" [class.active]="tab() === t" (click)="tab.set(t)">
          {{ i18n.t('calc.' + t) }}
        </button>
      }
    </div>

    @switch (tab()) {
      @case ('fert') {
        <form class="card form-grid" (submit)="$event.preventDefault(); calcFert()">
          <label class="span-2">
            {{ i18n.t('calc.crop') }}
            <select [value]="cropId()" (change)="pickCrop($any($event.target).value)">
              <option value="">—</option>
              @for (c of crops(); track c.id) { <option [value]="c.id">{{ i18n.loc(c.name) }}</option> }
            </select>
          </label>
          <label>{{ i18n.t('calc.area') }}
            <input type="number" min="0.01" step="0.01" [value]="area()" (input)="area.set(num($event))" /></label>
          <label>{{ i18n.t('calc.n') }}
            <input type="number" min="0" [value]="n()" (input)="n.set(num($event))" /></label>
          <label>{{ i18n.t('calc.p') }}
            <input type="number" min="0" [value]="p()" (input)="p.set(num($event))" /></label>
          <label>{{ i18n.t('calc.k') }}
            <input type="number" min="0" [value]="k()" (input)="k.set(num($event))" /></label>
          <button class="btn btn-primary span-2" type="submit">{{ i18n.t('calc.calculate') }}</button>
        </form>

        @if (fert(); as f) {
          <div class="results">
            <div class="stat"><span>DAP</span><strong>{{ f.dapKg | number: '1.0-1' }} {{ i18n.t('calc.kg') }}</strong><small>{{ f.dapBags }} {{ i18n.t('calc.bags') }}</small></div>
            <div class="stat"><span>{{ i18n.t('calc.urea') }}</span><strong>{{ f.ureaKg | number: '1.0-1' }} {{ i18n.t('calc.kg') }}</strong><small>{{ f.ureaBags }} {{ i18n.t('calc.bags') }}</small></div>
            <div class="stat"><span>MOP</span><strong>{{ f.mopKg | number: '1.0-1' }} {{ i18n.t('calc.kg') }}</strong><small>{{ f.mopBags }} {{ i18n.t('calc.bags') }}</small></div>
          </div>
          <p class="muted small">{{ i18n.t('calc.fertNote') }}</p>
        }
      }

      @case ('loan') {
        <form class="card form-grid" (submit)="$event.preventDefault(); calcLoan()">
          <label>{{ i18n.t('calc.principal') }}
            <input type="number" min="1" step="1000" [value]="principal()" (input)="principal.set(num($event))" /></label>
          <label>{{ i18n.t('calc.months') }}
            <input type="number" min="1" max="120" [value]="months()" (input)="months.set(num($event))" /></label>
          <label>{{ i18n.t('calc.rate') }}
            <input type="number" min="0" max="50" step="0.1" [value]="rate()" (input)="rate.set(num($event))" /></label>
          <label class="check">
            <input type="checkbox" [checked]="prompt()" (change)="prompt.set($any($event.target).checked)" />
            {{ i18n.t('calc.prompt') }}
          </label>
          <button class="btn btn-primary span-2" type="submit">{{ i18n.t('calc.calculate') }}</button>
        </form>

        @if (loan(); as l) {
          <div class="results">
            <div class="stat"><span>{{ i18n.t('calc.effRate') }}</span><strong>{{ l.effectiveRatePercent | number: '1.0-2' }}%</strong></div>
            <div class="stat"><span>{{ i18n.t('calc.interest') }}</span><strong>₹{{ l.interest | number: '1.0-0' }}</strong></div>
            <div class="stat"><span>{{ i18n.t('calc.total') }}</span><strong>₹{{ l.totalRepayment | number: '1.0-0' }}</strong></div>
          </div>
        }
      }

      @case ('profit') {
        <form class="card form-grid" (submit)="$event.preventDefault(); calcProfit()">
          <label>{{ i18n.t('calc.area') }}
            <input type="number" min="0.01" step="0.01" [value]="area()" (input)="area.set(num($event))" /></label>
          <label>{{ i18n.t('calc.yield') }}
            <input type="number" min="0" step="0.1" [value]="yieldQ()" (input)="yieldQ.set(num($event))" /></label>
          <label>{{ i18n.t('calc.price') }}
            <input type="number" min="0" step="10" [value]="price()" (input)="price.set(num($event))" /></label>
          <label>{{ i18n.t('calc.cost') }}
            <input type="number" min="0" step="100" [value]="cost()" (input)="cost.set(num($event))" /></label>
          <button class="btn btn-primary span-2" type="submit">{{ i18n.t('calc.calculate') }}</button>
        </form>

        @if (profit(); as pr) {
          <div class="results">
            <div class="stat"><span>{{ i18n.t('calc.totalYield') }}</span><strong>{{ pr.totalYieldQuintal | number: '1.0-2' }}</strong></div>
            <div class="stat"><span>{{ i18n.t('calc.gross') }}</span><strong>₹{{ pr.grossIncome | number: '1.0-0' }}</strong></div>
            <div class="stat"><span>{{ i18n.t('calc.totalCost') }}</span><strong>₹{{ pr.totalCost | number: '1.0-0' }}</strong></div>
            <div class="stat" [class.loss]="pr.netProfit < 0"><span>{{ i18n.t('calc.net') }}</span><strong>₹{{ pr.netProfit | number: '1.0-0' }}</strong></div>
            <div class="stat"><span>{{ i18n.t('calc.perAcre') }}</span><strong>₹{{ pr.profitPerAcre | number: '1.0-0' }}</strong></div>
          </div>
        }
      }
    }

    @if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    }
  `
})
export class CalculatorsComponent {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(ApiService);

  /** ?crop=wheat from the crop guide pre-fills the fertiliser calculator. */
  readonly crop = input<string | undefined>();

  protected readonly tabs: Tab[] = ['fert', 'loan', 'profit'];
  protected readonly tab = signal<Tab>('fert');
  protected readonly crops = signal<Crop[]>([]);
  protected readonly cropId = signal('');
  protected readonly error = signal('');

  protected readonly area = signal(1);
  protected readonly n = signal(48);
  protected readonly p = signal(24);
  protected readonly k = signal(16);
  protected readonly fert = signal<FertilizerResult | null>(null);

  protected readonly principal = signal(100000);
  protected readonly months = signal(12);
  protected readonly rate = signal(7);
  protected readonly prompt = signal(true);
  protected readonly loan = signal<LoanResult | null>(null);

  protected readonly yieldQ = signal(18);
  protected readonly price = signal(2400);
  protected readonly cost = signal(20000);
  protected readonly profit = signal<ProfitResult | null>(null);

  constructor() {
    effect(() => {
      const lang = this.i18n.lang();
      this.api.crops(lang).subscribe({ next: c => this.crops.set(c) });
    });

    effect(() => {
      const id = this.crop();
      const list = this.crops();
      if (id && list.length) this.pickCrop(id);
    });
  }

  protected num(event: Event): number {
    const v = parseFloat((event.target as HTMLInputElement).value);
    return Number.isFinite(v) ? v : 0;
  }

  protected pickCrop(id: string): void {
    this.cropId.set(id);
    const c = this.crops().find(x => x.id === id);
    if (c) {
      this.n.set(c.npkPerAcre.n);
      this.p.set(c.npkPerAcre.p);
      this.k.set(c.npkPerAcre.k);
      this.fert.set(null);
    }
  }

  protected calcFert(): void {
    this.error.set('');
    this.api.fertilizer({ areaAcres: this.area(), n: this.n(), p: this.p(), k: this.k() })
      .subscribe({ next: r => this.fert.set(r), error: () => this.error.set(this.i18n.t('common.error')) });
  }

  protected calcLoan(): void {
    this.error.set('');
    this.api.loan({ principal: this.principal(), months: this.months(), annualRatePercent: this.rate(), promptRepayment: this.prompt() })
      .subscribe({ next: r => this.loan.set(r), error: () => this.error.set(this.i18n.t('common.error')) });
  }

  protected calcProfit(): void {
    this.error.set('');
    this.api.profit({ areaAcres: this.area(), yieldQuintalPerAcre: this.yieldQ(), pricePerQuintal: this.price(), costPerAcre: this.cost() })
      .subscribe({ next: r => this.profit.set(r), error: () => this.error.set(this.i18n.t('common.error')) });
  }
}
