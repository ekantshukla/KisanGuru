import { Component, computed, inject, signal } from '@angular/core';
import { AccountService, authErrorKey } from '../core/account.service';
import { I18nService } from '../core/i18n.service';
import { LocationService } from '../core/location.service';
import { FarmLocation } from '../core/models';
import { PlaceSelectComponent } from '../shared/place-select.component';

const CROP_KEYS = ['wheat', 'paddy', 'gram', 'lentil', 'mustard', 'soybean', 'maize', 'onion', 'potato', 'tomato'];

/**
 * Log in / Sign up / Forgot password, then "My farm" — the same flow as VaidikPandit's account page.
 * Sign-up saves the farm's State → District → Tehsil → Village, land and crops; that farm becomes the
 * app's location (weather, mandi, AI advice).
 */
@Component({
  selector: 'km-account',
  imports: [PlaceSelectComponent],
  template: `
    <div class="narrow">
      @if (!acc.configured) {
        <h1>👤 {{ i18n.t('nav.account') }}</h1>
        <p class="notice">{{ i18n.t('acc.off') }}</p>
      } @else if (acc.user() === undefined) {
        <p class="muted">{{ i18n.t('common.loading') }}</p>
      } @else if (acc.user() === null) {
        <h1>{{ mode() === 'up' ? i18n.t('acc.create') : mode() === 'reset' ? i18n.t('acc.reset') : i18n.t('acc.welcome') }}</h1>
        <p class="lead">{{ i18n.t('acc.lead') }}</p>

        @if (mode() !== 'reset') {
          <div class="seg" role="tablist">
            <button type="button" role="tab" [class.on]="mode() === 'in'" (click)="switchMode('in')">{{ i18n.t('acc.login') }}</button>
            <button type="button" role="tab" [class.on]="mode() === 'up'" (click)="switchMode('up')">{{ i18n.t('acc.signup') }}</button>
          </div>
        }

        <form class="card stack" novalidate (submit)="$event.preventDefault(); submit()">
          @if (mode() === 'up') {
            <label class="field">{{ i18n.t('acc.name') }}<b class="req">*</b>
              <input type="text" autocomplete="name" [value]="name()" (input)="name.set($any($event.target).value)" /></label>
            <label class="field">{{ i18n.t('acc.mobile') }}<b class="req">*</b>
              <span class="phone"><span class="cc">+91</span>
                <input type="tel" inputmode="numeric" maxlength="10" autocomplete="tel-national" [value]="phone()"
                       (input)="setPhone($event)" /></span></label>

            <fieldset>
              <legend>🌾 {{ i18n.t('acc.farm') }}</legend>
              <km-place-select [value]="farm()" [required]="true" (valueChange)="farm.set($event)" />
              <label class="field">{{ i18n.t('acc.land') }}
                <input type="number" min="0" step="0.1" inputmode="decimal" [value]="land()" (input)="land.set($any($event.target).value)" /></label>
              <div class="field">{{ i18n.t('acc.crops') }}
                <div class="chips">
                  @for (c of cropKeys; track c) {
                    <button type="button" class="chip" [class.active]="crops().includes(c)" (click)="toggleCrop(c)">{{ i18n.t('commodity.' + c) }}</button>
                  }
                </div>
              </div>
            </fieldset>
          }

          <label class="field">{{ i18n.t('acc.email') }}<b class="req">*</b>
            <input type="email" autocomplete="email" [value]="email()" (input)="email.set($any($event.target).value)" /></label>
          @if (mode() !== 'reset') {
            <label class="field">{{ i18n.t('acc.password') }}<b class="req">*</b>
              <input type="password" minlength="6" [attr.autocomplete]="mode() === 'up' ? 'new-password' : 'current-password'"
                     [value]="password()" (input)="password.set($any($event.target).value)" />
              @if (mode() === 'up') { <small class="muted">{{ i18n.t('acc.pwHint') }}</small> }</label>
          }
          <p class="muted small"><b class="req">*</b> {{ i18n.t('acc.required') }}</p>

          @if (msg()) { <p [class]="ok() ? 'okmsg' : 'error'" role="status">{{ msg() }}</p> }

          <button class="btn btn-primary" type="submit" [disabled]="busy()">
            {{ busy() ? i18n.t('acc.wait') : mode() === 'up' ? i18n.t('acc.createBtn') : mode() === 'reset' ? i18n.t('acc.sendReset') : i18n.t('acc.login') }}
          </button>
          @if (mode() === 'in') { <button type="button" class="link-btn" (click)="switchMode('reset')">{{ i18n.t('acc.forgot') }}</button> }
          @if (mode() === 'reset') { <button type="button" class="link-btn" (click)="switchMode('in')">← {{ i18n.t('acc.back') }}</button> }
        </form>
        <p class="muted small">🔒 {{ i18n.t('acc.note') }}</p>
      } @else {
        @let p = acc.profile();
        <section class="card me">
          <span class="avatar" aria-hidden="true">{{ initial() }}</span>
          <div>
            <h1>{{ p?.name || acc.user()?.email }}</h1>
            <p class="muted">{{ acc.user()?.email }}@if (p?.phone) { · +91 {{ p?.phone }} }</p>
            <span class="badge badge-rabi">🌾 {{ i18n.t('acc.farmer') }}</span>
          </div>
        </section>

        @if (!acc.user()?.verified) {
          <div class="notice verify">
            <span>📧 {{ i18n.t('acc.verify') }}</span>
            <span class="actions">
              <button type="button" class="btn btn-ghost" (click)="resend()">{{ i18n.t('acc.resend') }}</button>
              <button type="button" class="btn btn-ghost" (click)="acc.reloadUser()">{{ i18n.t('acc.verified') }}</button>
            </span>
          </div>
        }

        <section class="card stack">
          <div class="head">
            <h2>🌾 {{ i18n.t('acc.farm') }}</h2>
            @if (!editing()) { <button type="button" class="btn btn-ghost" (click)="startEdit()">✏️ {{ i18n.t('acc.edit') }}</button> }
          </div>
          @if (editing()) {
            <km-place-select [value]="farm()" [required]="true" (valueChange)="farm.set($event)" />
            <label class="field">{{ i18n.t('acc.land') }}
              <input type="number" min="0" step="0.1" [value]="land()" (input)="land.set($any($event.target).value)" /></label>
            <div class="field">{{ i18n.t('acc.crops') }}
              <div class="chips">
                @for (c of cropKeys; track c) {
                  <button type="button" class="chip" [class.active]="crops().includes(c)" (click)="toggleCrop(c)">{{ i18n.t('commodity.' + c) }}</button>
                }
              </div>
            </div>
            <button type="button" class="btn btn-primary" [disabled]="busy() || !farm()" (click)="saveFarm()">
              {{ busy() ? i18n.t('acc.wait') : i18n.t('acc.save') }}</button>
          } @else {
            <dl class="farm">
              <dt>📍</dt><dd>{{ farmLine() || '—' }}</dd>
              @if (p?.landAcres) { <dt>📐</dt><dd>{{ p?.landAcres }} {{ i18n.t('acc.land') }}</dd> }
              @if (p?.crops?.length) { <dt>🌱</dt><dd>{{ cropNames() }}</dd> }
            </dl>
          }
        </section>

        @if (msg()) { <p [class]="ok() ? 'okmsg' : 'error'" role="status">{{ msg() }}</p> }
        <button type="button" class="btn btn-ghost" (click)="logout()">↩ {{ i18n.t('acc.logout') }}</button>
      }
    </div>
  `,
  styles: [`
    .narrow { max-width: 560px; margin: 0 auto; }
    .seg { display: grid; grid-template-columns: 1fr 1fr; background: #fff; border: 1px solid var(--line); border-radius: 999px; padding: 3px; margin: 1rem 0 0; }
    .seg button { border: 0; background: none; border-radius: 999px; padding: 0.6rem; font: inherit; font-weight: 700; color: var(--muted); cursor: pointer; }
    .seg button.on { background: var(--green-600); color: #fff; }
    .stack { display: flex; flex-direction: column; gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 4px; font-weight: 600; }
    .req { color: var(--danger); margin-left: 2px; }
    .phone { display: flex; align-items: stretch; }
    .cc { display: grid; place-items: center; padding: 0 0.8rem; background: var(--cream); border: 1.5px solid var(--line); border-right: 0; border-radius: 10px 0 0 10px; }
    .phone input { border-radius: 0 10px 10px 0; }
    fieldset { border: 1.5px solid var(--line); border-radius: 12px; padding: 0.8rem 1rem 1rem; display: flex; flex-direction: column; gap: 12px; }
    legend { font-weight: 700; color: var(--green-900); padding: 0 0.4rem; }
    .okmsg { color: var(--green-600); font-weight: 600; }
    .me { display: flex; align-items: center; gap: 1rem; }
    .me h1 { margin: 0; font-size: 1.5rem; }
    .avatar { width: 64px; height: 64px; border-radius: 50%; background: var(--green-600); color: #fff; display: grid; place-items: center; font-size: 1.8rem; font-weight: 800; flex: none; }
    .verify { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; justify-content: space-between; }
    .verify .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
    .head { display: flex; justify-content: space-between; align-items: center; }
    .head h2 { margin: 0; }
    .farm { display: grid; grid-template-columns: auto 1fr; gap: 0.4rem 0.8rem; margin: 0; }
    .farm dd { margin: 0; }
  `]
})
export class AccountComponent {
  protected readonly acc = inject(AccountService);
  protected readonly i18n = inject(I18nService);
  private readonly loc = inject(LocationService);
  protected readonly cropKeys = CROP_KEYS;

  protected readonly mode = signal<'in' | 'up' | 'reset'>('in');
  protected readonly name = signal('');
  protected readonly phone = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly farm = signal<FarmLocation | null>(this.loc.location());
  protected readonly land = signal('');
  protected readonly crops = signal<string[]>([]);
  protected readonly busy = signal(false);
  protected readonly msg = signal('');
  protected readonly ok = signal(false);
  protected readonly editing = signal(false);

  protected readonly initial = computed(() => (this.acc.profile()?.name || this.acc.user()?.email || '?').trim().charAt(0).toUpperCase());
  protected readonly farmLine = computed(() => {
    const f = this.acc.profile()?.farm;
    return f ? [f.villageLocal || f.village, f.tehsil, f.district, this.i18n.stateName(f.state, f.stateHi)].filter(x => !!x).join(', ') : '';
  });
  protected readonly cropNames = computed(() => (this.acc.profile()?.crops ?? []).map(c => this.i18n.t('commodity.' + c)).join(', '));

  protected setPhone(e: Event): void {
    const input = e.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 10);
    this.phone.set(input.value);
  }

  protected switchMode(m: 'in' | 'up' | 'reset'): void {
    this.mode.set(m);
    this.msg.set('');
  }

  protected toggleCrop(c: string): void {
    this.crops.update(list => (list.includes(c) ? list.filter(x => x !== c) : [...list, c]));
  }

  protected async submit(): Promise<void> {
    this.msg.set('');
    const email = this.email().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return this.fail('acc.err.email');

    if (this.mode() === 'reset') {
      return this.run(async () => { await this.acc.resetPassword(email); this.done('acc.resetSent'); });
    }
    if (this.password().length < 6) return this.fail('acc.err.weak');

    if (this.mode() === 'in') {
      return this.run(() => this.acc.signIn(email, this.password()));
    }

    const farm = this.farm();
    if (!this.name().trim() || !farm) return this.fail('acc.err.required');
    if (!/^[6-9]\d{9}$/.test(this.phone())) return this.fail('acc.err.phone');
    const land = parseFloat(this.land());
    return this.run(async () => {
      await this.acc.signUp({
        name: this.name(), email, password: this.password(), phone: this.phone(),
        farm, landAcres: Number.isFinite(land) && land > 0 ? land : null, crops: this.crops()
      });
      this.loc.set(farm);
    });
  }

  protected startEdit(): void {
    const p = this.acc.profile();
    this.farm.set(p?.farm ?? this.loc.location());
    this.land.set(p?.landAcres ? String(p.landAcres) : '');
    this.crops.set(p?.crops ?? []);
    this.editing.set(true);
    this.msg.set('');
  }

  protected saveFarm(): void {
    const farm = this.farm();
    if (!farm) return;
    const land = parseFloat(this.land());
    this.run(async () => {
      await this.acc.updateProfile({ farm, landAcres: Number.isFinite(land) && land > 0 ? land : null, crops: this.crops() });
      this.loc.set(farm);
      this.editing.set(false);
      this.done('acc.saved');
    });
  }

  protected resend(): void {
    this.run(async () => { await this.acc.resendVerification(); this.done('acc.verify'); });
  }

  protected logout(): void {
    this.run(() => this.acc.signOut());
  }

  private async run(job: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try { await job(); }
    catch (e) { this.fail(authErrorKey(e)); }
    finally { this.busy.set(false); }
  }

  private fail(key: string): void { this.ok.set(false); this.msg.set(this.i18n.t(key)); }
  private done(key: string): void { this.ok.set(true); this.msg.set(this.i18n.t(key)); }
}
