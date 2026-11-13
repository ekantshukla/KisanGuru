import { Component, inject } from '@angular/core';
import { IconComponent } from '../shared/icon.component';
import { RouterLink } from '@angular/router';
import { SUPPORT } from '../core/app-info';
import { I18nService } from '../core/i18n.service';
import { FieldsService } from '../core/fields.service';
import { LocationService } from '../core/location.service';
import { FarmLocation } from '../core/models';
import { weatherInfo } from '../core/weather-codes';

@Component({
  selector: 'km-home',
  imports: [RouterLink, IconComponent],
  template: `
    <a routerLink="/khet" class="card today-card">
      <h2>🚜 {{ i18n.t('home.today') }}</h2>
      @if (fs.plots().length) {
        @if (fs.todayAll().length) {
          <ul>
            @for (it of fs.todayAll().slice(0, 5); track it.field.id + it.task.id) {
              <li><b>{{ it.plot.name }}</b> · {{ it.field.plan ? i18n.loc(it.field.plan.cropName) : '' }}: {{ i18n.loc(it.task.title) }}</li>
            }
          </ul>
          @if (fs.todayAll().length > 5) { <p class="muted">+{{ fs.todayAll().length - 5 }}</p> }
        } @else {
          <p>🙂 {{ i18n.t('khet.nothingAll') }}</p>
        }
      } @else {
        <p>{{ i18n.t('home.fieldsCta') }}</p>
      }
      <span class="wx-strip-more">{{ i18n.t('khet.title') }} →</span>
    </a>

    <section class="tiles2">
      @for (tile of shownTiles; track tile.path) {
        <a class="t2" [class.gold]="tile.path === '/support'" [routerLink]="tile.path"><km-icon [name]="tile.icon" /><span>{{ i18n.t(tile.title) }}</span></a>
      }
    </section>

    <section class="callout">
      <span aria-hidden="true">📞</span>
      <div>
        <strong>{{ i18n.t('home.kcc') }}</strong>
        <a href="tel:18001801551" class="big-number">1800-180-1551</a>
      </div>
    </section>
  `
})
export class HomeComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly loc = inject(LocationService);
  protected readonly fs = inject(FieldsService);


  protected readonly tiles = [
    { path: '/sahayak', icon: 'sahayak', title: 'nav.sahayak' },
    { path: '/khet', icon: 'khet', title: 'nav.khet' },
    { path: '/mausam', icon: 'mausam', title: 'nav.mausam' },
    { path: '/mandi', icon: 'mandi', title: 'nav.mandi' },
    { path: '/yojana', icon: 'yojana', title: 'nav.yojana' },
    { path: '/fasal', icon: 'fasal', title: 'nav.fasal' },
    { path: '/calculator', icon: 'calculator', title: 'nav.calc' },
    { path: '/madad', icon: 'madad', title: 'nav.madad' },
    { path: '/support', icon: 'support', title: 'nav.support' }
  ];
  protected readonly shownTiles = this.tiles.filter(x => x.path !== '/support' || !!SUPPORT.upiId);

  protected placeLine(l: FarmLocation): string {
    return [l.villageLocal || l.village, l.tehsil, l.district, this.i18n.stateName(l.state, l.stateHi)].filter(x => !!x).join(', ');
  }

  protected icon(code: number): string {
    return weatherInfo(code).icon;
  }
}
