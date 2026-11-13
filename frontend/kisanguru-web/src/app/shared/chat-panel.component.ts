import { AfterViewChecked, Component, ElementRef, NgZone, OnDestroy, inject, input, signal, viewChild } from '@angular/core';
import { ChatService } from '../core/chat.service';
import { I18nService } from '../core/i18n.service';
import { BotAvatarComponent } from './bot-avatar.component';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Minimal typing for the browser's (Chrome/Edge) Web Speech recognition API. */
interface SpeechRecognitionLike {
  lang: string; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
  start(): void; stop(): void;
}

/** The KisanGuru conversation: used inside the floating bot window and on the full-screen page. */
@Component({
  selector: 'km-chat-panel',
  imports: [BotAvatarComponent],
  template: `
    <div class="chat" [class.full]="full()">
      <div class="log" #log aria-live="polite">
        @if (!chat.messages().length) {
          <div class="row">
            <km-bot-avatar class="av" [size]="32" />
            <div class="col">
              <div class="bubble hello">{{ i18n.t('bot.empty') }}</div>
              <div class="ex">
                @for (k of examples; track k) {
                  <button type="button" class="chip" (click)="send(i18n.t(k))">{{ i18n.t(k) }}</button>
                }
              </div>
            </div>
          </div>
        }
        @for (m of chat.messages(); track $index) {
          <div class="row" [class.me]="m.role === 'user'" [class.err]="m.error">
            @if (m.role !== 'user') { <km-bot-avatar class="av" [size]="32" /> }
            <div class="col">
              @if (m.photoUrl) { <img class="pic" [src]="m.photoUrl" alt="" /> }
              @if (m.text) { <div class="bubble">{{ m.text }}</div> }
              @if (m.pending) {
                <div class="bubble typing" [attr.aria-label]="i18n.t('sahayak.thinking')"><i></i><i></i><i></i></div>
              }
              @if (m.role === 'assistant' && !m.pending && m.text && canSpeak) {
                <button type="button" class="speak" (click)="read(m.text)">🔊 {{ speaking() ? i18n.t('sahayak.stop') : i18n.t('sahayak.listen') }}</button>
              }
            </div>
          </div>
        }
        @if (chat.messages().length) {
          <p class="disc">{{ i18n.t('sahayak.disclaimer') }}</p>
        }
      </div>

      @if (photo(); as p) {
        <div class="attach">
          <img [src]="p.url" alt="" />
          <button type="button" class="x" (click)="photo.set(null)" [attr.aria-label]="i18n.t('sahayak.removePhoto')">✕</button>
        </div>
      }
      @if (error()) { <p class="error small">{{ error() }}</p> }

      <form class="input" (submit)="$event.preventDefault(); send(draft())">
        <label class="icon" [attr.title]="i18n.t('sahayak.photo')" [attr.aria-label]="i18n.t('sahayak.photo')">
          📷<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" (change)="onPhoto($event)" hidden />
        </label>
        <button type="button" class="icon" [class.rec]="listening()" (click)="toggleVoice()"
                [attr.aria-label]="listening() ? i18n.t('sahayak.listening') : i18n.t('sahayak.voice')"
                [attr.title]="listening() ? i18n.t('sahayak.listening') : i18n.t('sahayak.voice')">🎤</button>
        <textarea rows="1" maxlength="2000" [placeholder]="i18n.t('bot.typeHere')" [value]="draft()"
                  (input)="draft.set($any($event.target).value)" (keydown.enter)="onEnter($event)"></textarea>
        <button type="submit" class="send" [disabled]="chat.busy() || (!draft().trim() && !photo())" [attr.aria-label]="i18n.t('bot.send')">➤</button>
      </form>
    </div>
  `,
  styles: [`
    :host { display: flex; min-height: 0; }
    .chat { display: flex; flex-direction: column; gap: 8px; flex: 1; min-height: 0; }
    .chat.full { min-height: 60vh; }
    .log { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; padding: 4px 2px; }
    .row { display: flex; gap: 8px; align-items: flex-start; }
    .row.me { justify-content: flex-end; }
    .av { flex: none; }
    .col { display: flex; flex-direction: column; gap: 6px; max-width: 85%; }
    .row.me .col { align-items: flex-end; }
    .bubble { background: #fff; border: 1px solid var(--line); border-radius: 4px 16px 16px 16px; padding: 10px 12px; white-space: pre-wrap; line-height: 1.5; }
    .row.me .bubble { background: var(--green-600); color: #fff; border-color: var(--green-600); border-radius: 16px 4px 16px 16px; }
    .row.err .bubble { border-color: var(--danger); color: var(--danger); }
    .hello { background: var(--green-100); border-color: var(--green-100); }
    .ex { display: flex; flex-wrap: wrap; gap: 6px; }
    .ex .chip { font-size: 0.9rem; text-align: left; }
    .pic { max-width: 180px; border-radius: 12px; border: 1px solid var(--line); }
    .typing { display: inline-flex; gap: 4px; }
    .typing i { width: 7px; height: 7px; border-radius: 50%; background: var(--muted); animation: dot 1.2s infinite; }
    .typing i:nth-child(2) { animation-delay: 0.2s; } .typing i:nth-child(3) { animation-delay: 0.4s; }
    @keyframes dot { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }
    .speak { align-self: flex-start; background: none; border: 0; color: var(--green-600); font: inherit; font-size: 0.85rem; font-weight: 700; cursor: pointer; padding: 0; }
    .disc { font-size: 0.75rem; color: var(--muted); margin: 0; text-align: center; }
    .attach { position: relative; align-self: flex-start; }
    .attach img { width: 72px; height: 72px; object-fit: cover; border-radius: 10px; }
    .attach .x { position: absolute; top: -6px; right: -6px; width: 22px; height: 22px; border-radius: 50%; border: 0; background: var(--ink); color: #fff; cursor: pointer; font-size: 0.7rem; }
    .input { display: flex; align-items: flex-end; gap: 6px; background: #fff; border: 1.5px solid var(--line); border-radius: 16px; padding: 6px; }
    .input:focus-within { border-color: var(--green-600); }
    .input textarea { flex: 1; border: 0; resize: none; padding: 8px 4px; min-height: 40px; max-height: 120px; outline: none; }
    .icon { width: 40px; height: 40px; border-radius: 50%; border: 0; background: var(--cream); cursor: pointer; display: grid; place-items: center; font-size: 1.1rem; flex: none; }
    .icon.rec { background: #fbe4e2; animation: pulse 1s infinite; }
    @keyframes pulse { 50% { box-shadow: 0 0 0 6px rgba(179, 38, 30, 0.15); } }
    .send { width: 40px; height: 40px; border-radius: 50%; border: 0; background: var(--green-600); color: #fff; font-size: 1.1rem; cursor: pointer; flex: none; }
    .send:disabled { opacity: 0.4; cursor: default; }
  `]
})
export class ChatPanelComponent implements AfterViewChecked, OnDestroy {
  protected readonly chat = inject(ChatService);
  protected readonly i18n = inject(I18nService);
  private readonly zone = inject(NgZone);

  readonly full = input(false);
  private readonly log = viewChild<ElementRef<HTMLElement>>('log');

  protected readonly examples = ['sahayak.chip1', 'sahayak.chip2', 'sahayak.chip3', 'sahayak.chip4'];
  protected readonly draft = signal('');
  protected readonly photo = signal<{ base64: string; type: string; url: string } | null>(null);
  protected readonly error = signal('');
  protected readonly listening = signal(false);
  protected readonly speaking = signal(false);
  protected readonly canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

  private recognition: SpeechRecognitionLike | null = null;
  private lastCount = -1;

  ngAfterViewChecked(): void {
    // Keep the newest message in view
    const n = this.chat.messages().length;
    if (n !== this.lastCount) {
      this.lastCount = n;
      const el = this.log()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }

  protected send(text: string): void {
    this.error.set('');
    this.stopSpeaking();
    this.chat.send(text, this.photo() ?? undefined);
    this.draft.set('');
    this.photo.set(null);
  }

  protected onEnter(e: Event): void {
    const k = e as KeyboardEvent;
    if (!k.shiftKey) { k.preventDefault(); this.send(this.draft()); }
  }

  protected onPhoto(event: Event): void {
    this.error.set('');
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) { this.error.set(this.i18n.t('sahayak.err.photoType')); return; }
    if (file.size > MAX_PHOTO_BYTES) { this.error.set(this.i18n.t('sahayak.err.photoSize')); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      this.photo.set({ url, base64: url.substring(url.indexOf(',') + 1), type: file.type });
    };
    reader.readAsDataURL(file);
  }

  protected toggleVoice(): void {
    if (this.listening()) { this.recognition?.stop(); return; }
    const w = window as unknown as Record<string, (new () => SpeechRecognitionLike) | undefined>;
    const Ctor = w['SpeechRecognition'] ?? w['webkitSpeechRecognition'];
    if (!Ctor) { this.error.set(this.i18n.t('sahayak.err.voice')); return; }

    const rec = new Ctor();
    rec.lang = this.i18n.locale();
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = e => this.zone.run(() => {
      const text = e.results[0]?.[0]?.transcript ?? '';
      this.draft.update(d => `${d} ${text}`.trim());
    });
    rec.onerror = () => this.zone.run(() => this.listening.set(false));
    rec.onend = () => this.zone.run(() => this.listening.set(false));
    this.recognition = rec;
    this.error.set('');
    this.listening.set(true);
    rec.start();
  }

  protected read(text: string): void {
    if (this.speaking()) { this.stopSpeaking(); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = this.i18n.locale();
    u.rate = 0.95;
    u.onend = () => this.zone.run(() => this.speaking.set(false));
    u.onerror = () => this.zone.run(() => this.speaking.set(false));
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    this.speaking.set(true);
  }

  private stopSpeaking(): void {
    if (this.canSpeak) window.speechSynthesis.cancel();
    this.speaking.set(false);
  }

  ngOnDestroy(): void {
    this.recognition?.stop();
    this.stopSpeaking();
  }
}
