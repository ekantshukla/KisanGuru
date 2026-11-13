import { Component, computed, inject, signal } from '@angular/core';
import { I18nService } from '../core/i18n.service';
import { LocationService } from '../core/location.service';
import { IconComponent } from './icon.component';
import { PlaceSelectComponent } from './place-select.component';

/**
 * Header 📍 chip + sheet (same pattern as VaidikPandit's place picker) with four dropdowns:
 * State → District → Tehsil/Taluka/Mandal → Village. Opens only when the farmer taps the chip.
 */
@Component({
  selector: 'km-place-picker',
  imports: [PlaceSelectComponent, IconComponent],
  template: `
    <button type="button" class="pill loc-pill" (click)="loc.openPicker()" aria-haspopup="dialog"
            [attr.aria-label]="i18n.t('loc.title') + ': ' + chipLabel()">
      <svg class="ic pin" viewBox="0 0 24 24" aria-hidden="true"><path fill="#f2b631" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg>
      <span class="loc-txt">{{ chipLabel() }}</span>
      <km-icon name="down" class="chev" />
    </button>

    @if (loc.pickerOpen()) {
      <div class="scrim" (click)="loc.closePicker()"></div>
      <div class="sheet" role="dialog" aria-modal="true" [attr.aria-label]="i18n.t('loc.title')" (keydown.escape)="loc.closePicker()">
        <header>
          <h2>📍 {{ i18n.t('loc.title') }}</h2>
          <button type="button" class="x" (click)="loc.closePicker()" [attr.aria-label]="i18n.t('bot.close')">✕</button>
        </header>
        <p class="why">{{ i18n.t('loc.why') }}</p>

        <km-place-select [value]="loc.location()" (valueChange)="loc.set($event)" />

        <button type="button" class="btn btn-primary" [disabled]="!loc.location()" (click)="loc.closePicker()">✓ {{ i18n.t('loc.done') }}</button>

        <div class="or"><span>{{ i18n.t('loc.or') }}</span></div>
        <button type="button" class="btn btn-ghost gps" (click)="useGps()" [disabled]="locating()">
          🛰️ {{ locating() ? i18n.t('loc.locating') : i18n.t('loc.gps') }}
        </button>
        @if (gpsError()) {
          <p class="error small">{{ i18n.t('loc.gpsError') }}</p>
        }
        <p class="foot">{{ i18n.t('loc.note') }}</p>
      </div>
    }
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .loc-chip {
      display: inline-flex; align-items: center; gap: 0.35rem; max-width: 200px;
      background: rgba(255, 255, 255, 0.12); color: #fff; border: 1.5px solid rgba(255, 255, 255, 0.4);
      border-radius: 999px; padding: 0.35rem 0.8rem; font: inherit; cursor: pointer;
    }
    .loc-chip svg { width: 16px; height: 16px; flex: none; }
    .loc-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .scrim { position: fixed; inset: 0; background: rgba(20, 58, 34, 0.5); z-index: 70; }
    .sheet {
      position: fixed; z-index: 71; background: #fff; color: var(--ink); display: flex; flex-direction: column; gap: 12px;
      left: 50%; top: 70px; transform: translateX(-50%); width: min(480px, calc(100vw - 24px));
      max-height: calc(100vh - 90px); overflow: auto; border-radius: 18px; padding: 18px; box-shadow: 0 18px 50px rgba(0, 0, 0, 0.3);
    }
    header { display: flex; align-items: center; justify-content: space-between; }
    h2 { margin: 0; font-size: 1.25rem; }
    .x { width: 36px; height: 36px; border: 0; border-radius: 50%; background: var(--cream); cursor: pointer; color: var(--muted); }
    .why { margin: 0; color: var(--muted); }
    .or { text-align: center; color: var(--muted); position: relative; }
    .or::before { content: ''; position: absolute; left: 0; right: 0; top: 50%; border-top: 1px solid var(--line); }
    .or span { background: #fff; padding: 0 0.8rem; position: relative; }
    .gps { width: 100%; }
    .foot { margin: 0; font-size: 0.78rem; color: var(--muted); }
    @media (max-width: 1024px) {
      .loc-chip { max-width: 130px; }
      .sheet {
        left: 0; right: 0; bottom: 0; top: auto; transform: none; width: auto; max-height: 90vh;
        border-radius: 18px 18px 0 0; padding-bottom: calc(18px + env(safe-area-inset-bottom, 0px)); animation: up 0.2s ease-out;
      }
    }
    @keyframes up { from { transform: translateY(30px); opacity: 0; } to { transform: none; opacity: 1; } }
  `]
})
export class PlacePickerComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly loc = inject(LocationService);

  protected readonly locating = signal(false);
  protected readonly gpsError = signal(false);
  protected readonly chipLabel = computed(() => this.loc.shortName() || this.i18n.t('loc.select'));

  protected useGps(): void {
    if (!('geolocation' in navigator)) { this.gpsError.set(true); return; }
    this.locating.set(true);
    this.gpsError.set(false);
    navigator.geolocation.getCurrentPosition(
      pos => { this.locating.set(false); this.loc.chooseGps(pos.coords.latitude, pos.coords.longitude); },
      () => { this.locating.set(false); this.gpsError.set(true); },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 }
    );
  }
}
