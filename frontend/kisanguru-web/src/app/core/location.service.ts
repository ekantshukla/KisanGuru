import { Injectable, computed, effect, signal } from '@angular/core';
import placesJson from './data/places.json';
import { FarmLocation } from './models';

/** [name, lat, lng, LGD district code, approx?] — approx = 1 for districts created after 2011 (rough centre). */
export type DistrictInfo = [string, number, number, number, number?];
/** One state / UT (LGD), with Hindi name and its districts. Built by tools/build_places.py. */
export interface StateInfo { c: number; n: string; h: string; d: DistrictInfo[]; }
export const STATES: StateInfo[] = (placesJson as unknown as { states: StateInfo[] }).states;

const STORAGE_KEY = 'km.location.v2';

export function placeFromDistrict(state: StateInfo, d: DistrictInfo): FarmLocation {
  return {
    state: state.n, stateHi: state.h, stateCode: state.c,
    district: d[0], districtCode: d[3], latitude: d[1], longitude: d[2], approx: !!d[4]
  };
}

/**
 * The farmer's place: State → District → Tehsil/Taluka/Mandal → Village (all India, from LGD).
 * District is required; tehsil and village are optional but make the weather more local.
 * Not asked on the first visit: it comes from the farmer's profile after sign-up, or from the 📍 chip.
 */
@Injectable({ providedIn: 'root' })
export class LocationService {
  readonly location = signal<FarmLocation | null>(this.readSaved());
  readonly pickerOpen = signal(false);

  /** Most specific name, for the header chip. */
  readonly shortName = computed(() => {
    const l = this.location();
    return l ? (l.villageLocal || l.village || l.tehsil || l.district) : '';
  });

  /** "Village Ahroli, Tehsil Moth, District Jhansi, Uttar Pradesh" — for AI prompts. */
  readonly label = computed(() => {
    const l = this.location();
    if (!l) return '';
    return [
      l.village ? `village ${l.village}` : null,
      l.tehsil ? `tehsil ${l.tehsil}` : null,
      `district ${l.district}`,
      l.state
    ].filter(Boolean).join(', ');
  });

  constructor() {
    effect(() => {
      const l = this.location();
      try { if (l) localStorage.setItem(STORAGE_KEY, JSON.stringify(l)); } catch { /* storage unavailable */ }
    });
  }

  set(l: FarmLocation | null): void {
    if (l) this.location.set(l);
  }

  setDistrict(state: StateInfo, d: DistrictInfo): void {
    this.location.set(placeFromDistrict(state, d));
  }

  /** GPS: the exact point is used for weather; names come from the nearest district centre. */
  chooseGps(latitude: number, longitude: number): void {
    const near = this.nearestDistrict(latitude, longitude);
    this.setDistrict(near.state, near.district);
    this.location.update(l => l && ({ ...l, latitude, longitude, viaGps: true, approx: false }));
  }

  openPicker(): void { this.pickerOpen.set(true); }

  closePicker(): void { this.pickerOpen.set(false); }

  nearestDistrict(lat: number, lng: number): { state: StateInfo; district: DistrictInfo } {
    let best = { state: STATES[0], district: STATES[0].d[0] };
    let bestKm = Number.POSITIVE_INFINITY;
    for (const s of STATES) {
      for (const d of s.d) {
        if (d[4]) continue; // skip rough centres
        const km = haversineKm(lat, lng, d[1], d[2]);
        if (km < bestKm) { bestKm = km; best = { state: s, district: d }; }
      }
    }
    return best;
  }

  private readSaved(): FarmLocation | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const l = JSON.parse(raw) as FarmLocation;
      return typeof l?.latitude === 'number' && typeof l?.districtCode === 'number' ? l : null;
    } catch {
      return null;
    }
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = (x: number) => (x * Math.PI) / 180;
  const dLat = r(lat2 - lat1), dLon = r(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
