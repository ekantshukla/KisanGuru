import { Component, input } from '@angular/core';

/** AI KisanGuru's face: a wise farmer-guru (dada) in a saffron pagdi with a wheat-ear kalgi, round glasses and a white beard. Original artwork. */
let nextId = 0;
@Component({
  selector: 'km-bot-avatar',
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 64 64" aria-hidden="true" [class.blink]="animate()">
      <defs><clipPath [attr.id]="clip"><circle cx="32" cy="32" r="32" /></clipPath></defs>
      <g [attr.clip-path]="'url(#' + clip + ')'">
        <rect width="64" height="64" fill="#143a22" />
        <!-- white kurta with a green gamchha -->
        <path d="M6 66 C8 52 18 47.5 32 47.5 C46 47.5 56 52 58 66Z" fill="#fff4dc" />
        <path d="M15.5 51.5 C23 58.5 41 58.5 48.5 51.5" stroke="#2e7d4f" stroke-width="3.6" fill="none" stroke-linecap="round" />
        <!-- ears and face -->
        <ellipse cx="14" cy="36" rx="2.6" ry="3.6" fill="#b9774a" /><ellipse cx="50" cy="36" rx="2.6" ry="3.6" fill="#b9774a" />
        <path d="M15.5 30 C15.5 22 48.5 22 48.5 30 V38 C48.5 47 41 52 32 52 C23 52 15.5 47 15.5 38Z" fill="#c98653" />
        <!-- white beard -->
        <path d="M17.5 40 C19 51 26 55.5 32 55.5 C38 55.5 45 51 46.5 40 C43.5 44.5 38.5 45.5 32 45.5 C25.5 45.5 20.5 44.5 17.5 40Z" fill="#f5f2ea" />
        <!-- saffron pagdi -->
        <path d="M11 31 C8 6 56 6 53 31 C46 26.5 18 26.5 11 31Z" fill="#f28c1f" />
        <path d="M12.5 26 C20 17 36 13 50 17" stroke="#d06510" stroke-width="1.8" fill="none" stroke-linecap="round" />
        <path d="M14 20.5 C22 13 36 10.5 46.5 12.5" stroke="#d06510" stroke-width="1.6" fill="none" stroke-linecap="round" />
        <path d="M51.5 21 C50 25 44 26.5 30 26.8" stroke="#ffc070" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".7" />
        <!-- wheat-ear kalgi -->
        <g transform="rotate(18 44 16)">
          <path d="M44 22 V8" stroke="#f2b631" stroke-width="1.5" stroke-linecap="round" />
          <g fill="#ffe08a">
            <ellipse cx="44" cy="6.8" rx="1.4" ry="2.4" />
            <ellipse cx="42.2" cy="10" rx="1.3" ry="2.2" transform="rotate(-30 42.2 10)" /><ellipse cx="45.8" cy="10" rx="1.3" ry="2.2" transform="rotate(30 45.8 10)" />
            <ellipse cx="42.2" cy="13.4" rx="1.3" ry="2.2" transform="rotate(-30 42.2 13.4)" /><ellipse cx="45.8" cy="13.4" rx="1.3" ry="2.2" transform="rotate(30 45.8 13.4)" />
          </g>
        </g>
        <circle cx="44.5" cy="22" r="2.4" fill="#f2b631" stroke="#fff4dc" stroke-width=".7" />
        <!-- white brows, round glasses, eyes -->
        <path d="M20.5 31.6 Q24.5 29.8 28.5 31.6 M35.5 31.6 Q39.5 29.8 43.5 31.6" stroke="#f5f2ea" stroke-width="2.1" fill="none" stroke-linecap="round" />
        <g fill="#ffffff55" stroke="#3b2414" stroke-width="1.4"><circle cx="25" cy="36" r="4.2" /><circle cx="39" cy="36" r="4.2" /></g>
        <path d="M29.2 36 H34.8" stroke="#3b2414" stroke-width="1.4" />
        <g class="eyes" fill="#2a1a0f"><circle cx="25" cy="36.3" r="1.6" /><circle cx="39" cy="36.3" r="1.6" /></g>
        <!-- mustache and smile -->
        <path d="M32 42.2 C28.5 40.2 23 40.8 21 44.4 C25.5 43.6 28.5 44.8 32 43.8 C35.5 44.8 38.5 43.6 43 44.4 C41 40.8 35.5 40.2 32 42.2Z" fill="#fff" />
        <path d="M29 47.2 Q32 49 35 47.2" stroke="#9a4a26" stroke-width="1.5" fill="none" stroke-linecap="round" />
      </g>
    </svg>
  `,
  styles: [`
    :host { display: inline-grid; line-height: 0; }
    svg { display: block; }
    .blink .eyes { transform-origin: 32px 36px; transform-box: view-box; animation: blink 5s infinite; }
    @keyframes blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }
    @media (prefers-reduced-motion: reduce) { .blink .eyes { animation: none; } }
  `]
})
export class BotAvatarComponent {
  readonly size = input(40);
  readonly animate = input(false);
  /** Each avatar needs its own clip-path id, because several are on the page at once. */
  protected readonly clip = `kg-face-${nextId++}`;
}
