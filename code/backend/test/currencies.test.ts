import test from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/app.js";
import { createCurrencyCatalogue } from "../src/currencies.js";
import type { JsonFetcher } from "../src/http.js";

const catalogue = { usd: "US Dollar", kes: "Kenyan Shilling", eur: "Euro", btc: "Bitcoin", xau: "Gold Ounce" };

test("currency catalogue uses the free API, retains ISO fiat metadata and is cached daily", async () => {
  const calls: string[] = [];
  const http: JsonFetcher = async (provider, url, headers) => {
    assert.equal(provider, "currencies");
    assert.equal(headers, undefined);
    calls.push(url.href);
    return catalogue;
  };
  const load = createCurrencyCatalogue(http);
  const first = await load();
  const second = await load();
  assert.equal(first.source, "currency-api");
  assert.ok(first.fetchedAt);
  assert.equal(calls.length, 1);
  assert.ok(calls[0]?.startsWith("https://cdn.jsdelivr.net/"));
  assert.deepEqual(second, first);
  assert.ok(first.currencies.some((currency) => currency.code === "KES" && currency.name.includes("Kenyan") && currency.symbol));
  assert.ok(!first.currencies.some((currency) => ["BTC", "XAU"].includes(currency.code)));
});

test("currency catalogue uses the documented Cloudflare fallback when the CDN fails", async () => {
  const calls: string[] = [];
  const load = createCurrencyCatalogue(async (_provider, url) => {
    calls.push(url.hostname);
    if (url.hostname === "cdn.jsdelivr.net") throw new Error("CDN unavailable");
    return catalogue;
  });
  assert.equal((await load()).source, "currency-api");
  assert.deepEqual(calls, ["cdn.jsdelivr.net", "latest.currency-api.pages.dev"]);
});

test("invalid or unavailable currency responses retain a full built-in ISO catalogue", async () => {
  const load = createCurrencyCatalogue(async () => ({ unexpected: { object: true } }));
  const result = await load();
  assert.equal(result.source, "built-in");
  assert.equal(result.fetchedAt, null);
  assert.ok(result.currencies.length > 100);
  assert.ok(result.currencies.some((currency) => currency.code === "USD"));
  assert.ok(result.currencies.some((currency) => currency.code === "KES"));
});

test("currency route works independently of job-provider configuration", async () => {
  const app = await buildApp([], { currencyCatalogue: createCurrencyCatalogue(async () => catalogue) });
  try {
    const response = await app.inject("/api/v1/currencies");
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().success, true);
    assert.equal(response.json().data.source, "currency-api");
    assert.ok(response.json().data.currencies.some((currency: { code: string }) => currency.code === "KES"));
  } finally { await app.close(); }
});
