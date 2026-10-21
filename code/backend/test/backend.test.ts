import test from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/app.js";
import { Cache } from "../src/cache.js";
import { createProviders, type Provider } from "../src/providers.js";
import { createJsonFetcher, type JsonFetcher } from "../src/http.js";
import { deduplicate, makeJob } from "../src/normalize.js";
import { searchSchema } from "../src/search-schema.js";
import { SearchService } from "../src/search.js";

const created = "2026-01-01T00:00:00Z";
function job(overrides: Partial<NonNullable<ReturnType<typeof makeJob>>> = {}) {
  return {
    ...makeJob({
      externalId: "1", title: "Engineer", company: "Example", location: "Anywhere", remote: true,
      eligibility: "Anywhere", category: "IT Jobs", contract_type: "full_time",
      description: "TypeScript developer", created, redirect_url: "https://jobicy.com/jobs/1",
      source: { provider: "jobicy", name: "Jobicy", url: "https://jobicy.com/jobs/1", applyUrl: "https://jobicy.com/jobs/1" },
    })!, ...overrides,
  };
}
function provider(jobs = [job()]): Provider {
  return { id: "jobicy", name: "Jobicy", enabled: true, load: async () => ({ jobs, limited: false, fetchedAt: created }) };
}
const himalayasItem = {
  guid: "https://himalayas.app/companies/example/jobs/engineer", title: "Engineer", companyName: "Example",
  description: "<p>TypeScript &amp; Node</p><script>bad()</script>",
  applicationLink: "https://himalayas.app/companies/example/jobs/engineer?utm_source=api",
  pubDate: 1767225600, expiryDate: 2100000000, locationRestrictions: [], timezoneRestrictions: [3],
  employmentType: "Contractor", categories: ["Software Engineer"], currency: "USD", salaryPeriod: "hourly", minSalary: 20,
};
const jobicyItem = {
  id: 1, url: "https://jobicy.com/jobs/1", jobTitle: "Engineer", companyName: "Example",
  jobGeo: "Anywhere", jobDescription: "TypeScript", pubDate: created, jobIndustry: ["Software Engineering"], jobType: ["Full-Time"],
};

test("search endpoint validates types, limits, country and salary ranges before calling providers", async () => {
  let calls = 0;
  const app = await buildApp([{ ...provider(), load: async () => { calls++; throw new Error("not called"); } }]);
  try {
    for (const body of [{ page: -1 }, { keyword: [] }, { country_code: "../../" }, { salaryMin: "9", salaryMax: "2" }, { url: "http://localhost" }]) {
      const response = await app.inject({ method: "POST", url: "/api/v1/jobs/search", payload: body });
      assert.equal(response.statusCode, 400);
      assert.equal(response.json().error, "INVALID_SEARCH");
    }
    assert.equal(calls, 0);
  } finally { await app.close(); }
});

test("HTTP routes return normalized data, partial status, and honest loaded counts", async () => {
  const failing: Provider = { id: "himalayas", name: "Himalayas", enabled: true, load: async () => { throw new Error("secret upstream details"); } };
  const app = await buildApp([provider(), failing]);
  try {
    assert.equal((await app.inject("/health")).statusCode, 200);
    const response = await app.inject({ method: "POST", url: "/api/v1/jobs/search", payload: {} });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().data.countLabel, "loaded matches");
    assert.equal(response.json().data.partial, true);
    assert.equal(response.json().data.jobs.length, 1);
    assert.ok(!response.body.includes("secret upstream details"));
    assert.equal((await app.inject("/api/missing")).statusCode, 404);
  } finally { await app.close(); }
});

test("all providers down returns 503 rather than successful empty results", async () => {
  const app = await buildApp([{ ...provider(), load: async () => { throw new Error("down"); } }]);
  try {
    const response = await app.inject({ method: "POST", url: "/api/v1/jobs/search", payload: {} });
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().error, "PROVIDERS_UNAVAILABLE");
  } finally { await app.close(); }
});

test("rate limits return the application error envelope", async () => {
  const app = await buildApp([provider()], { rateMax: 1 });
  try {
    await app.inject({ method: "POST", url: "/api/v1/jobs/search", payload: {} });
    const response = await app.inject({ method: "POST", url: "/api/v1/jobs/search", payload: {} });
    assert.equal(response.statusCode, 429);
    assert.equal(response.json().error, "RATE_LIMITED");
    assert.ok(response.headers["retry-after"]);
  } finally { await app.close(); }
});

test("Kenya eligibility includes worldwide and EMEA, but excludes US-only and unknown", async () => {
  const jobs = [job(), job({ id: "emea", eligibility: "EMEA" }), job({ id: "kenya", eligibility: "Kenya" }),
    job({ id: "us", eligibility: "USA" }), job({ id: "unknown", eligibility: "Not specified" })];
  const result = await new SearchService([provider(jobs)]).search(searchSchema.parse({ country_code: "ke" }));
  assert.deepEqual(result.jobs.map((entry) => entry.id), [jobs[0]!.id, "emea", "kenya"]);
});

test("a forged forwarded chain cannot bypass limits behind the single trusted proxy", async () => {
  const app = await buildApp([provider()], { rateMax: 1 });
  try {
    await app.inject({ method: "POST", url: "/api/v1/jobs/search", payload: {}, headers: { "x-forwarded-for": "1.1.1.1, 192.0.2.10" } });
    const response = await app.inject({ method: "POST", url: "/api/v1/jobs/search", payload: {}, headers: { "x-forwarded-for": "2.2.2.2, 192.0.2.10" } });
    assert.equal(response.statusCode, 429);
  } finally { await app.close(); }
});

test("salary comparisons require the selected currency and period", async () => {
  const jobs = [job({ id: "usd", salary_min: 50_000, salary_currency: "USD", salary_period: "annual" }),
    job({ id: "hourly", salary_min: 100, salary_currency: "USD", salary_period: "hourly" }),
    job({ id: "kes", salary_min: 1_000_000, salary_currency: "KES", salary_period: "annual" }), job()];
  const result = await new SearchService([provider(jobs)]).search(searchSchema.parse({ sort: "salary_desc" }));
  assert.deepEqual(result.jobs.map((entry) => entry.id), ["usd"]);
});

test("pagination occurs after deduplication, filtering, and expiry removal", async () => {
  const first = job();
  const jobs = [first, first, job({ id: "expired", expires: "2000-01-01" }), job({ id: "other", redirect_url: "https://jobicy.com/jobs/2" })];
  const service = new SearchService([provider(jobs)]);
  const firstPage = await service.search(searchSchema.parse({ results_per_page: 1 }));
  assert.equal(firstPage.count, 2);
  assert.equal(firstPage.hasMore, true);
  const secondPage = await service.search(searchSchema.parse({ page: 2, results_per_page: 1 }));
  assert.equal(secondPage.jobs[0]?.id, "other");
  assert.equal(secondPage.hasMore, false);
});

test("dedup retains source links and does not merge distinct geographic eligibility", () => {
  const first = job();
  const second = job({ id: "himalayas:2", sources: [{ provider: "himalayas", name: "Himalayas", url: "https://himalayas.app/jobs/2", applyUrl: first.redirect_url }] });
  const merged = deduplicate([first, second, job({ id: "us", eligibility: "USA" })]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0]?.sources.length, 2);
  assert.equal(first.sources.length, 1);
  assert.equal(deduplicate([first, { ...first, title: "Updated title" }]).length, 1);
});

test("Himalayas forwards Kenya without a UK fallback, continues short pages, preserves links and pay period", async () => {
  const urls: URL[] = [];
  const http: JsonFetcher = async (_provider, url) => {
    urls.push(url);
    return { jobs: url.searchParams.get("page") === "1" ? [himalayasItem] : [] };
  };
  const batch = await createProviders(http)[0]!.load(searchSchema.parse({ country_code: "ke", keyword: "engineer" }));
  assert.equal(urls.length, 2);
  assert.equal(urls[0]?.searchParams.get("country"), "KE");
  assert.equal(batch.limited, false);
  assert.equal(batch.jobs[0]?.salary_period, "hourly");
  assert.equal(batch.jobs[0]?.redirect_url, himalayasItem.applicationLink);
  assert.equal(batch.jobs[0]?.description, "TypeScript & Node");
  assert.equal(batch.jobs[0]?.contract_type, "contract");
});

test("Himalayas marks the pool limited when the fetch cap is reached", async () => {
  const batch = await createProviders(async () => ({ jobs: [himalayasItem] }))[0]!.load(searchSchema.parse({}));
  assert.equal(batch.limited, true);
});

test("Jobicy follows cursor pages sequentially and shares one hourly feed across searches", async () => {
  const cursors: (string | null)[] = [];
  const http: JsonFetcher = async (_provider, url) => {
    cursors.push(url.searchParams.get("cursor"));
    return { jobs: [jobicyItem], hasMore: cursors.length === 1, nextCursor: cursors.length === 1 ? "opaque+cursor" : null };
  };
  const providers = createProviders(http);
  await providers[1]!.load(searchSchema.parse({ keyword: "typescript" }));
  await providers[1]!.load(searchSchema.parse({ keyword: "python", country_code: "ke" }));
  assert.deepEqual(cursors, [null, "opaque+cursor"]);
});

test("ReliefWeb stays disabled without an appname and applies a country filter when configured", async () => {
  let url: URL | undefined;
  const http: JsonFetcher = async (_provider, request) => { url = request; return { data: [], totalCount: 0 }; };
  assert.equal(createProviders(http)[2]?.enabled, false);
  await createProviders(http, { reliefwebAppname: "approved-test-name" })[2]!.load(searchSchema.parse({ country_code: "ke" }));
  assert.equal(url?.searchParams.get("filter[value]"), "Kenya");
  assert.equal(url?.searchParams.get("appname"), "approved-test-name");
});

test("invalid provider structures are failures, not empty result sets", async () => {
  const providers = createProviders(async () => ({ jobs: [{ malformed: true }], nextCursor: null, hasMore: false }));
  await assert.rejects(providers[0]!.load(searchSchema.parse({})));
  await assert.rejects(providers[1]!.load(searchSchema.parse({})));
});

test("unsafe application URLs never reach the browser", async () => {
  const batch = createProviders(async () => ({ jobs: [{ ...himalayasItem, applicationLink: "javascript:alert(1)" }] }));
  await assert.rejects(batch[0]!.load(searchSchema.parse({})));
});

test("cache shares concurrent work, expires, bounds entries, and cools failed requests", async () => {
  let now = 0;
  let calls = 0;
  const cache = new Cache<number>(100, 1, () => now);
  const load = async () => ++calls;
  assert.deepEqual(await Promise.all([cache.get("a", load), cache.get("a", load)]), [1, 1]);
  now = 101;
  assert.equal(await cache.get("a", load), 2);
  await cache.get("b", load);
  assert.equal(await cache.get("a", load), 4);
  const fail = async () => { calls++; throw new Error("down"); };
  await assert.rejects(cache.get("bad", fail));
  await assert.rejects(cache.get("bad", fail));
  assert.equal(calls, 5);
});

test("HTTP client rejects oversized responses and limits provider calls across queries", async () => {
  const large = createJsonFetcher(async () => new Response("x".repeat(8_000_001)));
  await assert.rejects(large("jobicy", new URL("https://jobicy.com/api/jobs")), /too large/);
  const http = createJsonFetcher(async () => new Response("{}"), () => 1000);
  for (let i = 0; i < 30; i++) await http("jobicy", new URL("https://jobicy.com/api/jobs"));
  await assert.rejects(http("jobicy", new URL("https://jobicy.com/api/jobs")), /budget/);
});
