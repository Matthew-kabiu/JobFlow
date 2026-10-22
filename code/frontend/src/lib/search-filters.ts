import { COUNTRY_CODES, DEFAULT_FILTERS, JOB_TYPES_FOR_UI, type SearchFilters } from "@/lib/job-types";

export const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" }, { value: "date", label: "Most recent" },
  { value: "salary_asc", label: "Salary: low to high" }, { value: "salary_desc", label: "Salary: high to low" },
] as const;

export function activeFilters(filters: SearchFilters): { key: keyof SearchFilters; label: string }[] {
  const values: { key: keyof SearchFilters; label: string }[] = [];
  if (filters.country_code !== "all") values.push({ key: "country_code", label: COUNTRY_CODES.find((country) => country.code === filters.country_code)?.label ?? filters.country_code });
  if (filters.location) values.push({ key: "location", label: filters.location });
  if (filters.category !== "all") values.push({ key: "category", label: filters.category });
  if (filters.jobType !== "all") values.push({ key: "jobType", label: JOB_TYPES_FOR_UI.find((type) => type.value === filters.jobType)?.label ?? filters.jobType });
  if (filters.what_exclude) values.push({ key: "what_exclude", label: `Exclude: ${filters.what_exclude}` });
  if (filters.salaryMin) values.push({ key: "salaryMin", label: `From ${filters.salaryCurrency} ${Number(filters.salaryMin).toLocaleString()}` });
  if (filters.salaryMax) values.push({ key: "salaryMax", label: `Up to ${filters.salaryCurrency} ${Number(filters.salaryMax).toLocaleString()}` });
  if (filters.sort !== "relevance") values.push({ key: "sort", label: SORT_OPTIONS.find((option) => option.value === filters.sort)?.label ?? filters.sort });
  if (filters.salaryCurrency !== DEFAULT_FILTERS.salaryCurrency) values.push({ key: "salaryCurrency", label: filters.salaryCurrency });
  if (filters.salaryPeriod !== DEFAULT_FILTERS.salaryPeriod) values.push({ key: "salaryPeriod", label: filters.salaryPeriod });
  return values;
}
