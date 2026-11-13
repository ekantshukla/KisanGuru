import { Component, input } from '@angular/core';

/** KisanGuru's face: a friendly bot in a green farmer's pagdi, with a wheat-ear antenna. Original artwork. */
@Component({
  selector: 'km-bot-avatar',
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 64 64" aria-hidden="true" [class.blink]="animate()">
      <circle cx="32" cy="32" r="32" fill="#143a22" />
      <!-- wheat-ear antenna -->
      <path d="M32 12 V4.5" stroke="#e0b84a" stroke-width="2" stroke-linecap="round" />
      <g fill="#f2b631">
        <ellipse cx="29.6" cy="7" rx="1.6" ry="2.6" transform="rotate(-30 29.6 7)" />
        <ellipse cx="34.4" cy="7" rx="1.6" ry="2.6" transform="rotate(30 34.4 7)" />
        <ellipse cx="29.8" cy="10.6" rx="1.6" ry="2.6" transform="rotate(-30 29.8 10.6)" />
        <ellipse cx="34.2" cy="10.6" rx="1.6" ry="2.6" transform="rotate(30 34.2 10.6)" />
        <ellipse cx="32" cy="3.6" rx="1.4" ry="2.4" />
      </g>
      <!-- ears -->
      <rect x="9" y="29" width="5" height="11" rx="2.5" fill="#7a9a3a" />
      <rect x="50" y="29" width="5" height="11" rx="2.5" fill="#7a9a3a" />
      <!-- head -->
      <rect x="13" y="17" width="38" height="34" rx="14" fill="#f2b631" />
      <!-- pagdi (turban) with folds and a tail -->
      <path d="M12 26 C12 14 52 14 52 26 C46 22 18 22 12 26 Z" fill="#2f7a45" />
      <path d="M15 22.5 C24 18 40 18 49 22.5" fill="none" stroke="#4f9a5f" stroke-width="1.6" />
      <path d="M17 19.4 C26 15.6 38 15.6 47 19.4" fill="none" stroke="#4f9a5f" stroke-width="1.4" />
      <path d="M51 24 q5 4 2 11" fill="none" stroke="#2f7a45" stroke-width="3" stroke-linecap="round" />
      <!-- face screen -->
      <rect x="18" y="27" width="28" height="19" rx="9" fill="#fbf8f1" />
      <!-- eyes -->
      <g class="eyes" fill="#143a22"><ellipse cx="26" cy="34.5" rx="2.6" ry="3" /><ellipse cx="38" cy="34.5" rx="2.6" ry="3" /></g>
      <!-- smile -->
      <path d="M27 40.5 Q32 44.5 37 40.5" fill="none" stroke="#2f7a45" stroke-width="2" stroke-linecap="round" />
      <!-- gamchha (scarf) -->
      <path d="M17 52 Q32 60 47 52" fill="none" stroke="#c0392b" stroke-width="3" stroke-linecap="round" />
    </svg>
  `,
  styles: [`
    :host { display: inline-grid; line-height: 0; }
    svg { display: block; }
    .blink .eyes { transform-origin: 32px 34px; animation: blink 5s infinite; }
    @keyframes blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
    @media (prefers-reduced-motion: reduce) { .blink .eyes { animation: none; } }
  `]
})
export class BotAvatarComponent {
  readonly size = input(40);
  readonly animate = input(false);
}
