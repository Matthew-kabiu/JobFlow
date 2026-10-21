import type { Job, SearchFilters, SearchResult, ProviderStatus } from "../../shared/contracts.js";
import { deduplicate } from "./normalize.js";
import type { Provider } from "./providers.js";

const africanCountries = new Set("dz ao bj bw bf bi cv cm cf td km cg cd ci dj eg gq er sz et ga gm gh gn gw ke ls lr ly mg mw ml mr mu ma mz na ne ng rw st sn sc sl so za ss sd tz tg tn ug zm zw".split(" "));

function jobicyEligible(job: Job, country: string): boolean {
  if (country === "all") return true;
  const geo = job.eligibility.toLowerCase();
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  const countryName = names.of(country.toUpperCase())?.toLowerCase();
  const locations = geo.split(/[,;/|]/).map((value) => value.trim());
  if (locations.some((value) => ["anywhere", "worldwide", "world wide", "global"].includes(value))) return true;
  if (countryName && locations.includes(countryName)) return true;
  if (country === "us" && locations.some((value) => ["usa", "united states"].includes(value))) return true;
  if (country === "gb" && locations.some((value) => ["uk", "united kingdom"].includes(value))) return true;
  return africanCountries.has(country) && locations.some((value) => ["africa", "emea"].includes(value));
}

export class SearchService {
  constructor(readonly providers: Provider[], private now = Date.now) {}

  async search(query: SearchFilters): Promise<SearchResult> {
    const batches = await Promise.all(this.providers.map(async (provider) => {
      if (!provider.enabled) return { jobs: [], info: {
        id: provider.id, name: provider.name, status: "disabled", limited: false,
        message: "Requires an approved ReliefWeb app name.",
      } satisfies ProviderStatus };
      try {
        const batch = await provider.load(query);
        return { jobs: batch.jobs, info: {
          id: provider.id, name: provider.name, status: "ok", limited: batch.limited, fetchedAt: batch.fetchedAt,
        } satisfies ProviderStatus };
      } catch {
        return { jobs: [], info: {
          id: provider.id, name: provider.name, status: "unavailable", limited: false,
          message: "Temporarily unavailable. Please try again later.",
        } satisfies ProviderStatus };
      }
    }));
    if (!batches.some((batch) => batch.info.status === "ok")) throw new Error("PROVIDERS_UNAVAILABLE");
    const text = (job: Job) => `${job.title} ${job.company} ${job.description}`.toLowerCase();
    let jobs = deduplicate(batches.flatMap((batch) => batch.jobs).filter((job) => {
      if (job.expires && (!Number.isFinite(Date.parse(job.expires)) || Date.parse(job.expires) <= this.now())) return false;
      if (job.sources[0]?.provider === "jobicy" && !jobicyEligible(job, query.country_code)) return false;
      // Feed-only sources need local keyword filtering; Himalayas/ReliefWeb search upstream.
      if (job.sources[0]?.provider === "jobicy" && query.keyword && !query.keyword.toLowerCase().split(/\s+/).every((word) => text(job).includes(word))) return false;
      if (query.what_exclude && text(job).includes(query.what_exclude.toLowerCase())) return false;
      if (query.location && !job.location.toLowerCase().includes(query.location.toLowerCase())) return false;
      if (query.category !== "all" && job.category !== query.category) return false;
      if (query.jobType === "remote" ? !job.remote : query.jobType !== "all" && job.contract_type !== query.jobType) return false;
      const salaryFilter = query.salaryMin || query.salaryMax || query.sort.startsWith("salary_");
      if (salaryFilter) {
        if (job.salary_currency !== query.salaryCurrency || job.salary_period !== query.salaryPeriod) return false;
        if (query.salaryMin && (job.salary_max ?? job.salary_min ?? -1) < Number(query.salaryMin)) return false;
        if (query.salaryMax && (job.salary_min ?? job.salary_max ?? Infinity) > Number(query.salaryMax)) return false;
        if (job.salary_min === undefined && job.salary_max === undefined) return false;
      }
      return true;
    }));
    if (query.sort === "date") jobs.sort((a, b) => Date.parse(b.created) - Date.parse(a.created));
    if (query.sort === "salary_asc") jobs.sort((a, b) => (a.salary_min ?? a.salary_max ?? 0) - (b.salary_min ?? b.salary_max ?? 0));
    if (query.sort === "salary_desc") jobs.sort((a, b) => (b.salary_max ?? b.salary_min ?? 0) - (a.salary_max ?? a.salary_min ?? 0));
    const count = jobs.length;
    const offset = (query.page - 1) * query.results_per_page;
    jobs = jobs.slice(offset, offset + query.results_per_page);
    return {
      jobs, count, page: query.page, pageSize: query.results_per_page,
      hasMore: offset + query.results_per_page < count,
      partial: batches.some((batch) => batch.info.status !== "ok"),
      limited: batches.some((batch) => batch.info.limited),
      providers: batches.map((batch) => batch.info), countLabel: "loaded matches",
    };
  }
}
