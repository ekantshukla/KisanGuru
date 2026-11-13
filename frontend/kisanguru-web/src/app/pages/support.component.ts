import { Component, computed, inject, signal } from '@angular/core';
import { SUPPORT } from '../core/app-info';
import { I18nService } from '../core/i18n.service';
import { IconComponent } from '../shared/icon.component';

/**
 * "Support KisanGuru" (like VaidikPandit's Dakshina): any amount by UPI. On a phone the button opens the
 * farmer's UPI app (PhonePe, Google Pay, Paytm, BHIM) with the amount filled in; on a computer they copy the UPI ID.
 * Giving is voluntary — nothing in the app is locked behind it.
 */
@Component({
  selector: 'km-support',
  imports: [IconComponent],
  template: `
    <div class="narrow">
      <section class="sup-hero">
        <km-icon name="support" class="big" />
        <h1>{{ i18n.t('support.title') }}</h1>
        <p>{{ i18n.t('support.lead') }}</p>
      </section>

      @if (upiId) {
        <section class="card stack">
          <h2>{{ i18n.t('support.amount') }}</h2>
          <div class="amts">
            @for (a of amounts; track a) {
              <button type="button" class="amt" [class.on]="!custom() && amt() === a" (click)="amt.set(a); custom.set('')">₹{{ a }}</button>
            }
          </div>
          <label class="field">
            <span class="lbl">{{ i18n.t('support.custom') }}</span>
            <span class="phone"><span class="cc">₹</span>
              <input type="number" min="1" inputmode="numeric" [value]="custom()" (input)="setCustom($any($event.target).value)">
            </span>
          </label>
          <a class="btn btn-gold btn-lg" [href]="link()" (click)="paid.set(true)">
            <km-icon name="support" /> {{ i18n.t('support.pay') }} · ₹{{ total() }}
          </a>
          <p class="muted small">{{ i18n.t('support.appOnly') }}</p>
          <div class="upi-row">
            <span>{{ i18n.t('support.upiId') }}: <b>{{ upiId }}</b></span>
            <button type="button" class="btn btn-ghost" (click)="copy()">{{ copied() ? '✅ ' + i18n.t('support.copied') : i18n.t('support.copy') }}</button>
          </div>
          @if (paid()) { <p class="okmsg">{{ i18n.t('support.thanks') }}</p> }
        </section>
      }
      <p class="muted small">🙏 {{ i18n.t('support.note') }}</p>
    </div>
  `
})
export class SupportComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly upiId = SUPPORT.upiId;
  protected readonly amounts = SUPPORT.amounts;
  protected readonly amt = signal(50);
  protected readonly custom = signal('');
  protected readonly copied = signal(false);
  protected readonly paid = signal(false);

  protected readonly total = computed(() => this.custom() ? Math.max(1, Math.round(+this.custom())) : this.amt());
  /** UPI deep link (NPCI "upi://pay"): payee, name, amount in rupees, currency, note. */
  protected readonly link = computed(() =>
    `upi://pay?pa=${encodeURIComponent(this.upiId)}&pn=${encodeURIComponent(SUPPORT.payeeName)}&am=${this.total()}&cu=INR&tn=${encodeURIComponent(SUPPORT.note)}`);

  protected setCustom(v: string) { this.custom.set(String(v).replace(/\D/g, '').slice(0, 6)); }

  protected async copy() {
    try { await navigator.clipboard.writeText(this.upiId); } catch { /* old browser */ }
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2500);
  }
}
