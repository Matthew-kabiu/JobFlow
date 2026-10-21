export type ProviderId = "himalayas" | "jobicy" | "reliefweb";
export type SalaryPeriod = "hourly" | "weekly" | "fortnightly" | "monthly" | "annual";
export type SortOption = "relevance" | "date" | "salary_asc" | "salary_desc";

export interface JobSource {
  provider: ProviderId;
  name: string;
  url: string;
  applyUrl: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_period?: SalaryPeriod;
  category: string;
  contract_type: string;
  description: string;
  redirect_url: string;
  created: string;
  expires?: string;
  remote: boolean;
  eligibility: string;
  sources: JobSource[];
}

export interface SearchFilters {
  keyword: string;
  location: string;
  country_code: string;
  category: string;
  jobType: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  salaryPeriod: SalaryPeriod;
  page: number;
  sort: SortOption;
  results_per_page: number;
  what_exclude: string;
}

export interface ProviderStatus {
  id: ProviderId;
  name: string;
  status: "ok" | "unavailable" | "disabled";
  fetchedAt?: string;
  limited: boolean;
  message?: string;
}

export interface SearchResult {
  jobs: Job[];
  count: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  partial: boolean;
  limited: boolean;
  providers: ProviderStatus[];
  countLabel: "loaded matches";
}
