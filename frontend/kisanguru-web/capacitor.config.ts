/// <reference types="@capacitor/local-notifications" />
import type { CapacitorConfig } from '@capacitor/cli';

/**
 * KisanGuru Android app: the same Angular site, packaged as an APK so it can send
 * morning and evening field reminders. See MOBILE.md.
 */
const config: CapacitorConfig = {
  appId: 'in.kisanguru.app',
  appName: 'KisanGuru',
  webDir: 'dist/kisanguru-web/browser',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_kisan',
      iconColor: '#2f7a45'
    }
  }
};

export default config;
