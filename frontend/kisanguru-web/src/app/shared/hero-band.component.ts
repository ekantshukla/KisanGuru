import { DecimalPipe } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, ElementRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../core/i18n.service';
import { LocationService } from '../core/location.service';
import { seasonNow, sunTimes } from '../core/sun';
import { UiService } from '../core/ui.service';
import { WeatherStore } from '../core/weather.store';
import { weatherInfo } from '../core/weather-codes';
import { IconComponent } from './icon.component';

/**
 * The dark band at the top of the home page (like VaidikPandit's "today" band):
 * date and place, today's weather in big type, season chip, a farm alert, sunrise / sunset / rain,
 * and an "Ask KisanGuru" box that opens the floating chat with the question.
 */
@Component({
  selector: 'km-hero-band',
  imports: [DecimalPipe, RouterLink, IconComponent],
  template: `
    <div class="wrap hb">
      <p class="dateline">{{ today() }} @if (loc.location(); as l) { <span>{{ loc.shortName() }}</span> }</p>
      @if (loc.location(); as l) {
        @if (store.forecast(); as w) {
          <h1 class="big">{{ info().icon }} {{ w.current.temperature | number: '1.0-0' }}° <span>{{ i18n.t(info().key) }}</span></h1>
          <p class="sub">🌧️ {{ i18n.t('mausam.today') }} <b>{{ w.days[0]?.rainChance ?? 0 }}%</b>, {{ i18n.t('mausam.tomorrow') }} <b>{{ w.days[1]?.rainChance ?? 0 }}%</b></p>
        } @else {
          <h1 class="big">…</h1>
        }
        <a routerLink="/khet" class="chip-gold">{{ i18n.t('home.seasonChip').replace('{s}', i18n.t('season.' + season)) }}</a>
        @if (store.forecast(); as w) {
          <p class="dotline"><i></i>
            @if (w.alerts[0]; as a) { {{ i18n.loc(a.message) }} }
            @else { 💨 {{ i18n.t('mausam.wind') }} {{ w.current.windSpeed | number: '1.0-0' }} km/h · 💧 {{ i18n.t('mausam.humidity') }} {{ w.current.humidity }}% }
          </p>
        }
        <div class="trio">
          <div><small>{{ i18n.t('wx.sunrise') }}</small><b>{{ sun()[0] }}</b></div>
          <div><small>{{ i18n.t('wx.sunset') }}</small><b>{{ sun()[1] }}</b></div>
          @if (store.forecast(); as w) {
            <div><small>{{ i18n.t('mausam.rain7') }}</small><b>{{ w.rainNext7DaysMm | number: '1.0-1' }} {{ i18n.t('mausam.mm') }}</b></div>
          }
        </div>
      } @else {
        <h1 class="big">{{ i18n.t('loc.select') }}</h1>
        <button type="button" class="chip-gold" (click)="loc.openPicker()"><km-icon name="pin" /> {{ i18n.t('loc.select') }}</button>
      }

      <p class="askline">✨ <b>{{ i18n.t('bot.title') }}</b> · {{ i18n.t('home.askLine') }}</p>
      <form class="askbox" (submit)="$event.preventDefault(); ask()">
        <input type="text" maxlength="500" autocomplete="off" [placeholder]="i18n.t('bot.typeHere')"
               [value]="q()" (input)="q.set($any($event.target).value)" [attr.aria-label]="i18n.t('bot.typeHere')">
        <button type="submit">{{ i18n.t('sahayak.ask') }}</button>
      </form>
    </div>
  `
})
export class HeroBandComponent implements AfterViewInit {
  protected readonly i18n = inject(I18nService);
  protected readonly loc = inject(LocationService);
  protected readonly store = inject(WeatherStore);
  private readonly ui = inject(UiService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  ngAfterViewInit() {
    if (typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      es => this.ui.bandVisible.set(es.some(e => e.isIntersecting && e.intersectionRatio > 0.15)),
      { threshold: [0, 0.15, 0.5] });
    obs.observe(this.host.nativeElement);
    this.destroyRef.onDestroy(() => { obs.disconnect(); this.ui.bandVisible.set(false); });
  }

  protected readonly q = signal('');
  protected readonly season = seasonNow();
  protected readonly info = computed(() => weatherInfo(this.store.forecast()?.current.weatherCode ?? 0));
  protected readonly sun = computed(() => {
    const l = this.loc.location();
    return l ? sunTimes(l.latitude, l.longitude) : ['–', '–'];
  });
  protected readonly today = computed(() =>
    new Date().toLocaleDateString(this.i18n.locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));

  protected ask() {
    const q = this.q().trim();
    if (!q) return;
    this.ui.askBot(q);
    this.q.set('');
  }
}
