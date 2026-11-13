/** Sunrise and sunset (India time, "HH:mm") for a place and day: standard solar formula, good to about a minute. */
export function sunTimes(lat: number, lon: number, d = new Date()): [string, string] {
  const r = Math.PI / 180;
  const n = Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2000, 0, 1, 12)) / 864e5);
  const J = n - lon / 360;
  const M = (357.5291 + 0.98560028 * J) % 360;
  const C = 1.9148 * Math.sin(M * r) + 0.02 * Math.sin(2 * M * r) + 0.0003 * Math.sin(3 * M * r);
  const lam = (M + C + 282.9372) % 360;
  const transit = 2451545 + J + 0.0053 * Math.sin(M * r) - 0.0069 * Math.sin(2 * lam * r);
  const dec = Math.asin(Math.sin(lam * r) * Math.sin(23.44 * r));
  const w = Math.acos((Math.sin(-0.83 * r) - Math.sin(lat * r) * Math.sin(dec)) / (Math.cos(lat * r) * Math.cos(dec))) / r;
  const fmt = (j: number) => new Date((j - 2440587.5) * 864e5)
    .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  return [fmt(transit - w / 360), fmt(transit + w / 360)];
}

/** Season by month: rabi (Oct–Feb), zaid (Mar–May), kharif (Jun–Sep). */
export function seasonNow(d = new Date()): 'rabi' | 'zaid' | 'kharif' {
  const m = d.getMonth() + 1;
  return m >= 10 || m <= 2 ? 'rabi' : m <= 5 ? 'zaid' : 'kharif';
}
