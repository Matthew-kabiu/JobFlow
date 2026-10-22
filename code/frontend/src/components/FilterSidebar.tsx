import { useId } from "react";
import { Banknote, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { JOB_CATEGORIES, JOB_TYPES_FOR_UI, type SearchFilters } from "@/lib/job-types";
import { activeFilters, SORT_OPTIONS } from "@/lib/search-filters";
import { AppSelect } from "@/components/ui/app-select";
import CurrencyPicker from "@/components/CurrencyPicker";

interface Props {
  filters: SearchFilters;
  onChange: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  onApply: () => void;
  onReset: () => void;
  isSearching: boolean;
  showReset?: boolean;
  layout?: "sidebar" | "wide";
}

export default function FilterSidebar({ filters, onChange, onApply, onReset, isSearching, showReset = true, layout = "sidebar" }: Props) {
  const id = useId();
  const field = (name: string) => `${id}-${name}`;
  return (
    <form className={`filter-panel ${layout === "wide" ? "filter-panel-wide" : ""}`} aria-label="Search filters" onSubmit={(event) => { event.preventDefault(); if (!isSearching) onApply(); }}>
      <div className="filter-panel-heading"><h2><SlidersHorizontal size={17} />{layout === "wide" ? "Job filters" : "Refine your search"}</h2>
        {activeFilters(filters).length > 0 && <span className="filter-count">{activeFilters(filters).length}</span>}
      </div>
      <div className="filter-panel-fields">
        <div className="filter-field"><label htmlFor={field("sort")}>Sort by</label>
          <AppSelect id={field("sort")} label="Sort by" value={filters.sort} onChange={(value) => onChange("sort", value as SearchFilters["sort"])} options={SORT_OPTIONS} />
        </div>
        <div className="filter-field"><label htmlFor={field("category")}>Category</label>
          <AppSelect id={field("category")} label="Category" value={filters.category} onChange={(value) => onChange("category", value)}
            options={[{ value: "all", label: "All categories" }, ...JOB_CATEGORIES.map((category) => ({ value: category, label: category }))]} />
        </div>
        <div className="filter-field"><label htmlFor={field("type")}>Job type</label>
          <AppSelect id={field("type")} label="Job type" value={filters.jobType} onChange={(value) => onChange("jobType", value)}
            options={[{ value: "all", label: "All types" }, ...JOB_TYPES_FOR_UI]} />
        </div>
        <fieldset className="salary-fields"><legend><Banknote size={15} />Salary</legend>
          <div className="filter-field-pair">
            <div className="filter-field"><label htmlFor={field("min")}>Minimum</label><input id={field("min")} inputMode="numeric" placeholder="No minimum" maxLength={10}
              value={filters.salaryMin} onChange={(event) => onChange("salaryMin", event.target.value.replace(/\D/g, ""))} /></div>
            <div className="filter-field"><label htmlFor={field("max")}>Maximum</label><input id={field("max")} inputMode="numeric" placeholder="No maximum" maxLength={10}
              value={filters.salaryMax} onChange={(event) => onChange("salaryMax", event.target.value.replace(/\D/g, ""))} /></div>
          </div>
          <div className="filter-field-pair">
            <div className="filter-field"><label htmlFor={field("currency")}>Currency</label>
              <CurrencyPicker id={field("currency")} value={filters.salaryCurrency} onChange={(value) => onChange("salaryCurrency", value)} /></div>
            <div className="filter-field"><label htmlFor={field("period")}>Pay period</label>
              <AppSelect id={field("period")} label="Pay period" value={filters.salaryPeriod} onChange={(value) => onChange("salaryPeriod", value as SearchFilters["salaryPeriod"])}
                options={[{ value: "annual", label: "Year" }, { value: "monthly", label: "Month" }, { value: "fortnightly", label: "Fortnight" }, { value: "weekly", label: "Week" }, { value: "hourly", label: "Hour" }]} /></div>
          </div>
          <p>Salary comparisons use the selected currency and pay period. No currency conversion is applied.</p>
        </fieldset>
        <div className="filter-field"><label htmlFor={field("exclude")}>Exclude keyword</label>
          <input id={field("exclude")} placeholder="A keyword to leave out" maxLength={200} value={filters.what_exclude} onChange={(event) => onChange("what_exclude", event.target.value)} />
        </div>
      </div>
      <div className="filter-panel-actions">
        <button type="submit" className="ui-button ui-button-primary" disabled={isSearching}><Search size={16} />Apply filters</button>
        {showReset && <button type="button" onClick={onReset} className="ui-button ui-button-outline"><RotateCcw size={15} />Reset filters</button>}
        <p>Changes apply when you search.</p>
      </div>
    </form>
  );
}
