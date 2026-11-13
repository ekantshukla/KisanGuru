/** Hindi and English are written by hand; `local` is the server's (cached) translation into the chosen language. */
export interface LocalizedText { hi: string; en: string; local?: string | null; }

export interface Scheme {
  id: string;
  category: string;
  name: LocalizedText;
  summary: LocalizedText;
  benefits: LocalizedText[];
  howToApply: LocalizedText[];
  website: string;
  helpline: string | null;
}

export interface Crop {
  id: string;
  season: 'kharif' | 'rabi' | 'zaid';
  name: LocalizedText;
  sowingTime: LocalizedText;
  durationMinDays: number;
  durationMaxDays: number;
  seedRate: LocalizedText;
  irrigation: LocalizedText;
  npkPerAcre: { n: number; p: number; k: number };
  tips: LocalizedText[];
}

export interface Helpline { id: string; name: LocalizedText; number: string; purpose: LocalizedText; }

export interface MandiPrice {
  state: string; district: string; market: string; commodity: string; variety: string;
  arrivalDate: string; minPrice: number; maxPrice: number; modalPrice: number;
}

export interface MandiResult { isSample: boolean; source: string; prices: MandiPrice[]; }

export interface FertilizerRequest { areaAcres: number; n: number; p: number; k: number; }
export interface FertilizerResult {
  dapKg: number; ureaKg: number; mopKg: number;
  dapBags: number; ureaBags: number; mopBags: number; note: string;
}

export interface LoanRequest { principal: number; months: number; annualRatePercent: number; promptRepayment: boolean; }
export interface LoanResult { effectiveRatePercent: number; interest: number; totalRepayment: number; }

export interface ProfitRequest { areaAcres: number; yieldQuintalPerAcre: number; pricePerQuintal: number; costPerAcre: number; }
export interface ProfitResult {
  totalYieldQuintal: number; grossIncome: number; totalCost: number; netProfit: number; profitPerAcre: number;
}

export interface ChatTurn { role: 'user' | 'assistant'; text: string; }

export interface AdvisoryRequest {
  question: string; language: string; imageBase64: string | null; imageMediaType: string | null; location: string | null;
  history?: ChatTurn[];
}

/** The farmer's place. District is always set; tehsil and village are optional. */
export interface FarmLocation {
  state: string;          // English, e.g. "Uttar Pradesh"
  stateHi: string;
  stateCode: number;      // LGD
  district: string;
  districtCode: number;   // LGD
  latitude: number;       // district centre (or GPS point)
  longitude: number;
  approx?: boolean;       // district created after 2011: centre is rough
  tehsil?: string;
  tehsilCode?: number;
  village?: string;
  villageLocal?: string;  // village name in the local script, where LGD has it
  villageCode?: number;
  viaGps?: boolean;
}

export interface Subdistrict { code: number; name: string; }
export interface Village { code: number; name: string; local: string | null; }

export interface CurrentWeather { temperature: number; humidity: number; weatherCode: number; windSpeed: number; precipitation: number; }
export interface WeatherDay {
  date: string; weatherCode: number; tempMax: number; tempMin: number; rainMm: number; rainChance: number; windMax: number;
}
export interface FarmAlert { level: 'danger' | 'warning' | 'info'; icon: string; message: LocalizedText; }
export interface WeatherForecast {
  current: CurrentWeather; days: WeatherDay[]; alerts: FarmAlert[]; rainNext7DaysMm: number; source: string;
  placeLevel?: 'village' | 'tehsil' | 'district' | null; placeName?: string | null;
}
export interface AdvisoryResponse { answer: string; aiEnabled: boolean; }

// ---------- My fields: crop calendar from sowing to harvest ----------
export type TaskKind = 'prep' | 'sowing' | 'fertilizer' | 'irrigation' | 'weeding' | 'protection' | 'scouting' | 'harvest';

export interface PlanTask {
  id: string;
  kind: TaskKind;
  date: string;              // yyyy-MM-dd
  endDate?: string | null;   // last good day for this work
  day: number;               // days after sowing (after transplanting for paddy)
  title: LocalizedText;
  details: LocalizedText;
  amounts?: { ureaKg?: number | null; dapKg?: number | null; mopKg?: number | null } | null;
  weather?: 'rain' | 'water' | 'wind' | null;
  /** What this field's soil changes about this task (watering, urea). */
  soilNote?: LocalizedText | null;
}

export interface FieldPlan {
  cropId: string;
  cropName: LocalizedText;
  sownOn: string;
  dayZeroIsTransplanting: boolean;
  harvestFrom: string;
  harvestTo: string;
  durationDays: number;
  stages: { from: number; to: number; name: LocalizedText }[];
  tasks: PlanTask[];
  soil?: SoilType | null;
  soilName?: LocalizedText | null;
  soilTip?: LocalizedText | null;
}

/** Soil of a field: black (mar, heavy), mixed (kabar), loam (yellow / padua), sandy (light), red (stony / rakar). */
export type SoilType = 'black' | 'mixed' | 'loam' | 'sandy' | 'red';
export const SOIL_TYPES: SoilType[] = ['black', 'mixed', 'loam', 'sandy', 'red'];

/** One of the farmer's fields (khet), e.g. "Kuen wala khet", with its own area, water source and soil. */
export interface FarmPlot {
  id: string;
  name: string;
  areaAcres: number;
  irrigated: boolean;
  soil?: SoilType | null;    // null = not sure
}

/** A crop sown in one of the farmer's fields. Saved on the phone, and in the account when logged in (without the plan). */
export interface FarmField {
  id: string;
  plotId: string;
  cropId: string;
  sownOn: string;
  areaAcres: number;
  irrigated: boolean;
  done: string[];            // task ids marked done
  plan?: FieldPlan;
  planLang?: string;
  planAt?: number;           // when the plan (and its weather flags) was fetched
}

/** What can be sown in an empty field now (or within 30 days). */
export interface CropSuggestion {
  cropId: string;
  name: LocalizedText;
  season: string;
  sowFrom: string;
  sowTo: string;
  status: 'now' | 'soon';
  water: 'low' | 'medium' | 'high';
  needsIrrigation: boolean;
  durationMinDays: number;
  durationMaxDays: number;
  soilFit: 'good' | 'ok' | 'poor';
}

/** Sowing suggestions worked out for the farmer's region (from state/district) and a field's water and soil. */
export interface SuggestResponse {
  region: string;
  regionName: LocalizedText;
  regionTip?: LocalizedText | null;
  regionKnown: boolean;
  items: CropSuggestion[];
}
