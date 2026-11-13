import { Component, computed, effect, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import { Scheme } from '../core/models';

@Component({
  selector: 'km-schemes',
  template: `
    <h1>🏛️ {{ i18n.t('yojana.title') }}</h1>
    <p class="lead">{{ i18n.t('yojana.intro') }}</p>

    <div class="chips">
      <button type="button" class="chip" [class.active]="category() === ''" (click)="category.set('')">{{ i18n.t('yojana.all') }}</button>
      @for (c of categories(); track c) {
        <button type="button" class="chip" [class.active]="category() === c" (click)="category.set(c)">{{ categoryLabel(c) }}</button>
      }
    </div>

    @if (failed()) {
      <p class="error">{{ i18n.t('common.error') }}</p>
    } @else if (!loaded()) {
      <p class="muted">{{ i18n.t('common.loading') }}</p>
    }

    <div class="grid">
      @for (s of visible(); track s.id) {
        <article class="card scheme">
          <h2>{{ i18n.loc(s.name) }}</h2>
          <p>{{ i18n.loc(s.summary) }}</p>

          @if (i18n.isAutoTranslated(s.name)) {
            <p class="auto-note">{{ i18n.t('common.autoTranslated') }}</p>
          }
          <h3>{{ i18n.t('yojana.benefits') }}</h3>
          <ul>@for (b of s.benefits; track $index) { <li>{{ i18n.loc(b) }}</li> }</ul>

          <h3>{{ i18n.t('yojana.apply') }}</h3>
          <ol>@for (h of s.howToApply; track $index) { <li>{{ i18n.loc(h) }}</li> }</ol>

          <div class="scheme-foot">
            <a class="btn btn-ghost" [href]="s.website" target="_blank" rel="noopener">🔗 {{ i18n.t('yojana.website') }}</a>
            @if (s.helpline) {
              <span>📞 {{ i18n.t('yojana.helpline') }}: <strong>{{ s.helpline }}</strong></span>
            }
          </div>
        </article>
      }
    </div>
  `
})
export class SchemesComponent {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(ApiService);

  private readonly schemes = signal<Scheme[]>([]);
  protected readonly loaded = signal(false);
  protected readonly failed = signal(false);
  protected readonly category = signal('');

  protected readonly categories = computed(() => [...new Set(this.schemes().map(s => s.category))]);
  protected readonly visible = computed(() =>
    this.category() ? this.schemes().filter(s => s.category === this.category()) : this.schemes());


  constructor() {
    effect(() => {
      const lang = this.i18n.lang();
      this.api.schemes(lang).subscribe({
        next: s => { this.schemes.set(s); this.loaded.set(true); },
        error: () => this.failed.set(true)
      });
    });
  }

  protected categoryLabel(c: string): string {
    return this.i18n.t('cat.' + c);
  }
}
