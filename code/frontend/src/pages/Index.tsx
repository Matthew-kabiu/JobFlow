import { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSearch from "@/components/HeroSearch";
import FilterSidebar from "@/components/FilterSidebar";
import JobCard from "@/components/JobCard";
import JobDetailPanel from "@/components/JobDetailPanel";
import { DEFAULT_FILTERS, type Job, type SearchFilters } from "@/lib/job-types";
import { useJobSearch } from "@/hooks/use-job-search";
import { toast } from "sonner";
import { Search, ArrowLeft, ArrowRight, Github } from "lucide-react";

const Index = () => {
  const [filters, setFilters] = useState<SearchFilters>({ ...DEFAULT_FILTERS });
  const [applied, setApplied] = useState<SearchFilters>({ ...DEFAULT_FILTERS });
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const { result, isSearching, error, search } = useJobSearch();

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
    setFilters((previous) => ({ ...previous, [key]: value, page: 1 }));
  };
  const runSearch = (next: SearchFilters = filters) => {
    const query = { ...next, page: 1 };
    setFilters(query);
    setApplied(query);
    setSelectedJob(null);
    void search(query);
  };
  const goToPage = (page: number) => {
    const query = { ...applied, page };
    setApplied(query);
    setSelectedJob(null);
    void search(query);
  };
  const totalPages = Math.max(1, Math.ceil((result?.count ?? 0) / applied.results_per_page));

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-background">
      <Navbar />
      <HeroSearch
        keyword={filters.keyword} location={filters.location} countryCode={filters.country_code}
        whatExclude={filters.what_exclude} category={filters.category} jobType={filters.jobType}
        salaryMin={filters.salaryMin} salaryMax={filters.salaryMax} sort={filters.sort}
        salaryCurrency={filters.salaryCurrency} salaryPeriod={filters.salaryPeriod}
        onKeywordChange={(value) => updateFilter("keyword", value)}
        onLocationChange={(value) => updateFilter("location", value)}
        onCountryCodeChange={(value) => updateFilter("country_code", value)}
        onWhatExcludeChange={(value) => updateFilter("what_exclude", value)}
        onCategoryChange={(value) => updateFilter("category", value)}
        onJobTypeChange={(value) => updateFilter("jobType", value)}
        onSalaryMinChange={(value) => updateFilter("salaryMin", value)}
        onSalaryMaxChange={(value) => updateFilter("salaryMax", value)}
        onSortChange={(value) => updateFilter("sort", value)}
        onSalaryCurrencyChange={(value) => updateFilter("salaryCurrency", value)}
        onSalaryPeriodChange={(value) => updateFilter("salaryPeriod", value)}
        onSearch={() => runSearch()} totalJobs={result?.count ?? 0} isSearching={isSearching}
      />

      <main className="container mx-auto max-w-full px-4 py-5">
        {result && !isSearching && (
          <div className="mb-4 space-y-2 text-xs text-muted-foreground" role="status">
            <p>{result.count} loaded matches{result.limited ? " · Search covers a limited pool from each source." : " · Within the available provider feeds."}</p>
            <p>Remote roles may have country and timezone restrictions. Review eligibility before applying.</p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {result.providers.map((provider) => (
                <li key={provider.id}>
                  {provider.name}: {provider.status === "ok" ? `loaded${provider.limited ? " (limited)" : ""}` : provider.message}
                  {provider.fetchedAt && provider.status === "ok" && ` · refreshed ${new Date(provider.fetchedAt).toLocaleString()}`}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid min-w-0 gap-5 lg:grid-cols-[220px_1fr_minmax(300px,1fr)]">
          <div className="hidden min-w-0 lg:block">
            <FilterSidebar category={filters.category} jobType={filters.jobType}
              salaryMin={filters.salaryMin} salaryMax={filters.salaryMax} sort={filters.sort}
              whatExclude={filters.what_exclude}
              onCategoryChange={(value) => updateFilter("category", value)}
              onJobTypeChange={(value) => updateFilter("jobType", value)}
              onSalaryMinChange={(value) => updateFilter("salaryMin", value)}
              onSalaryMaxChange={(value) => updateFilter("salaryMax", value)}
              onSortChange={(value) => updateFilter("sort", value)}
              onWhatExcludeChange={(value) => updateFilter("what_exclude", value)}
              salaryLabel={`${filters.salaryCurrency} / ${filters.salaryPeriod}`}
              onApply={() => runSearch()} isSearching={isSearching}
              onClear={() => runSearch({ ...DEFAULT_FILTERS, keyword: filters.keyword, country_code: filters.country_code, location: filters.location })}
            />
          </div>

          <div className="min-w-0 space-y-2" aria-busy={isSearching}>
            {isSearching ? (
              <div className="rounded-lg border border-border bg-card py-16 text-center" role="status">
                <p className="text-sm text-muted-foreground">Searching job sources…</p>
              </div>
            ) : error ? (
              <div className="rounded-lg border border-border bg-card p-6" role="alert">
                <p className="text-sm">{error}</p>
                <button type="button" onClick={() => runSearch(applied)} className="mt-3 inline-flex items-center gap-2 text-sm underline focus-visible:outline">
                  <Search className="h-4 w-4" />Try again
                </button>
              </div>
            ) : !result?.jobs.length ? (
              <div className="rounded-lg border border-border bg-card py-16 text-center">
                <Search className="mx-auto mb-3 h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-medium">{result ? "No matching jobs in the loaded listings" : "Search for your next role"}</p>
                <p className="mt-1 px-4 text-xs text-muted-foreground">{result ? "Try broader keywords, another country, or fewer filters." : "Explore worldwide, remote, and African opportunities from external job sources."}</p>
              </div>
            ) : (
              <>
                {result.jobs.map((job) => (
                  <JobCard key={job.id} job={job} onSelect={setSelectedJob}
                    onSave={() => toast.info("Saved jobs are not available yet.")}
                    isSelected={selectedJob?.id === job.id} />
                ))}
                {totalPages > 1 && (
                  <nav className="mt-4 flex items-center justify-between border-t border-border pt-4" aria-label="Search results pages">
                    <p className="text-xs text-muted-foreground">Page {applied.page} of {totalPages}</p>
                    <div className="flex gap-3">
                      <button type="button" disabled={applied.page <= 1} onClick={() => goToPage(applied.page - 1)}
                        className="inline-flex items-center gap-1 rounded border px-3 py-2 text-xs focus-visible:outline disabled:opacity-40">
                        <ArrowLeft className="h-3 w-3" />Previous
                      </button>
                      <button type="button" disabled={!result.hasMore} onClick={() => goToPage(applied.page + 1)}
                        className="inline-flex items-center gap-1 rounded border px-3 py-2 text-xs focus-visible:outline disabled:opacity-40">
                        Next<ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </nav>
                )}
              </>
            )}
          </div>

          <div className="min-w-0">
            <div className="sticky top-20"><JobDetailPanel job={selectedJob} onClose={() => setSelectedJob(null)} /></div>
          </div>
        </div>
      </main>
      <footer className="mt-auto border-t border-border py-5">
        <div className="container mx-auto flex items-center justify-between px-4 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} <a href="https://www.spookielabsinc.site/" target="_blank" rel="noopener noreferrer"
            className="text-foreground underline underline-offset-2 hover:no-underline">SpookieLabsInc</a></p>
          <a href="https://github.com/spooky-spectre/JobFlow" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground" aria-label="GitHub">
            <Github className="h-3.5 w-3.5" strokeWidth={1.5} /><span>Open source</span>
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Index;
