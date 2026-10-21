export type { Job, SearchFilters, SortOption, SearchResult, ProviderStatus } from "../../../shared/contracts";
import type { SearchFilters } from "../../../shared/contracts";

export const DEFAULT_FILTERS: SearchFilters = {
  keyword: "", location: "", country_code: "all", category: "all", jobType: "all",
  salaryMin: "", salaryMax: "", salaryCurrency: "USD", salaryPeriod: "annual",
  page: 1, results_per_page: 10, sort: "relevance", what_exclude: "",
};

export const JOB_CATEGORIES = [
  "IT Jobs", "Engineering Jobs", "Healthcare & Nursing Jobs", "Accounting & Finance Jobs",
  "Sales Jobs", "Marketing Jobs", "HR & Recruitment Jobs", "Logistics & Warehouse Jobs",
  "Teaching Jobs", "Creative & Design Jobs", "Legal Jobs", "Customer Service Jobs", "Humanitarian Jobs", "Other Jobs",
] as const;

export const JOB_TYPES_FOR_UI = [
  { value: "full_time", label: "Full Time" }, { value: "part_time", label: "Part Time" },
  { value: "contract", label: "Contract" }, { value: "permanent", label: "Permanent" },
  { value: "remote", label: "Remote" }, { value: "internship", label: "Internship" }, { value: "volunteer", label: "Volunteer" },
] as const;

// Application geography is independent of any single provider's coverage.
const countryCodes = "ke ug tz rw et ng gh za eg ma dz ao bj bw bf bi cv cm cf td km cg cd ci dj gq er sz ga gm gn gw ls lr ly mg mw ml mr mu mz na ne st sn sc sl so ss sd tg tn zm zw at au be br ca ch de es fr gb in it mx nl nz pl sg us ae".split(" ");
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
export const COUNTRY_CODES = [
  { code: "all", label: "All countries" },
  ...countryCodes.map((code) => ({ code, label: regionNames.of(code.toUpperCase()) ?? code })),
];

export function getCountryFlag(code: string): string {
  if (!/^[a-z]{2}$/i.test(code)) return "";
  return [...code.toUpperCase()].map((character) => String.fromCodePoint(0x1f1e6 - 65 + character.charCodeAt(0))).join("");
}
