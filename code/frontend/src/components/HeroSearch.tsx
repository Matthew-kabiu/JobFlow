import { Search, MapPin, Banknote, Loader2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  JOB_CATEGORIES,
  JOB_TYPES_FOR_UI,
  COUNTRY_CODES,
  getCountryFlag,
  type SortOption,
  type SearchFilters,
} from "@/lib/job-types";
import { useState } from "react";

interface HeroSearchProps {
  keyword: string;
  location: string;
  countryCode: string;
  whatExclude: string;
  category: string;
  jobType: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  salaryPeriod: SearchFilters["salaryPeriod"];
  sort: SortOption;
  onKeywordChange: (val: string) => void;
  onLocationChange: (val: string) => void;
  onCountryCodeChange: (val: string) => void;
  onWhatExcludeChange: (val: string) => void;
  onCategoryChange: (val: string) => void;
  onJobTypeChange: (val: string) => void;
  onSalaryMinChange: (val: string) => void;
  onSalaryMaxChange: (val: string) => void;
  onSalaryCurrencyChange: (val: string) => void;
  onSalaryPeriodChange: (val: SearchFilters["salaryPeriod"]) => void;
  onSortChange: (val: SortOption) => void;
  onSearch: () => void;
  totalJobs: number;
  isSearching?: boolean;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "date", label: "Most Recent" },
  { value: "salary_asc", label: "Salary: Low to High" },
  { value: "salary_desc", label: "Salary: High to Low" },
];

const HeroSearch = ({
  keyword,
  location,
  countryCode,
  whatExclude,
  category,
  jobType,
  salaryMin,
  salaryMax,
  salaryCurrency,
  salaryPeriod,
  sort,
  onKeywordChange,
  onLocationChange,
  onCountryCodeChange,
  onWhatExcludeChange,
  onCategoryChange,
  onJobTypeChange,
  onSalaryMinChange,
  onSalaryMaxChange,
  onSalaryCurrencyChange,
  onSalaryPeriodChange,
  onSortChange,
  onSearch,
  totalJobs,
  isSearching = false,
}: HeroSearchProps) => {
  const [showFilters, setShowFilters] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSearch();
    }
  };

  return (
    <section className="border-b border-border bg-secondary/40">
      <div className="container mx-auto max-w-4xl px-4 py-8 md:py-10">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Find your next role
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {totalJobs > 0
               ? `${totalJobs.toLocaleString()} matches in the loaded listings`
               : "Worldwide, remote, and African opportunities"}
          </p>
        </div>

        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
              <Input
                 placeholder="Job title, keyword, or company"
                 aria-label="Job title, keyword, or company"
                 maxLength={200}
                value={keyword}
                onChange={(e) => onKeywordChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-12 border-border bg-card pl-10 text-sm shadow-sm"
              />
            </div>
            <div className="relative hidden w-52 sm:block">
              <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
              <Input
                 placeholder="City or region"
                 aria-label="City or region"
                 maxLength={200}
                value={location}
                onChange={(e) => onLocationChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-12 border-border bg-card pl-10 text-sm shadow-sm"
              />
            </div>
            <Button
              onClick={onSearch}
              disabled={isSearching}
              className="h-12 px-6 bg-foreground text-background hover:bg-foreground/90 font-medium"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                 <><Search className="mr-2 h-4 w-4" />Search</>
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="h-12 w-12 border-border bg-card shadow-sm"
               aria-label="Toggle filters"
               title="Toggle filters"
               aria-expanded={showFilters}
            >
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>

          {showFilters && (
            <div className="mt-3 grid gap-3 rounded-lg border border-border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Country</label>
                <Select value={countryCode || "all"} onValueChange={onCountryCodeChange}>
                  <SelectTrigger className="h-9 bg-secondary text-sm" aria-label="Country">
                    <SelectValue>
                      {countryCode
                         ? `${getCountryFlag(countryCode)} ${COUNTRY_CODES.find((c) => c.code === countryCode)?.label ?? countryCode}`
                        : "Select country"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CODES.map(({ code, label }) => (
                      <SelectItem key={code} value={code}>
                        <span className="flex items-center gap-2">
                          <span className="text-lg leading-none">{getCountryFlag(code)}</span>
                          <span>{label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <Select value={category || "all"} onValueChange={onCategoryChange}>
                  <SelectTrigger className="h-9 bg-secondary text-sm">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {JOB_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Job type</label>
                <Select value={jobType || "all"} onValueChange={onJobTypeChange}>
                  <SelectTrigger className="h-9 bg-secondary text-sm">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {JOB_TYPES_FOR_UI.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Sort by</label>
                <Select value={sort} onValueChange={(v) => onSortChange(v as SortOption)}>
                  <SelectTrigger className="h-9 bg-secondary text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Exclude keyword</label>
                <Input
                  placeholder="e.g. Java"
                  value={whatExclude}
                  onChange={(e) => onWhatExcludeChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-9 bg-secondary text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Salary min ({salaryCurrency} / {salaryPeriod})</label>
                <div className="relative">
                  <Banknote className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Min"
                    value={salaryMin}
                    onChange={(e) => onSalaryMinChange(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={handleKeyDown}
                    className="h-9 bg-secondary pl-8 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Salary max</label>
                <div className="relative">
                  <Banknote className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Max"
                    value={salaryMax}
                    onChange={(e) => onSalaryMaxChange(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={handleKeyDown}
                    className="h-9 bg-secondary pl-8 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="salary-currency" className="text-xs font-medium text-muted-foreground">Salary currency</label>
                <select id="salary-currency" value={salaryCurrency} onChange={(event) => onSalaryCurrencyChange(event.target.value)}
                  className="h-9 w-full rounded border border-border bg-secondary px-2 text-sm">
                  {["USD", "KES", "GBP", "EUR", "ZAR", "CAD", "AUD"].map((currency) => <option key={currency}>{currency}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="salary-period" className="text-xs font-medium text-muted-foreground">Pay period</label>
                <select id="salary-period" value={salaryPeriod}
                  onChange={(event) => onSalaryPeriodChange(event.target.value as SearchFilters["salaryPeriod"])}
                  className="h-9 w-full rounded border border-border bg-secondary px-2 text-sm">
                  {["annual", "monthly", "fortnightly", "weekly", "hourly"].map((period) => <option key={period}>{period}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroSearch;
