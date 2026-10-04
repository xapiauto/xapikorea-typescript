import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { APIError, VERSION, XAPIKorea, XAPIKoreaError, type Car } from "../src/index.js";

type Handler = (url: URL, init: RequestInit) => Response | Promise<Response>;

function createClient(handler: Handler, timeoutMs?: number) {
  const fetch = vi.fn((input: string | URL | Request, init?: RequestInit) =>
    Promise.resolve(handler(new URL(String(input)), init ?? {}))
  );
  const client = new XAPIKorea("enc_test_key", {
    baseUrl: "https://api.example.test",
    fetch: fetch as typeof globalThis.fetch,
    ...(timeoutMs === undefined ? {} : { timeoutMs })
  });
  return { client, fetch };
}

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers }
  });
}

const accountPayload = {
  email: "developer@example.com",
  plan: "starter",
  key_label: "test",
  key_prefix: "enc_test",
  requests_this_month: 12,
  monthly_cap: 1_000,
  remaining: 988
};

describe("XAPIKorea", () => {
  it("requires an API key", () => {
    expect(() => new XAPIKorea("   ")).toThrow("apiKey is required");
  });

  it("uses the production API by default", async () => {
    const fetch = vi.fn((_input: string | URL | Request) => Promise.resolve(json(accountPayload)));
    const client = new XAPIKorea("enc_test_key", { fetch: fetch as typeof globalThis.fetch });

    await client.me();

    expect(String(fetch.mock.calls[0]?.[0])).toBe("https://api.xapikorea.com/v1/me");
  });

  it("keeps VERSION in sync with package.json", () => {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    expect(VERSION).toBe(pkg.version);
  });

  describe("me", () => {
    it("sends an authenticated request and returns the account", async () => {
      const { client } = createClient((url, init) => {
        const headers = new Headers(init.headers);
        expect(init.method).toBe("GET");
        expect(url.toString()).toBe("https://api.example.test/v1/me");
        expect(headers.get("X-API-Key")).toBe("enc_test_key");
        expect(headers.get("Accept")).toBe("application/json");
        expect(headers.get("User-Agent")).toBe(`xapikorea-typescript/${VERSION}`);
        return json(accountPayload);
      });

      await expect(client.me()).resolves.toEqual({
        email: "developer@example.com",
        plan: "starter",
        keyLabel: "test",
        keyPrefix: "enc_test",
        requestsThisMonth: 12,
        monthlyCap: 1_000,
        remaining: 988
      });
    });

    it.each([[["not", "an", "object"]], [{ email: "missing-required-fields@example.com" }]])(
      "rejects an unexpected response: %j",
      async (payload) => {
        const { client } = createClient(() => json(payload));
        await expect(client.me()).rejects.toThrow(
          new XAPIKoreaError("Unexpected response from GET /v1/me")
        );
      }
    );
  });

  describe("search", () => {
    it("sends filters and returns results", async () => {
      const { client } = createClient((url) => {
        expect(url.pathname).toBe("/v1/search");
        expect(Object.fromEntries(url.searchParams)).toEqual({
          brand: "hyundai",
          model: "avante",
          year_from: "2022",
          year_to: "2024",
          price_min: "10000000",
          price_max: "30000000",
          fuel_type: "gasoline",
          transmission: "auto",
          body_style: "suv",
          car_type: "Y",
          is_accident_free: "true",
          sort: "Price",
          page: "2",
          limit: "5",
          lang: "en"
        });
        return json({
          total_count: 1,
          page: 2,
          limit: 5,
          results: [
            {
              id: 41750571,
              manufacturer: "Hyundai",
              model: "Avante (Elantra)",
              badge: "2.0 N",
              badge_detail: null,
              year: "202209",
              mileage_km: 64806,
              price_krw: 20500000,
              price_eur: 13325.0,
              fuel_type: "Gasoline",
              transmission: "Automatic",
              location: "Incheon",
              thumbnail: "https://example.test/car.jpg",
              encar_url: "https://fem.encar.com/cars/detail/41750571"
            }
          ],
          next_page: null
        });
      });

      const response = await client.search({
        brand: "hyundai",
        model: "avante",
        yearFrom: 2022,
        yearTo: 2024,
        priceMin: 10_000_000,
        priceMax: 30_000_000,
        fuelType: "gasoline",
        transmission: "auto",
        bodyStyle: "suv",
        carType: "Y",
        isAccidentFree: true,
        sort: "Price",
        page: 2,
        limit: 5
      });

      expect(response).toEqual({
        totalCount: 1,
        page: 2,
        limit: 5,
        results: [
          {
            id: 41750571,
            manufacturer: "Hyundai",
            model: "Avante (Elantra)",
            badge: "2.0 N",
            badgeDetail: null,
            year: "202209",
            mileageKm: 64806,
            priceKrw: 20500000,
            priceEur: 13325.0,
            fuelType: "Gasoline",
            transmission: "Automatic",
            location: "Incheon",
            thumbnail: "https://example.test/car.jpg",
            encarUrl: "https://fem.encar.com/cars/detail/41750571"
          }
        ],
        nextPage: null
      });
    });

    it("sends only the defaults when called without filters", async () => {
      const { client } = createClient((url) => {
        expect(Object.fromEntries(url.searchParams)).toEqual({ page: "1", limit: "20", lang: "en" });
        return json({ total_count: 0, page: 1, limit: 20, results: [], next_page: null });
      });

      await expect(client.search()).resolves.toMatchObject({ totalCount: 0, results: [] });
    });

    it("rejects an unexpected response", async () => {
      const { client } = createClient(() =>
        json({ total_count: 1, page: 1, limit: 20, results: "not a list", next_page: null })
      );
      await expect(client.search()).rejects.toThrow("Unexpected response from GET /v1/search");
    });
  });

  describe("getCar", () => {
    it("returns vehicle details", async () => {
      const { client } = createClient((url) => {
        expect(url.pathname).toBe("/v1/cars/42662587");
        expect(Object.fromEntries(url.searchParams)).toEqual({ lang: "ko" });
        return json({
          id: 42662587,
          manufacturer: "ChevroletGMDaewoo",
          model: "트랙스 Crossover",
          badge: "1.2 RS",
          badge_detail: null,
          year: "202606",
          mileage_km: 21,
          price_krw: 25800000,
          price_eur: 16770.0,
          fuel_type: "Gasoline",
          transmission: "Automatic",
          location: "Daegu",
          thumbnail: "https://example.test/thumbnail.jpg",
          encar_url: "https://fem.encar.com/cars/detail/42662587",
          form_year: 2026,
          original_price_krw: 28510000,
          drive_type: null,
          engine_cc: "1199cc",
          seat_count: 5,
          doors: 5,
          origin_country: "South Korea",
          body_style: "SUV",
          color: "Black",
          vin: "KLALA582DTC112253",
          vehicle_no: "332우7403",
          vehicle_id: 42662055,
          vehicle_type: "CAR",
          inspection_available: true,
          insurance_available: true,
          is_rental: false,
          sale_type: "lease",
          lease_rent: {
            monthly_fee_krw: 500000,
            remaining_months: 12,
            deposit_krw: 3000000,
            advance_krw: null
          },
          photos: ["https://example.test/1.jpg", "https://example.test/2.jpg"],
          diagnosis_image_url: "https://example.test/diagnosis.jpg",
          options: ["Sunroof", "Navigation"],
          is_reserved: true,
          seizing_count: 0,
          pledge_count: 0,
          warranty: {
            company_name: null,
            body_months: 36,
            body_mileage_km: 60000,
            transmission_months: 60,
            transmission_mileage_km: 100000
          }
        });
      });

      const car = await client.getCar(42662587, { lang: "ko" });

      expect(car.id).toBe(42662587);
      expect(car.model).toBe("트랙스 Crossover");
      expect(car.driveType).toBeNull();
      expect(car.engineCc).toBe("1199cc");
      expect(car.inspectionAvailable).toBe(true);
      expect(car.photos).toEqual(["https://example.test/1.jpg", "https://example.test/2.jpg"]);
      expect(car.options).toEqual(["Sunroof", "Navigation"]);
      expect(car.leaseRent).toEqual({
        monthlyFeeKrw: 500000,
        remainingMonths: 12,
        depositKrw: 3000000,
        advanceKrw: null
      });
      expect(car.warranty).toEqual({
        companyName: null,
        bodyMonths: 36,
        bodyMileageKm: 60000,
        transmissionMonths: 60,
        transmissionMileageKm: 100000
      });
    });

    it("accepts a minimal response", async () => {
      const { client } = createClient(() => json({ id: 1, manufacturer: "Hyundai", model: "Sonata" }));

      const car = await client.getCar(1);

      expect(car).toMatchObject<Partial<Car>>({
        id: 1,
        manufacturer: "Hyundai",
        model: "Sonata",
        badge: null,
        inspectionAvailable: false,
        insuranceAvailable: false,
        leaseRent: null,
        photos: [],
        options: [],
        warranty: null
      });
    });

    it("rejects an unexpected response", async () => {
      const { client } = createClient(() =>
        json({ id: 1, manufacturer: "Hyundai", model: "Sonata", photos: "not a list" })
      );
      await expect(client.getCar(1)).rejects.toThrow("Unexpected response from GET /v1/cars/1");
    });

    it("exposes a not-found error", async () => {
      const { client } = createClient(() => json({ error: "Car not found" }, { status: 404 }));

      const error = await client.getCar(999).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(APIError);
      expect(error).toMatchObject({ message: "Car not found", status: 404 });
    });
  });

  describe("getInspection", () => {
    it("returns the report", async () => {
      const { client } = createClient((url) => {
        expect(url.pathname).toBe("/v1/cars/42662587/inspection");
        expect(Object.fromEntries(url.searchParams)).toEqual({ lang: "ko" });
        return json({
          available: true,
          is_rental: false,
          usage_history: ["Commercial Use"],
          had_accident: true,
          had_simple_repair: false,
          damage_severity: "minor",
          panel_damage: [{ panel: "Front Fender", damage: ["Replacement"], rank: "A" }],
          has_tuning: true,
          tuning_types: ["Suspension"],
          first_registration_date: "20260604",
          inspection_date: "20260901",
          inspection_grade: "Good",
          inspection_report_url: "https://example.test/inspection",
          inspection_report_print_url: "https://example.test/print"
        });
      });

      await expect(client.getInspection(42662587, { lang: "ko" })).resolves.toEqual({
        available: true,
        isRental: false,
        usageHistory: ["Commercial Use"],
        hadAccident: true,
        hadSimpleRepair: false,
        damageSeverity: "minor",
        panelDamage: [{ panel: "Front Fender", damage: ["Replacement"], rank: "A" }],
        hasTuning: true,
        tuningTypes: ["Suspension"],
        firstRegistrationDate: "20260604",
        inspectionDate: "20260901",
        inspectionGrade: "Good",
        inspectionReportUrl: "https://example.test/inspection",
        inspectionReportPrintUrl: "https://example.test/print"
      });
    });

    it("preserves the unavailable state", async () => {
      const { client } = createClient(() => json({ available: false }));

      const report = await client.getInspection(1);

      expect(report.available).toBe(false);
      expect(report.hadAccident).toBeNull();
      expect(report.panelDamage).toEqual([]);
    });

    it("rejects an unexpected response", async () => {
      const { client } = createClient(() => json({ available: true, panel_damage: "not a list" }));
      await expect(client.getInspection(1)).rejects.toThrow(
        "Unexpected response from GET /v1/cars/1/inspection"
      );
    });
  });

  describe("errors", () => {
    it("exposes API error details", async () => {
      const { client } = createClient(() =>
        json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": "30" } })
      );

      const error = await client.me().catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(APIError);
      expect(error).toBeInstanceOf(XAPIKoreaError);
      expect(error).toMatchObject({
        message: "Rate limit exceeded",
        status: 429,
        body: { error: "Rate limit exceeded" },
        retryAfter: 30
      });
    });

    it("preserves a non-JSON error body", async () => {
      const { client } = createClient(() => new Response("upstream unavailable", { status: 502 }));

      const error = await client.me().catch((caught: unknown) => caught);

      expect(error).toMatchObject({
        message: "API request failed with status 502",
        status: 502,
        body: "upstream unavailable",
        retryAfter: null
      });
    });

    it("wraps connection failures", async () => {
      const { client } = createClient(() => {
        throw new TypeError("fetch failed");
      });
      await expect(client.me()).rejects.toThrow(new XAPIKoreaError("Could not connect to XAPI Korea"));
    });

    it("times out slow requests", async () => {
      const { client } = createClient(
        (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
          }),
        10
      );
      await expect(client.me()).rejects.toThrow(new XAPIKoreaError("Request timed out"));
    });

    it("passes through a caller's abort", async () => {
      const controller = new AbortController();
      const { client } = createClient(
        (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
            controller.abort();
          })
      );

      const error = await client.me({ signal: controller.signal }).catch((caught: unknown) => caught);

      expect(error).not.toBeInstanceOf(XAPIKoreaError);
      expect(error).toMatchObject({ name: "AbortError" });
    });
  });
});
