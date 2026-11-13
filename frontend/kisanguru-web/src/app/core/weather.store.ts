import { Injectable, effect, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { I18nService } from './i18n.service';
import { LocationService } from './location.service';
import { WeatherForecast } from './models';

/** Today's forecast for the farmer's place, shared by the home band, the notifications and the weather strip. */
@Injectable({ providedIn: 'root' })
export class WeatherStore {
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);
  private readonly loc = inject(LocationService);

  readonly forecast = signal<WeatherForecast | null>(null);

  constructor() {
    effect(() => {
      const l = this.loc.location(), lang = this.i18n.lang();
      this.forecast.set(null);
      if (!l) return;
      this.api.weather(l, lang).subscribe({ next: w => this.forecast.set(w), error: () => { /* offline: no band data */ } });
    });
  }
}
