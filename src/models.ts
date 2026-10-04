// Response models mirror the Python SDK's dataclasses, with camelCase field
// names. The API sends snake_case JSON; each parse function maps one object
// and throws a TypeError when a required field is missing or a list or nested
// object has the wrong shape. The client turns that into an XAPIKoreaError.

type Json = Record<string, unknown>;

export interface AccountInfo {
  email: string;
  plan: string;
  keyLabel: string;
  keyPrefix: string;
  requestsThisMonth: number;
  monthlyCap: number | null;
  remaining: number | null;
}

export interface CarSummary {
  id: number;
  manufacturer: string;
  model: string;
  badge: string;
  badgeDetail: string | null;
  /** Registration year and month as YYYYMM, for example "202209". */
  year: string;
  mileageKm: number;
  priceKrw: number;
  priceEur: number;
  fuelType: string;
  transmission: string;
  location: string;
  thumbnail: string;
  encarUrl: string;
}

export interface SearchResponse {
  totalCount: number;
  page: number;
  limit: number;
  results: readonly CarSummary[];
  nextPage: number | null;
}

export interface LeaseRentTerms {
  monthlyFeeKrw: number | null;
  remainingMonths: number | null;
  depositKrw: number | null;
  advanceKrw: number | null;
}

export interface Warranty {
  companyName: string | null;
  bodyMonths: number | null;
  bodyMileageKm: number | null;
  transmissionMonths: number | null;
  transmissionMileageKm: number | null;
}

export interface Car {
  id: number;
  manufacturer: string;
  model: string;
  badge: string | null;
  badgeDetail: string | null;
  year: string | null;
  mileageKm: number | null;
  priceKrw: number | null;
  priceEur: number | null;
  fuelType: string | null;
  transmission: string | null;
  location: string | null;
  thumbnail: string | null;
  encarUrl: string | null;
  formYear: number | null;
  originalPriceKrw: number | null;
  driveType: string | null;
  engineCc: string | null;
  seatCount: number | null;
  doors: number | null;
  originCountry: string | null;
  bodyStyle: string | null;
  color: string | null;
  vin: string | null;
  vehicleNo: string | null;
  vehicleId: number | null;
  vehicleType: string | null;
  inspectionAvailable: boolean;
  insuranceAvailable: boolean;
  isRental: boolean | null;
  saleType: string | null;
  leaseRent: LeaseRentTerms | null;
  photos: readonly string[];
  diagnosisImageUrl: string | null;
  options: readonly string[];
  isReserved: boolean | null;
  seizingCount: number | null;
  pledgeCount: number | null;
  warranty: Warranty | null;
}

export interface PanelDamage {
  panel: string;
  damage: readonly string[];
  rank: string | null;
}

export interface InspectionReport {
  available: boolean;
  isRental: boolean | null;
  usageHistory: readonly string[];
  hadAccident: boolean | null;
  hadSimpleRepair: boolean | null;
  damageSeverity: string | null;
  panelDamage: readonly PanelDamage[];
  hasTuning: boolean | null;
  tuningTypes: readonly string[];
  firstRegistrationDate: string | null;
  inspectionDate: string | null;
  inspectionGrade: string | null;
  inspectionReportUrl: string | null;
  inspectionReportPrintUrl: string | null;
}

export function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function required<T>(data: Json, key: string): T {
  if (!(key in data)) throw new TypeError(`${key} is required`);
  return data[key] as T;
}

function optional<T>(data: Json, key: string): T | null {
  return (data[key] ?? null) as T | null;
}

function list<T>(data: Json, key: string): T[] {
  const value = data[key] ?? [];
  if (!Array.isArray(value)) throw new TypeError(`${key} must be a list`);
  return value as T[];
}

function object(data: Json, key: string): Json | null {
  const value = data[key] ?? null;
  if (value !== null && !isObject(value)) throw new TypeError(`${key} must be an object`);
  return value;
}

export function parseAccountInfo(data: Json): AccountInfo {
  return {
    email: required(data, "email"),
    plan: required(data, "plan"),
    keyLabel: required(data, "key_label"),
    keyPrefix: required(data, "key_prefix"),
    requestsThisMonth: required(data, "requests_this_month"),
    monthlyCap: optional(data, "monthly_cap"),
    remaining: optional(data, "remaining")
  };
}

export function parseCarSummary(data: Json): CarSummary {
  return {
    id: required(data, "id"),
    manufacturer: required(data, "manufacturer"),
    model: required(data, "model"),
    badge: required(data, "badge"),
    badgeDetail: optional(data, "badge_detail"),
    year: required(data, "year"),
    mileageKm: required(data, "mileage_km"),
    priceKrw: required(data, "price_krw"),
    priceEur: required(data, "price_eur"),
    fuelType: required(data, "fuel_type"),
    transmission: required(data, "transmission"),
    location: required(data, "location"),
    thumbnail: required(data, "thumbnail"),
    encarUrl: required(data, "encar_url")
  };
}

export function parseSearchResponse(data: Json): SearchResponse {
  const results = required<unknown>(data, "results");
  if (!Array.isArray(results) || !results.every(isObject)) {
    throw new TypeError("results must be a list of objects");
  }

  return {
    totalCount: required(data, "total_count"),
    page: required(data, "page"),
    limit: required(data, "limit"),
    results: results.map(parseCarSummary),
    nextPage: required(data, "next_page")
  };
}

function parseLeaseRentTerms(data: Json): LeaseRentTerms {
  return {
    monthlyFeeKrw: optional(data, "monthly_fee_krw"),
    remainingMonths: optional(data, "remaining_months"),
    depositKrw: optional(data, "deposit_krw"),
    advanceKrw: optional(data, "advance_krw")
  };
}

function parseWarranty(data: Json): Warranty {
  return {
    companyName: optional(data, "company_name"),
    bodyMonths: optional(data, "body_months"),
    bodyMileageKm: optional(data, "body_mileage_km"),
    transmissionMonths: optional(data, "transmission_months"),
    transmissionMileageKm: optional(data, "transmission_mileage_km")
  };
}

export function parseCar(data: Json): Car {
  const leaseRent = object(data, "lease_rent");
  const warranty = object(data, "warranty");

  return {
    id: required(data, "id"),
    manufacturer: required(data, "manufacturer"),
    model: required(data, "model"),
    badge: optional(data, "badge"),
    badgeDetail: optional(data, "badge_detail"),
    year: optional(data, "year"),
    mileageKm: optional(data, "mileage_km"),
    priceKrw: optional(data, "price_krw"),
    priceEur: optional(data, "price_eur"),
    fuelType: optional(data, "fuel_type"),
    transmission: optional(data, "transmission"),
    location: optional(data, "location"),
    thumbnail: optional(data, "thumbnail"),
    encarUrl: optional(data, "encar_url"),
    formYear: optional(data, "form_year"),
    originalPriceKrw: optional(data, "original_price_krw"),
    driveType: optional(data, "drive_type"),
    engineCc: optional(data, "engine_cc"),
    seatCount: optional(data, "seat_count"),
    doors: optional(data, "doors"),
    originCountry: optional(data, "origin_country"),
    bodyStyle: optional(data, "body_style"),
    color: optional(data, "color"),
    vin: optional(data, "vin"),
    vehicleNo: optional(data, "vehicle_no"),
    vehicleId: optional(data, "vehicle_id"),
    vehicleType: optional(data, "vehicle_type"),
    inspectionAvailable: optional<boolean>(data, "inspection_available") ?? false,
    insuranceAvailable: optional<boolean>(data, "insurance_available") ?? false,
    isRental: optional(data, "is_rental"),
    saleType: optional(data, "sale_type"),
    leaseRent: leaseRent === null ? null : parseLeaseRentTerms(leaseRent),
    photos: list(data, "photos"),
    diagnosisImageUrl: optional(data, "diagnosis_image_url"),
    options: list(data, "options"),
    isReserved: optional(data, "is_reserved"),
    seizingCount: optional(data, "seizing_count"),
    pledgeCount: optional(data, "pledge_count"),
    warranty: warranty === null ? null : parseWarranty(warranty)
  };
}

function parsePanelDamage(data: Json): PanelDamage {
  return {
    panel: required(data, "panel"),
    damage: list(data, "damage"),
    rank: optional(data, "rank")
  };
}

export function parseInspectionReport(data: Json): InspectionReport {
  const panelDamage = list<unknown>(data, "panel_damage");
  if (!panelDamage.every(isObject)) {
    throw new TypeError("panel_damage must be a list of objects");
  }

  return {
    available: optional<boolean>(data, "available") ?? true,
    isRental: optional(data, "is_rental"),
    usageHistory: list(data, "usage_history"),
    hadAccident: optional(data, "had_accident"),
    hadSimpleRepair: optional(data, "had_simple_repair"),
    damageSeverity: optional(data, "damage_severity"),
    panelDamage: panelDamage.map(parsePanelDamage),
    hasTuning: optional(data, "has_tuning"),
    tuningTypes: list(data, "tuning_types"),
    firstRegistrationDate: optional(data, "first_registration_date"),
    inspectionDate: optional(data, "inspection_date"),
    inspectionGrade: optional(data, "inspection_grade"),
    inspectionReportUrl: optional(data, "inspection_report_url"),
    inspectionReportPrintUrl: optional(data, "inspection_report_print_url")
  };
}
