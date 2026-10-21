import { z } from "zod";
import type { Job, ProviderId, SearchFilters } from "../../shared/contracts.js";
import { Cache } from "./cache.js";
import type { JsonFetcher } from "./http.js";
import { category, jobType, makeJob, period } from "./normalize.js";
import { PROVIDER_ROUTES } from "./routes.js";

export interface ProviderBatch { jobs: Job[]; limited: boolean; fetchedAt: string }
export interface Provider {
  id: ProviderId;
  name: string;
  enabled: boolean;
  load: (query: SearchFilters) => Promise<ProviderBatch>;
}

const numeric = z.number().finite().nonnegative().nullable().optional();
const string = z.string();
const strings = z.array(string);
const himalayasJob = z.object({
  guid: string, title: string, companyName: string,
  employmentType: string.optional(), description: string.optional(), excerpt: string.optional(),
  applicationLink: string, pubDate: z.number(), expiryDate: z.number().optional(),
  locationRestrictions: strings.default([]), timezoneRestrictions: z.array(z.number()).default([]),
  categories: strings.default([]), parentCategories: strings.default([]),
  minSalary: numeric, maxSalary: numeric, salaryPeriod: string.optional(), currency: string.optional(),
});
const jobicyJob = z.object({
  id: z.number(), url: string, jobTitle: string, companyName: string,
  jobDescription: string.optional(), jobExcerpt: string.optional(),
  jobIndustry: strings.default([]), jobType: strings.default([]), jobGeo: string,
  pubDate: string, salaryMin: numeric, salaryMax: numeric,
  salaryCurrency: string.optional(), salaryPeriod: string.optional(),
});
const reliefJob = z.object({
  id: z.union([string, z.number()]),
  fields: z.object({
    title: string, url: string, body: string.optional(), how_to_apply: string.optional(),
    date: z.object({ created: string, closing: string.optional() }),
    source: z.array(z.object({ name: string })).default([]),
    country: z.array(z.object({ name: string, iso3: string.optional() })).default([]),
    city: z.array(z.object({ name: string })).default([]),
    career_categories: z.array(z.object({ name: string })).default([]),
    type: z.array(z.object({ name: string })).default([]),
  }),
});

function collect<S extends z.ZodTypeAny>(items: unknown[], schema: S, map: (value: z.output<S>) => Job | undefined): Job[] {
  const jobs: Job[] = [];
  for (const item of items) {
    const parsed = schema.safeParse(item);
    if (parsed.success) {
      const job = map(parsed.data);
      if (job) jobs.push(job);
    }
  }
  // An incompatible non-empty feed must not look like a successful empty result.
  if (items.length && !jobs.length) throw new Error("Provider response incompatible");
  return jobs;
}

export function createProviders(http: JsonFetcher, options: { himalayasKey?: string; reliefwebAppname?: string } = {}): Provider[] {
  const himalayasCache = new Cache<ProviderBatch>(86_400_000);
  const jobicyCache = new Cache<ProviderBatch>(3_600_000, 1);
  const reliefCache = new Cache<ProviderBatch>(3_600_000);
  return [
    {
      id: "himalayas", name: "Himalayas", enabled: true,
      load(query) {
        const key = JSON.stringify([query.keyword.toLowerCase(), query.country_code]);
        return himalayasCache.get(key, async () => {
          const jobs: Job[] = [];
          let limited = false;
          // Bound work per query; UI counts the loaded pool, not every job on the internet.
          for (let page = 1; page <= 3; page++) {
            const url = new URL(PROVIDER_ROUTES.himalayas);
            url.searchParams.set("q", query.keyword);
            if (query.country_code !== "all") url.searchParams.set("country", query.country_code.toUpperCase());
            url.searchParams.set("page", String(page));
            const response = z.object({ jobs: z.array(z.unknown()) }).parse(await http("himalayas", url,
              options.himalayasKey ? { Authorization: `Bearer ${options.himalayasKey}` } : {}));
            jobs.push(...collect(response.jobs, himalayasJob, (item) => makeJob({
              externalId: item.guid, title: item.title, company: item.companyName,
              location: item.locationRestrictions.join(", ") || "Remote",
              remote: true,
              eligibility: `${item.locationRestrictions.join(", ") || "No country restriction"}; ${item.timezoneRestrictions.length ? `UTC offsets: ${item.timezoneRestrictions.join(", ")}` : "check timezone requirements"}`,
              description: item.description ?? item.excerpt ?? "",
              category: category([...item.parentCategories, ...item.categories].join(" ")),
              contract_type: jobType(item.employmentType ?? ""),
              salary_min: item.minSalary ?? undefined, salary_max: item.maxSalary ?? undefined,
              salary_currency: item.currency?.toUpperCase(), salary_period: period(item.salaryPeriod),
              created: new Date(item.pubDate * 1000).toISOString(),
              expires: item.expiryDate ? new Date(item.expiryDate * 1000).toISOString() : undefined,
              redirect_url: item.applicationLink,
              source: { provider: "himalayas", name: "Himalayas", url: item.guid, applyUrl: item.applicationLink },
            })));
            limited = response.jobs.length > 0;
            // Search may return short intermediate pages: only empty means exhausted.
            if (!limited) break;
          }
          return { jobs, limited, fetchedAt: new Date().toISOString() };
        });
      },
    },
    {
      id: "jobicy", name: "Jobicy", enabled: true,
      load() {
        // One shared feed refresh per hour, regardless of the number of visitor queries.
        return jobicyCache.get("feed", async () => {
          const jobs: Job[] = [];
          let cursor: string | null = null;
          let limited = false;
          const seen = new Set<string>();
          for (let page = 0; page < 3; page++) {
            const url = new URL(PROVIDER_ROUTES.jobicy);
            url.searchParams.set("count", "200");
            if (cursor) url.searchParams.set("cursor", cursor);
            const response = z.object({
              jobs: z.array(z.unknown()), nextCursor: z.string().nullable(), hasMore: z.boolean(),
            }).parse(await http("jobicy", url));
            jobs.push(...collect(response.jobs, jobicyJob, (item) => makeJob({
              externalId: String(item.id), title: item.jobTitle, company: item.companyName,
              location: item.jobGeo, eligibility: item.jobGeo, remote: true,
              description: item.jobDescription ?? item.jobExcerpt ?? "",
              category: category(item.jobIndustry.join(" ")), contract_type: jobType(item.jobType[0] ?? ""),
              salary_min: item.salaryMin ?? undefined, salary_max: item.salaryMax ?? undefined,
              salary_currency: item.salaryCurrency?.toUpperCase(), salary_period: period(item.salaryPeriod),
              created: item.pubDate, redirect_url: item.url,
              source: { provider: "jobicy", name: "Jobicy", url: item.url, applyUrl: item.url },
            })));
            cursor = response.nextCursor;
            limited = response.hasMore;
            if (!limited) break;
            if (!cursor || seen.has(cursor)) throw new Error("Invalid provider cursor");
            seen.add(cursor);
          }
          return { jobs, limited, fetchedAt: new Date().toISOString() };
        });
      },
    },
    {
      id: "reliefweb", name: "ReliefWeb", enabled: Boolean(options.reliefwebAppname?.trim()),
      load(query) {
        const key = JSON.stringify([query.keyword.toLowerCase(), query.country_code]);
        return reliefCache.get(key, async () => {
          if (!options.reliefwebAppname) throw new Error("ReliefWeb not configured");
          const url = new URL(PROVIDER_ROUTES.reliefweb);
          url.searchParams.set("appname", options.reliefwebAppname);
          url.searchParams.set("limit", "100");
          url.searchParams.set("preset", "latest");
          url.searchParams.set("profile", "full");
          if (query.keyword) {
            url.searchParams.set("query[value]", query.keyword);
            url.searchParams.set("query[fields][]", "title");
          }
          if (query.country_code !== "all") {
            const name = new Intl.DisplayNames(["en"], { type: "region" }).of(query.country_code.toUpperCase());
            url.searchParams.set("filter[field]", "country.name");
            url.searchParams.set("filter[value]", name ?? query.country_code);
          }
          const response = z.object({ data: z.array(z.unknown()), totalCount: z.number() }).parse(await http("reliefweb", url));
          const jobs = collect(response.data, reliefJob, ({ id, fields }) => makeJob({
            externalId: String(id), title: fields.title,
            company: fields.source.map((source) => source.name).join(", "),
            location: [...fields.city.map((city) => city.name), ...fields.country.map((country) => country.name)].join(", ") || "Location not specified",
            remote: false, eligibility: "See source for location and work authorization requirements",
            category: category(fields.career_categories.map((entry) => entry.name).join(" ")),
            contract_type: jobType(fields.type[0]?.name ?? ""),
            description: `${fields.body ?? ""}\n\nHow to apply\n${fields.how_to_apply ?? "See original listing."}`,
            created: fields.date.created, expires: fields.date.closing,
            redirect_url: fields.url,
            source: { provider: "reliefweb", name: "ReliefWeb", url: fields.url, applyUrl: fields.url },
          }));
          return { jobs, limited: response.totalCount > response.data.length, fetchedAt: new Date().toISOString() };
        });
      },
    },
  ];
}
