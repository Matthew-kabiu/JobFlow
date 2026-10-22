import { useState } from "react";
import { ArrowLeft, ArrowRight, Github, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import HeroSearch from "@/components/HeroSearch";
import FilterSidebar from "@/components/FilterSidebar";
import JobCard from "@/components/JobCard";
import JobDetailPanel from "@/components/JobDetailPanel";
import LandingContent from "@/components/LandingContent";
import SearchCoverage from "@/components/SearchCoverage";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DEFAULT_FILTERS, type Job, type SearchFilters } from "@/lib/job-types";
import { activeFilters } from "@/lib/search-filters";
import { useJobSearch } from "@/hooks/use-job-search";
import { useWideLayout } from "@/hooks/use-wide-layout";
import { useRuntimeConfig } from "@/lib/config/runtime-config";

export default function Index() {
  const config = useRuntimeConfig();
  const wide = useWideLayout();
  const [filters, setFilters] = useState<SearchFilters>({ ...DEFAULT_FILTERS });
  const [applied, setApplied] = useState<SearchFilters>({ ...DEFAULT_FILTERS });
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const { result, isSearching, error, search, reset } = useJobSearch();
  const searched = result !== null || isSearching || error !== null;
  const canReset = searched || (Object.keys(DEFAULT_FILTERS) as (keyof SearchFilters)[]).some((key) => filters[key] !== DEFAULT_FILTERS[key]);
  const displayJob = result?.jobs.find((job) => job.id === selectedJob?.id) ?? result?.jobs[0] ?? null;
  const totalPages = Math.max(1, Math.ceil((result?.count ?? 0) / applied.results_per_page));

  const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => setFilters((previous) => ({ ...previous, [key]: value, page: 1 }));
  const runSearch = (next = filters) => {
    const query = { ...next, page: 1 };
    setFilters(query); setApplied(query); setSelectedJob(null); setDetailOpen(false); setFiltersOpen(false);
    void search(query);
  };
  const resetFilters = () => {
    reset(); setFilters({ ...DEFAULT_FILTERS }); setApplied({ ...DEFAULT_FILTERS });
    setSelectedJob(null); setFiltersOpen(false); setDetailOpen(false);
  };
  const pageTo = (page: number) => {
    const query = { ...applied, page };
    setApplied(query); setSelectedJob(null); setDetailOpen(false); void search(query);
  };
  const selectJob = (job: Job) => { setSelectedJob(job); setDetailOpen(true); };
  const filterPanel = (showReset: boolean, layout: "sidebar" | "wide" = "sidebar") => <FilterSidebar filters={filters} onChange={updateFilter} onApply={() => runSearch()}
    onReset={resetFilters} isSearching={isSearching} showReset={showReset} layout={layout} />;

  return (
    <div className="jobflow-app">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Navbar onHome={resetFilters} hasResults={searched} />
      <HeroSearch filters={filters} onChange={updateFilter} onSearch={() => runSearch()} onReset={resetFilters}
        onOpenFilters={() => setFiltersOpen(true)} compact={searched} canReset={canReset} isSearching={isSearching} />

      <main id="main-content">
        {!searched ? <LandingContent>{filterPanel(true, "wide")}</LandingContent> : (
          <div className="app-shell results-shell">
            <div className="results-heading">
              <div><h2>{isSearching ? "Finding your next opportunity…" : result ? `${result.count.toLocaleString()} loaded ${result.count === 1 ? "match" : "matches"}` : "Let’s get your search back on track."}</h2>
                <p>{applied.keyword ? <>Results for <strong>“{applied.keyword}”</strong></> : "Opportunities across your selected sources"}</p></div>
              <button type="button" className="ui-button ui-button-outline results-filter-trigger" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={16} />Filters</button>
            </div>

            {activeFilters(applied).length > 0 && <div className="active-filters" aria-label="Applied filters">
              {activeFilters(applied).map(({ key, label }) => <button type="button" key={key} disabled={isSearching}
                onClick={() => runSearch({ ...applied, [key]: DEFAULT_FILTERS[key] })} aria-label={`Remove filter: ${label}`} title={`Remove ${label}`}>
                {label}<X size={12} />
              </button>)}
            </div>}

            {result && !isSearching && <SearchCoverage result={result} />}

            <div className="results-layout">
              <aside className="desktop-filters">{filterPanel(false)}</aside>
              <section className="job-results" aria-label="Job listings" aria-busy={isSearching}>
                {isSearching ? <div className="results-loading" role="status"><span className="sr-only">Searching job sources…</span>
                  {[1, 2, 3].map((key) => <div className="skeleton-card" key={key}><span /><span /><span /><span /></div>)}
                </div> : error ? <div className="search-message" role="alert"><Search size={25} strokeWidth={1.5} /><h3>We couldn’t complete this search.</h3><p>{error}</p>
                  <button type="button" className="ui-button ui-button-primary" onClick={() => runSearch(applied)}><RotateCcw size={16} />Try again</button>
                </div> : !result?.jobs.length ? <div className="search-message"><Search size={28} strokeWidth={1.4} /><h3>No matching jobs in the loaded listings</h3><p>Try broader keywords, another country, or fewer filters.</p>
                  <button type="button" className="ui-button ui-button-outline" onClick={resetFilters}><RotateCcw size={15} />Reset filters</button>
                </div> : <>
                  {result.jobs.map((job) => <JobCard key={job.id} job={job} onSelect={selectJob}
                    onSave={() => toast.info("Saved jobs are not available yet.")} isSelected={(wide || detailOpen) && displayJob?.id === job.id} />)}
                  {totalPages > 1 && <nav className="pagination" aria-label="Search results pages"><p>Page <strong>{applied.page}</strong> of {totalPages}</p><div>
                    <button type="button" className="ui-button ui-button-outline" disabled={applied.page <= 1} onClick={() => pageTo(applied.page - 1)}><ArrowLeft size={15} />Previous</button>
                    <button type="button" className="ui-button ui-button-outline" disabled={!result.hasMore} onClick={() => pageTo(applied.page + 1)}>Next<ArrowRight size={15} /></button>
                  </div></nav>}
                </>}
              </section>
              {wide && <div className="desktop-job-detail"><JobDetailPanel key={displayJob?.id ?? "none"} job={isSearching ? null : displayJob} /></div>}
            </div>
          </div>
        )}
      </main>

      <footer className="site-footer"><div className="app-shell footer-inner">
        <p>&copy; {new Date().getFullYear()} {config.companyUrl ? <a href={config.companyUrl} target="_blank" rel="noopener noreferrer">{config.companyName}</a> : config.companyName}
          {config.version && <span className="footer-version">· v{config.version}</span>}</p>
        <p className="footer-note">A clearer path to your next role.</p>
        {config.repoUrl && <a className="footer-github" href={config.repoUrl} target="_blank" rel="noopener noreferrer" aria-label="GitHub"><Github size={15} />Open source</a>}
      </div></footer>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent className="jobflow-sheet filter-sheet" onCloseAutoFocus={(event) => { event.preventDefault(); document.querySelector<HTMLButtonElement>("[data-filter-trigger]")?.focus(); }}>
          <SheetHeader className="sheet-intro"><SheetTitle>Make the search yours.</SheetTitle><SheetDescription>All your filters, in one place.</SheetDescription></SheetHeader>
          {filterPanel(true)}
        </SheetContent>
      </Sheet>
      <Sheet open={detailOpen && !wide} onOpenChange={setDetailOpen}>
        <SheetContent className="jobflow-sheet detail-sheet" onCloseAutoFocus={(event) => { event.preventDefault(); if (selectedJob) document.getElementById(`job-${selectedJob.id}`)?.focus(); }}>
          <SheetHeader className="sr-only"><SheetTitle>Job details</SheetTitle><SheetDescription>Full description, eligibility, and original application links.</SheetDescription></SheetHeader>
          <JobDetailPanel job={displayJob} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
