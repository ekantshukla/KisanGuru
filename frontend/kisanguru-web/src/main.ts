import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));

// Service worker: lets browsers offer "Install app" (see the Get app bar) and open saved pages offline.
// Not used inside the Android app (Capacitor), which already works as an app.
const native = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
if ('serviceWorker' in navigator && !native && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('sw.js', document.baseURI).href).catch(() => undefined);
  });
}
