import { APIError, XAPIKoreaError } from "./errors.js";
import {
  isObject,
  parseAccountInfo,
  parseCar,
  parseInspectionReport,
  parseSearchResponse,
  type AccountInfo,
  type Car,
  type InspectionReport,
  type SearchResponse
} from "./models.js";
import { VERSION } from "./version.js";

export interface XAPIKoreaOptions {
  /** Defaults to https://api.xapikorea.com. */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to 30 seconds. */
  timeoutMs?: number;
  /** Custom fetch implementation, for example for tests or proxies. */
  fetch?: typeof globalThis.fetch;
}

export interface RequestOptions {
  /** Cancels the request when aborted. */
  signal?: AbortSignal;
}

export interface LanguageOptions extends RequestOptions {
  /** Response language. Defaults to "en". */
  lang?: string;
}

export interface SearchParams extends LanguageOptions {
  brand?: string;
  model?: string;
  yearFrom?: number;
  yearTo?: number;
  /** Minimum price in KRW. */
  priceMin?: number;
  /** Maximum price in KRW. */
  priceMax?: number;
  fuelType?: string;
  transmission?: string;
  bodyStyle?: string;
  carType?: string;
  isAccidentFree?: boolean;
  sort?: string;
  /** Defaults to 1. */
  page?: number;
  /** Defaults to 20. */
  limit?: number;
}

type QueryValue = string | number | boolean | undefined;

export class XAPIKorea {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetcher: typeof globalThis.fetch;

  constructor(apiKey: string, options: XAPIKoreaOptions = {}) {
    if (typeof apiKey !== "string" || !apiKey.trim()) {
      throw new TypeError("apiKey is required");
    }

    this.apiKey = apiKey;
    this.baseUrl = (options.baseUrl ?? "https://api.xapikorea.com").replace(/\/+$/, "") + "/";
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetcher = options.fetch ?? globalThis.fetch;
  }

  /** Returns the account, plan and monthly usage for this API key. */
  async me(options: RequestOptions = {}): Promise<AccountInfo> {
    const data = await this.request("v1/me", {}, options.signal);
    return parse("v1/me", data, parseAccountInfo);
  }

  /** Searches current Encar listings. */
  async search(params: SearchParams = {}): Promise<SearchResponse> {
    const data = await this.request(
      "v1/search",
      {
        brand: params.brand,
        model: params.model,
        year_from: params.yearFrom,
        year_to: params.yearTo,
        price_min: params.priceMin,
        price_max: params.priceMax,
        fuel_type: params.fuelType,
        transmission: params.transmission,
        body_style: params.bodyStyle,
        car_type: params.carType,
        is_accident_free: params.isAccidentFree,
        sort: params.sort,
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        lang: params.lang ?? "en"
      },
      params.signal
    );
    return parse("v1/search", data, parseSearchResponse);
  }

  /** Returns full vehicle details, options and photos for one listing. */
  async getCar(carId: number, options: LanguageOptions = {}): Promise<Car> {
    const path = `v1/cars/${encodeURIComponent(carId)}`;
    const data = await this.request(path, { lang: options.lang ?? "en" }, options.signal);
    return parse(path, data, parseCar);
  }

  /** Returns the vehicle's inspection report. */
  async getInspection(carId: number, options: LanguageOptions = {}): Promise<InspectionReport> {
    const path = `v1/cars/${encodeURIComponent(carId)}/inspection`;
    const data = await this.request(path, { lang: options.lang ?? "en" }, options.signal);
    return parse(path, data, parseInspectionReport);
  }

  private async request(
    path: string,
    params: Record<string, QueryValue>,
    signal?: AbortSignal
  ): Promise<unknown> {
    const url = new URL(path, this.baseUrl);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const timeout = AbortSignal.timeout(this.timeoutMs);
    let response: Response;
    let text: string;
    try {
      response = await this.fetcher(url, {
        method: "GET",
        headers: {
          "X-API-Key": this.apiKey,
          Accept: "application/json",
          "User-Agent": `xapikorea-typescript/${VERSION}`
        },
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout
      });
      text = await response.text();
    } catch (error) {
      // A caller's own abort is passed through untouched, like any fetch.
      if (signal?.aborted) throw error;
      if (timeout.aborted) throw new XAPIKoreaError("Request timed out", { cause: error });
      throw new XAPIKoreaError("Could not connect to XAPI Korea", { cause: error });
    }

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = text || null;
    }

    if (!response.ok) {
      const message =
        isObject(body) && typeof body.error === "string"
          ? body.error
          : `API request failed with status ${response.status}`;
      const retryAfter = response.headers.get("Retry-After");
      throw new APIError(message, {
        status: response.status,
        body,
        retryAfter: retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) : null
      });
    }

    return body;
  }
}

function parse<T>(path: string, data: unknown, parser: (data: Record<string, unknown>) => T): T {
  const error = new XAPIKoreaError(`Unexpected response from GET /${path}`);
  if (!isObject(data)) throw error;

  try {
    return parser(data);
  } catch (cause) {
    throw new XAPIKoreaError(error.message, { cause });
  }
}
