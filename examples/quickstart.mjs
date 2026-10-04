// Live smoke test: one account call, one search, one car and its inspection.
// Run after `npm run build`:
//   XAPIKOREA_API_KEY=enc_your_key node examples/quickstart.mjs
import { XAPIKorea } from "../dist/index.js";

const apiKey = process.env.XAPIKOREA_API_KEY;
if (!apiKey) {
  console.error("Set XAPIKOREA_API_KEY first.");
  process.exit(1);
}

const client = new XAPIKorea(apiKey, process.env.XAPIKOREA_BASE_URL ? { baseUrl: process.env.XAPIKOREA_BASE_URL } : {});

const account = await client.me();
console.log(`Account: ${account.email} (${account.plan}), ${account.remaining ?? "unlimited"} requests left`);

const results = await client.search({ brand: "hyundai", limit: 3 });
console.log(`Search: ${results.totalCount} matching listings`);
for (const car of results.results) {
  console.log(`  ${car.id}  ${car.manufacturer} ${car.model}  ${car.priceKrw.toLocaleString()} KRW`);
}

const first = results.results[0];
if (first) {
  const car = await client.getCar(first.id);
  console.log(`Car ${car.id}: ${car.photos.length} photos, ${car.options.length} options`);

  const inspection = await client.getInspection(first.id);
  console.log(`Inspection: available=${inspection.available}, hadAccident=${inspection.hadAccident}`);
}
