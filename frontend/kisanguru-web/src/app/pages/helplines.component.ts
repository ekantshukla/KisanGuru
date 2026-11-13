import { Component, effect, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { I18nService } from '../core/i18n.service';
import { Helpline } from '../core/models';

@Component({
  selector: 'km-helplines',
  template: `
    <h1>📞 {{ i18n.t('madad.title') }}</h1>
    <p class="lead">{{ i18n.t('madad.intro') }}</p>

    @if (failed()) {
      <p class="error">{{ i18n.t('common.error') }}</p>
    }

    <div class="grid">
      @for (h of helplines(); track h.id) {
        <article class="card helpline">
          <h2>{{ i18n.loc(h.name) }}</h2>
          <p>{{ i18n.loc(h.purpose) }}</p>
          <a class="big-number" [href]="'tel:' + digits(h.number)">{{ h.number }}</a>
          <a class="btn btn-primary" [href]="'tel:' + digits(h.number)">📞 {{ i18n.t('madad.call') }}</a>
        </article>
      }
    </div>
  `
})
export class HelplinesComponent {
  protected readonly i18n = inject(I18nService);
  private readonly api = inject(ApiService);

  protected readonly helplines = signal<Helpline[]>([]);
  protected readonly failed = signal(false);

  constructor() {
    effect(() => {
      const lang = this.i18n.lang();
      this.api.helplines(lang).subscribe({ next: h => this.helplines.set(h), error: () => this.failed.set(true) });
    });
  }

  protected digits(n: string): string {
    return n.replace(/[^0-9+]/g, '');
  }
}
