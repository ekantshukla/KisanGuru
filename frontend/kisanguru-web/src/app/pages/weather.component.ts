import { Component, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ApiService } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import { LocationService } from '../core/location.service';
import { FarmLocation, WeatherForecast } from '../core/models';
import { dayLabel, weatherInfo } from '../core/weather-codes';

@Component({
  selector: 'km-weather',
  imports: [DecimalPipe],
  template: `
    <h1>🌦️ {{ i18n.t('mausam.title') }}</h1>
    @if (loc.location(); as l) {
      <p class="lead">
        📍 {{ placeLine(l) }}
        <button type="button" class="link-btn" (click)="loc.openPicker()">{{ i18n.t('loc.change') }}</button>
      </p>
    }

    @if (loading()) {
      <p class="muted">{{ i18n.t('common.loading') }}</p>
    } @else if (failed()) {
      <p class="error">{{ i18n.t('mausam.error') }}</p>
    } @else {
      @if (wx(); as w) {
        <section class="wx-now card">
          <div class="wx-now-main">
            <span class="wx-icon">{{ info(w.current.weatherCode).icon }}</span>
            <div>
              <div class="wx-temp">{{ w.current.temperature | number: '1.0-0' }}°C</div>
              <div>{{ i18n.t(info(w.current.weatherCode).key) }}</div>
            </div>
          </div>
          <div class="wx-now-meta">
            <span>💧 {{ i18n.t('mausam.humidity') }}: {{ w.current.humidity }}%</span>
            <span>💨 {{ i18n.t('mausam.wind') }}: {{ w.current.windSpeed | number: '1.0-0' }} km/h</span>
            <span>🌧️ {{ i18n.t('mausam.rain7') }}: {{ w.rainNext7DaysMm | number: '1.0-1' }} {{ i18n.t('mausam.mm') }}</span>
          </div>
        </section>

        @if (w.placeName) {
          <p class="muted small">🎯 {{ i18n.t(levelKey(w.placeLevel)) }}: {{ w.placeName }}</p>
        }

        @if (w.alerts.length) {
          <h2>{{ i18n.t('mausam.advice') }}</h2>
          <div class="alerts">
            @for (a of w.alerts; track $index) {
              <div class="alert alert-{{ a.level }}"><span>{{ a.icon }}</span> {{ i18n.loc(a.message) }}</div>
            }
          </div>
          @if (i18n.isAutoTranslated(w.alerts[0].message)) {
            <p class="auto-note">{{ i18n.t('common.autoTranslated') }}</p>
          }
        }

        <h2>{{ i18n.t('mausam.week') }}</h2>
        <div class="wx-days">
          @for (d of w.days; track d.date; let i = $index) {
            <div class="wx-day card">
              <strong>{{ day(d.date, i) }}</strong>
              <span class="wx-icon-sm">{{ info(d.weatherCode).icon }}</span>
              <span class="small">{{ i18n.t(info(d.weatherCode).key) }}</span>
              <span>{{ d.tempMax | number: '1.0-0' }}° / <span class="muted">{{ d.tempMin | number: '1.0-0' }}°</span></span>
              <div class="rain-bar" [attr.aria-label]="i18n.t('mausam.chance') + ' ' + d.rainChance + '%'">
                <div class="rain-fill" [style.width.%]="d.rainChance"></div>
              </div>
              <span class="small">🌧️ {{ d.rainChance }}% · {{ d.rainMm | number: '1.0-1' }} {{ i18n.t('mausam.mm') }}</span>
              <span class="small muted">💨 {{ d.windMax | number: '1.0-0' }} km/h</span>
            </div>
          }
        </div>
        <p class="muted small">{{ i18n.t('mausam.source') }}</p>
      }
    }
  `
})
export class WeatherComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly loc = inject(LocationService);
  private readonly api = inject(ApiService);

  protected readonly wx = signal<WeatherForecast | null>(null);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    // Reload when the district or the language changes (alerts come back translated).
    effect(() => {
      const l = this.loc.location();
      const lang = this.i18n.lang();
      if (!l) return;
      this.loading.set(true);
      this.failed.set(false);
      this.api.weather(l, lang).subscribe({
        next: w => { this.wx.set(w); this.loading.set(false); },
        error: () => { this.failed.set(true); this.loading.set(false); }
      });
    });
  }

  protected placeLine(l: FarmLocation): string {
    return [l.villageLocal || l.village, l.tehsil, l.district, this.i18n.stateName(l.state, l.stateHi)].filter(x => !!x).join(', ');
  }

  protected levelKey(level: string | null | undefined): string {
    return level === 'village' ? 'loc.village' : level === 'tehsil' ? 'loc.subdistrict' : 'loc.district';
  }

  protected info(code: number) { return weatherInfo(code); }

  protected day(date: string, i: number): string {
    if (i === 0) return this.i18n.t('mausam.today');
    if (i === 1) return this.i18n.t('mausam.tomorrow');
    return dayLabel(date, this.i18n.locale());
  }
}
