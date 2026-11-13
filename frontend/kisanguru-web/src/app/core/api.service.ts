import { Injectable, inject } from '@angular/core';
import { API_URL } from './app-info';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AdvisoryRequest, AdvisoryResponse, Crop, FertilizerRequest, FieldPlan, SuggestResponse, FertilizerResult, Helpline,
  FarmLocation, LoanRequest, LoanResult, MandiResult, ProfitRequest, ProfitResult, Scheme, Subdistrict, Village, WeatherForecast
} from './models';

/**
 * All calls to the .NET API. In development /api is proxied to http://localhost:5080.
 * Content calls pass `lang`: for languages other than Hindi/English the server fills `local`
 * with a cached translation.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${API_URL.replace(/\/+$/, '')}/api`;

  schemes(lang: string): Observable<Scheme[]> {
    return this.http.get<Scheme[]>(`${this.base}/schemes`, { params: { lang } });
  }

  crops(lang: string): Observable<Crop[]> {
    return this.http.get<Crop[]>(`${this.base}/crops`, { params: { lang } });
  }

  helplines(lang: string): Observable<Helpline[]> {
    return this.http.get<Helpline[]>(`${this.base}/helplines`, { params: { lang } });
  }

  mandi(filters: { state?: string; district?: string; commodity?: string }): Observable<MandiResult> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value && value.trim()) params = params.set(key, value.trim());
    }
    return this.http.get<MandiResult>(`${this.base}/mandi/prices`, { params });
  }

  /** Forecast for the farmer's village/tehsil when the server can find it by name, else the district centre. */
  weather(l: FarmLocation, lang: string): Observable<WeatherForecast> {
    let params = new HttpParams()
      .set('lat', l.latitude.toFixed(4)).set('lon', l.longitude.toFixed(4)).set('lang', lang)
      .set('state', l.state).set('district', l.district).set('approx', String(!!l.approx));
    if (!l.viaGps) {
      if (l.tehsil) params = params.set('tehsil', l.tehsil);
      if (l.village) params = params.set('village', l.village);
    }
    return this.http.get<WeatherForecast>(`${this.base}/weather`, { params });
  }

  subdistricts(districtCode: number): Observable<Subdistrict[]> {
    return this.http.get<Subdistrict[]>(`${this.base}/places/subdistricts`, { params: { district: districtCode } });
  }

  villages(stateCode: number, subdistrictCode: number): Observable<Village[]> {
    return this.http.get<Village[]>(`${this.base}/places/villages`, { params: { state: stateCode, subdistrict: subdistrictCode } });
  }

  /** Crop calendar for one field; location adds weather flags for the next 7 days. */
  plan(f: { cropId: string; sownOn: string; areaAcres: number; irrigated: boolean }, lang: string, l: FarmLocation | null, soil?: string | null): Observable<FieldPlan> {
    let params = new HttpParams()
      .set('crop', f.cropId).set('sown', f.sownOn).set('area', String(f.areaAcres))
      .set('irrigated', String(f.irrigated)).set('lang', lang);
    if (soil) params = params.set('soil', soil);
    if (l) {
      params = params.set('lat', l.latitude.toFixed(4)).set('lon', l.longitude.toFixed(4))
        .set('state', l.state).set('district', l.district).set('approx', String(!!l.approx));
      if (!l.viaGps && l.tehsil) params = params.set('tehsil', l.tehsil);
      if (!l.viaGps && l.village) params = params.set('village', l.village);
    }
    return this.http.get<FieldPlan>(`${this.base}/calendar/plan`, { params });
  }

  /** Crops to sow now in an empty field, for the farmer's region and the field's water and soil. */
  suggest(q: { irrigated: boolean; soil?: string | null; state?: string; district?: string }, lang: string): Observable<SuggestResponse> {
    let params = new HttpParams().set('irrigated', String(q.irrigated)).set('lang', lang);
    if (q.soil) params = params.set('soil', q.soil);
    if (q.state) params = params.set('state', q.state);
    if (q.district) params = params.set('district', q.district);
    return this.http.get<SuggestResponse>(`${this.base}/calendar/suggest`, { params });
  }

  fertilizer(req: FertilizerRequest): Observable<FertilizerResult> {
    return this.http.post<FertilizerResult>(`${this.base}/calculators/fertilizer`, req);
  }

  loan(req: LoanRequest): Observable<LoanResult> {
    return this.http.post<LoanResult>(`${this.base}/calculators/loan`, req);
  }

  profit(req: ProfitRequest): Observable<ProfitResult> {
    return this.http.post<ProfitResult>(`${this.base}/calculators/profit`, req);
  }

  ask(req: AdvisoryRequest): Observable<AdvisoryResponse> {
    return this.http.post<AdvisoryResponse>(`${this.base}/advisory/ask`, req);
  }
}
