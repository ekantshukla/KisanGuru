import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { inject } from '@angular/core';

/** Line icons (24×24, stroke = currentColor), drawn for KisanGuru in the style of VaidikPandit's tiles. */
export const ICONS: Record<string, string> = {
  today: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  khet: '<path d="M12 21v-9"/><path d="M12 12C12 8 9.5 5 4 5c0 5 3 7 8 7Z"/><path d="M12 10c0-3.5 2.5-6 8-6 0 4.5-3 6-8 6Z"/><path d="M5 21h14"/>',
  mausam: '<path d="M7 16a4 4 0 1 1 .9-7.9A5.5 5.5 0 0 1 18.5 10 3 3 0 0 1 18 16Z"/><path d="M9 19.5 8 21.5M13 19.5l-1 2M17 19.5l-1 2"/>',
  mandi: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  sahayak: '<rect x="4" y="8" width="16" height="12" rx="4"/><path d="M12 8V4.5"/><circle cx="12" cy="3.5" r="1"/><path d="M9 13v1M15 13v1M9.5 17h5"/>',
  yojana: '<path d="M3 21h18M5 21V11M9.5 21V11M14.5 21V11M19 21V11"/><path d="m2 11 10-7 10 7Z"/>',
  fasal: '<path d="M5 20c0-9 6-15 15-15 0 9-6 15-15 15Z"/><path d="m5 20 8-8"/>',
  calculator: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7h7"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01"/>',
  madad: '<path d="M5 4h3.5l1.8 4.6-2.3 1.4a11 11 0 0 0 5.9 5.9l1.4-2.3L20 15.5V19a2 2 0 0 1-2.2 2A17 17 0 0 1 3 6.2 2 2 0 0 1 5 4Z"/>',
  account: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  support: '<path d="M12 21s-7.5-4.6-9.3-9.2C1.5 8.6 3.6 5 7 5c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.4 0 5.5 3.6 4.3 6.8C19.5 16.4 12 21 12 21Z"/>',
  pin: '<path d="M12 21s-7-6.6-7-12a7 7 0 0 1 14 0c0 5.4-7 12-7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
  down: '<path d="m6 9 6 6 6-6"/>'
};

@Component({
  selector: 'km-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ic', 'aria-hidden': 'true' },
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
                  stroke-linejoin="round" [innerHTML]="svg()"></svg>`
})
export class IconComponent {
  readonly name = input.required<string>();
  private readonly sanitizer = inject(DomSanitizer);
  // Only our own fixed paths above are ever rendered here.
  protected readonly svg = computed<SafeHtml>(() => this.sanitizer.bypassSecurityTrustHtml(ICONS[this.name()] ?? ''));
}
