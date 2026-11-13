import { Component, inject } from '@angular/core';
import { ChatService } from '../core/chat.service';
import { I18nService } from '../core/i18n.service';
import { BotAvatarComponent } from '../shared/bot-avatar.component';
import { ChatPanelComponent } from '../shared/chat-panel.component';

/** Full-screen KisanGuru chat (the floating bot window opens the same conversation). */
@Component({
  selector: 'km-sahayak',
  imports: [ChatPanelComponent, BotAvatarComponent],
  template: `
    <header class="head">
      <km-bot-avatar [size]="56" [animate]="true" />
      <div>
        <h1>{{ i18n.t('bot.title') }}</h1>
        <p class="status"><i [class.off]="chat.aiOnline() === false"></i>{{ chat.aiOnline() === false ? i18n.t('bot.offline') : i18n.t('bot.online') }}</p>
      </div>
      @if (chat.messages().length) {
        <button type="button" class="btn btn-ghost new" (click)="chat.clear()">＋ {{ i18n.t('bot.new') }}</button>
      }
    </header>
    <p class="lead">{{ i18n.t('sahayak.intro') }}</p>
    <div class="card"><km-chat-panel [full]="true" /></div>
  `,
  styles: [`
    .head { display: flex; align-items: center; gap: 12px; }
    .head h1 { margin: 0; }
    .new { margin-left: auto; }
    .status { margin: 0; display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: 0.9rem; }
    .status i { width: 9px; height: 9px; border-radius: 50%; background: #2fa36b; }
    .status i.off { background: var(--wheat); }
    .card { display: flex; height: min(70vh, 680px); }
    km-chat-panel { flex: 1; }
  `]
})
export class SahayakComponent {
  protected readonly i18n = inject(I18nService);
  protected readonly chat = inject(ChatService);
}
