# JobFlow backend

## Scope

The backend replaces n8n with repository-owned API integrations. There is no
employer upload/posting endpoint, account system, saved-job persistence, or
application submission API. Apply links send users to the destination required
by the source. The existing save control explicitly reports that saved jobs are
not available.

## API

All responses are JSON. Success uses `{ "success": true, "data": ... }`; failure
uses `{ "success": false, "error": "CODE" }`. The frontend maps codes to friendly
copy and never displays raw upstream errors.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | HTTP liveness (not upstream-provider health) |
| GET | `/api/v1/config` | Runtime public links/branding and shipped manifest version |
| GET | `/api/v1/providers` | Provider names and configuration-enabled flags |
| POST | `/api/v1/jobs/search` | Validated, normalized multi-provider search |

### Search request

Every field is optional; unsupported extra fields are rejected.

```json
{
  "keyword": "engineer",
  "country_code": "ke",
  "location": "",
  "category": "all",
  "jobType": "all",
  "salaryMin": "",
  "salaryMax": "",
  "salaryCurrency": "USD",
  "salaryPeriod": "annual",
  "what_exclude": "",
  "sort": "relevance",
  "page": 1,
  "results_per_page": 10
}
```

`country_code` is a lower-case country code or `all`. There is no fallback from
Kenya to the UK. Text is bounded at 200 characters; page size is 1–50. Salary
bounds are numeric strings, and the minimum cannot exceed the maximum. Sort is
`relevance`, `date`, `salary_asc`, or `salary_desc`.

Salary filtering/sorting includes only jobs with the selected currency and pay
period. No exchange-rate or pay-period conversion is invented. Unknown salaries
are excluded when a salary comparison is requested. City/location is an explicit
substring filter; a worldwide remote role is not automatically a Nairobi role.

### Search result

`data` contains `jobs`, `count`, `page`, `pageSize`, `hasMore`, `partial`, `limited`,
`providers`, and `countLabel: "loaded matches"`. Each provider reports `ok`,
`unavailable`, or `disabled`, with a refresh time when available.

Counts describe filtered, deduplicated matches in the **loaded pool**, not a sum
of upstream totals. Pagination occurs inside that pool. If a provider fetch cap
is reached, `limited` is true. This first implementation does not exhaust every
provider's complete catalogue. Pages can change after a cache refresh or restart;
they are not durable search snapshots. Relevance uses provider ordering, with
Himalayas first; it is not a cross-provider relevance-ranking model.

If at least one provider works, available data returns with provider statuses.
`partial` is true when any source is disabled/unavailable. If no provider works,
the API returns HTTP 503, never a fake successful empty result. A successful
source returning zero jobs remains a valid successful result.

### Job representation

Shared types are in `code/shared/contracts.d.ts`. Jobs include namespaced IDs,
plain-text descriptions, source/application links, location/eligibility, remote
status, timestamps, categories, employment type, and optional salary currency/pay
period. Missing information is not invented.

Repeated source IDs are collapsed first. Cross-source deduplication is deliberately conservative: canonical application URL (ignoring
UTM parameters), title, company, and eligibility must match. Multiple credited
sources and their original Apply links are retained. We do not merge merely
similar titles across countries or replace one provider's required Apply link.
This can leave duplicates that redirect through different job boards.

## Providers

### Himalayas

- [Official API docs](https://himalayas.app/api).
- Uses `/jobs/api/search`, forwarding keyword and country eligibility. Requests
  do not need a key; a free key provides an individual allowance.
- Fetches at most three search pages per keyword/country pair. Short pages are
  not assumed to mean the end; only an empty page does.
- Caches that result for 24 hours, matching the provider's daily data refresh.
- Retains country and timezone restrictions, source attribution, exact
  `applicationLink`, and expiry dates. Passed expiry dates are excluded on every
  search, including cached searches. Early closures can remain until refresh.

### Jobicy

- [Official API docs](https://jobicy.com/jobs-rss-feed).
- Uses the current `/api/jobs` endpoint without paid credentials. Keeps Jobicy
  links; no paid direct-ATS-link feature is used.
- Loads one shared feed pass hourly, up to three sequential cursor pages of
  200 listings each. This feed covers the provider's seven-day discovery window.
- Searches/filtering happen locally against the cached feed, not per visitor
  upstream. Country eligibility is conservative: explicit country, worldwide,
  and explicit Africa/EMEA regions for African countries. Unrecognized geographic
  labels are not treated as globally eligible. No timezone eligibility is inferred
  where the source does not supply it.
- Cached feed data is not retained beyond the hourly refresh. An early closure
  may remain visible until the next refresh. A long-term job archive would need
  the provider's batch status endpoint; no such archive exists here.

### ReliefWeb

- [Official API docs](https://apidoc.reliefweb.int/) and
  [appname approval](https://apidoc.reliefweb.int/parameters#appname).
- Disabled unless `RELIEFWEB_APPNAME` is configured with an approved value.
- Queries `/v2/jobs` with keyword, country, full fields, and latest ordering.
  Loads up to 100 matches per keyword/country pair, cached hourly.
- Provides Kenya/Africa/worldwide humanitarian and NGO jobs, not complete
  general-employment coverage. Closing dates, source organizations, and
  application instructions are retained.

Adzuna is not enabled in this replacement. Its current
[terms](https://developer.adzuna.com/docs/terms_of_service) require entitlement
review for ongoing commercial use. No paid provider or scraping proxy is used.

## Operational bounds

- Fixed provider endpoints; browsers cannot supply an arbitrary upstream URL.
- Eight-second timeout and eight-megabyte maximum per upstream response.
- Per-process budgets: 30 upstream requests/minute and 500/day **per provider**.
- Search API limit: 30 requests/minute per client through one trusted proxy.
- A bounded, single-flight cache (32 keyword/country entries per query provider;
  one global Jobicy feed) prevents duplicate concurrent fetches. Failures have a
  one-minute cooldown. Eviction can cause an earlier reload for query providers.
- All caches and budgets are in memory and reset on restart. Run a single backend
  replica for these guarantees. Multiple replicas or strict cross-restart quotas
  would need shared/persistent state. No database or Redis is required currently.
- External HTML is converted to text, and React renders it as text. Application
  links accept only HTTP(S), without URL credentials. No external HTML is injected
  into the DOM. Provider URLs, credentials, and request bodies are not logged.

## Verification

Backend tests use Fastify injection plus provider fixtures for validation,
throttling, geographic filters, salary units, deduplication, pagination, expiry,
provider failures, cursor traversal, response limits, and cache behavior.
Frontend tests cover API errors, stale request cancellation, applied-search
pagination, source attribution, exact Apply links, and salary formatting.

See [DEVELOPMENT.md](DEVELOPMENT.md) for Docker setup and commands. Production
deployment and provider account approval are separate owner actions.
