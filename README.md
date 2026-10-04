# Encar API TypeScript & Node.js Client — XAPI Korea

[![npm](https://img.shields.io/npm/v/xapikorea)](https://www.npmjs.com/package/xapikorea)

TypeScript SDK for the XAPI Korea **Encar API**. Search used-car listings from Encar
(Korea's largest used-car marketplace) and get prices, specs, photos and
inspection history, with English translations of supported fields.

> XAPI Korea is an independent service. It is not affiliated with or endorsed by Encar.

- API docs: https://xapikorea.com/docs
- Free API key (no credit card): https://xapikorea.com/signup
- Python SDK: https://pypi.org/project/xapikorea/

## Installation

Node.js 20.3 or newer is required. The package has no runtime dependencies.

```bash
npm install xapikorea
```

## Usage

Create a client with your API key. Keep the key on your server: it is secret, so
never ship it in browser code.

```ts
import { XAPIKorea } from "xapikorea";

const client = new XAPIKorea(process.env.XAPIKOREA_API_KEY!);

const account = await client.me();
console.log(account.email, account.plan, account.remaining);
```

Search the current inventory:

```ts
const results = await client.search({
  brand: "hyundai",
  yearFrom: 2022,
  priceMax: 30_000_000,
  limit: 5
});

for (const car of results.results) {
  console.log(car.manufacturer, car.model, car.priceKrw);
}
```

Retrieve full vehicle details and photos:

```ts
const car = await client.getCar(42662587);

console.log(car.manufacturer, car.model, car.priceKrw);
console.log(car.photos.join("\n"));
```

Retrieve the vehicle's inspection report:

```ts
const inspection = await client.getInspection(42662587);

if (!inspection.available) {
  console.log("No inspection sheet is available");
} else if (inspection.hadAccident) {
  console.log("The inspection sheet reports accident history");
} else {
  console.log("No accident history reported on the inspection sheet");
}
```

Responses use camelCase field names (`priceKrw`, `mileageKm`). All response types
are exported, for example `SearchResponse`, `CarSummary`, `Car` and
`InspectionReport`.

## Search filters

| Option | Type | Notes |
| --- | --- | --- |
| `brand`, `model` | string | For example `"hyundai"`, `"avante"` |
| `yearFrom`, `yearTo` | number | Registration year |
| `priceMin`, `priceMax` | number | Price in KRW |
| `fuelType`, `transmission`, `bodyStyle`, `carType` | string | |
| `isAccidentFree` | boolean | |
| `sort` | string | |
| `page` | number | Defaults to `1` |
| `limit` | number | Defaults to `20` |
| `lang` | string | Defaults to `"en"` |

`getCar` and `getInspection` also accept `{ lang }`.

## Errors

```ts
import { APIError, XAPIKoreaError } from "xapikorea";

try {
  await client.getCar(999);
} catch (error) {
  if (error instanceof APIError) {
    console.log(error.status, error.message, error.retryAfter);
  } else if (error instanceof XAPIKoreaError) {
    console.log(error.message); // timeout, connection or unexpected response
  }
}
```

- `APIError`: the API returned an error status. It has `status`, `body`, and
  `retryAfter` (seconds, from the `Retry-After` header, or `null`).
- `XAPIKoreaError`: the request timed out, could not connect, or the response
  had an unexpected shape. `APIError` extends it.

## Options

```ts
const client = new XAPIKorea(apiKey, {
  baseUrl: "http://localhost:8000", // defaults to https://api.xapikorea.com
  timeoutMs: 10_000,                // defaults to 30 seconds
  fetch: customFetch                // defaults to the global fetch
});
```

Every method accepts an `AbortSignal` to cancel the request:

```ts
const controller = new AbortController();
const results = await client.search({ brand: "kia", signal: controller.signal });
```

The client uses the standard `fetch` API, so it may also run in other
fetch-based runtimes. Only Node.js is tested.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

Run a live request against the API after building:

```bash
XAPIKOREA_API_KEY=enc_your_key node examples/quickstart.mjs
```

## License

This project is licensed under the [MIT License](https://github.com/xapiauto/xapikorea-typescript/blob/main/LICENSE).

## Support

For bugs and feature requests, [open a GitHub issue](https://github.com/xapiauto/xapikorea-typescript/issues).
