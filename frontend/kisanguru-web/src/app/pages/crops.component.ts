import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import { Crop } from '../core/models';

@Component({
  selector: 'km-crops',
  imports: [RouterLink],
  template: `
    <h1>🌱 {{ i18n.t('fasal.title') }}</h1>
    <p class="lead">{{ i18n.t('fasal.intro') }}</p>

    <div class="chips">
      @for (s of seasons; track s) {
        <button type="button" class="chip" [class.active]="season() === s" (click)="season.set(s)">
          {{ i18n.t('season.' + s) }}
        </button>
      }
    </div>

    @if (failed()) {
      <p class="error">{{ i18n.t('common.error') }}</p>
    } @else if (!loaded()) {
      <p class="muted">{{ i18n.t('common.loading') }}</p>
    }

    <div class="grid">
      @for (c of visible(); track c.id) {
        <article class="card crop">
          <header class="crop-head">
            <h2>{{ i18n.loc(c.name) }}</h2>
            <span class="badge" [class]="'badge badge-' + c.season">{{ i18n.t('season.' + c.season) }}</span>
          </header>
          <dl>
            <dt>{{ i18n.t('fasal.sowing') }}</dt><dd>{{ i18n.loc(c.sowingTime) }}</dd>
            <dt>{{ i18n.t('fasal.duration') }}</dt><dd>{{ c.durationMinDays }}–{{ c.durationMaxDays }} {{ i18n.t('fasal.days') }}</dd>
            <dt>{{ i18n.t('fasal.seed') }}</dt><dd>{{ i18n.loc(c.seedRate) }}</dd>
            <dt>{{ i18n.t('fasal.irrigation') }}</dt><dd>{{ i18n.loc(c.irrigation) }}</dd>
            <dt>{{ i18n.t('fasal.npk') }}</dt><dd>{{ c.npkPerAcre.n }} : {{ c.npkPerAcre.p }} : {{ c.npkPerAcre.k }}</dd>
          </dl>
          @if (i18n.isAutoTranslated(c.name)) {
            <p class="auto-note">{{ i18n.t('common.autoTranslated') }}</p>
          }
          <h3>{{ i18n.t('fasal.tips') }}</h3>
          <ul>@for (t of c.tips; track $index) { <li>{{ i18n.loc(t) }}</li> }</ul>
          <a class="btn btn-ghost" routerLink="/calculator" [queryParams]="{ crop: c.id }">🧮 {{ i18n.t('fasal.calcFert') }}</a>
        </article>
      }
    </div>
  `
})
export class CropsComponent {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(ApiService);

  protected readonly seasons = ['all', 'kharif', 'rabi', 'zaid'] as const;
  protected readonly season = signal<'all' | 'kharif' | 'rabi' | 'zaid'>('all');
  private readonly crops = signal<Crop[]>([]);
  protected readonly loaded = signal(false);
  protected readonly failed = signal(false);

  protected readonly visible = computed(() =>
    this.season() === 'all' ? this.crops() : this.crops().filter(c => c.season === this.season()));

  constructor() {
    effect(() => {
      const lang = this.i18n.lang();
      this.api.crops(lang).subscribe({
        next: c => { this.crops.set(c); this.loaded.set(true); },
        error: () => this.failed.set(true)
      });
    });
  }
}
