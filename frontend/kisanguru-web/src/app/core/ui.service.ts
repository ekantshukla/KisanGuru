import { Injectable, inject, signal } from '@angular/core';
import { ChatService } from './chat.service';

/** App-wide panels: the floating KisanGuru chat, the "More" sheet and the notifications list. */
@Injectable({ providedIn: 'root' })
export class UiService {
  private readonly chat = inject(ChatService);

  readonly botOpen = signal(false);
  readonly moreOpen = signal(false);
  readonly notifOpen = signal(false);
  /** The home band (with its own Ask box) is on screen: the floating bot hides so it doesn't cover it. */
  readonly bandVisible = signal(false);

  /** Open the floating chat, optionally asking a question straight away (home "Ask" box). */
  askBot(question?: string) {
    this.moreOpen.set(false);
    this.notifOpen.set(false);
    this.botOpen.set(true);
    const q = question?.trim();
    if (q) this.chat.send(q);
  }

  closeAll() {
    this.moreOpen.set(false);
    this.notifOpen.set(false);
  }
}
