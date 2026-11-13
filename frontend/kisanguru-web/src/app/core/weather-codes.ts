/** WMO weather code (Open-Meteo) → icon and i18n key. */
export function weatherInfo(code: number): { icon: string; key: string } {
  if (code === 0) return { icon: '☀️', key: 'wx.clear' };
  if (code <= 2) return { icon: '🌤️', key: 'wx.partly' };
  if (code === 3) return { icon: '☁️', key: 'wx.overcast' };
  if (code === 45 || code === 48) return { icon: '🌫️', key: 'wx.fog' };
  if (code >= 51 && code <= 57) return { icon: '🌦️', key: 'wx.drizzle' };
  if (code >= 61 && code <= 67) return { icon: '🌧️', key: 'wx.rain' };
  if (code >= 71 && code <= 77) return { icon: '🌨️', key: 'wx.snow' };
  if (code >= 80 && code <= 82) return { icon: '🌦️', key: 'wx.showers' };
  if (code >= 95) return { icon: '⛈️', key: 'wx.storm' };
  return { icon: '🌡️', key: 'wx.other' };
}

/** "Fri, 14 Nov" in the reader's language. */
export function dayLabel(isoDate: string, locale: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
}
