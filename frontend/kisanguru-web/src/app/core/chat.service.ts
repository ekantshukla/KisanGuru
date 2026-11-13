import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { I18nService } from './i18n.service';
import { LocationService } from './location.service';
import { ChatTurn } from './models';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  photoUrl?: string;
  pending?: boolean;
  error?: boolean;
}

/**
 * One conversation with KisanGuru, shared by the floating bot window and the full-screen page,
 * so the farmer can switch between them without losing the chat. The last turns are sent with
 * each question, so follow-ups like "and how much per acre?" work.
 */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);
  private readonly loc = inject(LocationService);

  readonly messages = signal<ChatMessage[]>([]);
  readonly busy = signal(false);
  /** null = not asked yet; false = the server has no AI key (answers point to the Kisan Call Centre). */
  readonly aiOnline = signal<boolean | null>(null);

  send(text: string, photo?: { base64: string; type: string; url: string }): void {
    const question = text.trim();
    if ((!question && !photo) || this.busy()) return;

    const history: ChatTurn[] = this.messages()
      .filter(m => !m.pending && !m.error && m.text)
      .slice(-8)
      .map(m => ({ role: m.role, text: m.text }));

    this.messages.update(list => [
      ...list,
      { role: 'user', text: question, photoUrl: photo?.url },
      { role: 'assistant', text: '', pending: true }
    ]);
    this.busy.set(true);

    this.api.ask({
      question: question || this.i18n.t('sahayak.photo'),
      language: this.i18n.lang(),
      imageBase64: photo?.base64 ?? null,
      imageMediaType: photo?.type ?? null,
      location: this.loc.label() || null,
      history
    }).subscribe({
      next: res => {
        this.aiOnline.set(res.aiEnabled);
        this.finish({ role: 'assistant', text: res.answer });
      },
      error: () => this.finish({ role: 'assistant', text: this.i18n.t('sahayak.err.network'), error: true })
    });
  }

  clear(): void {
    if (!this.busy()) this.messages.set([]);
  }

  private finish(m: ChatMessage): void {
    this.messages.update(list => [...list.slice(0, -1), m]);
    this.busy.set(false);
  }
}
