import { Globe2, MapPin, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { COUNTRY_CODES, type SearchFilters } from "@/lib/job-types";
import { activeFilters } from "@/lib/search-filters";
import { AppSelect } from "@/components/ui/app-select";

interface Props {
  filters: SearchFilters;
  onChange: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void;
  onSearch: () => void;
  onReset: () => void;
  onOpenFilters: () => void;
  canReset: boolean;
  compact: boolean;
  isSearching: boolean;
}

export default function HeroSearch({ filters, onChange, onSearch, onReset, onOpenFilters, canReset, compact, isSearching }: Props) {
  const count = activeFilters(filters).length;
  return (
    <section className={`search-hero ${compact ? "search-hero-compact" : ""}`} id="job-search" aria-labelledby="search-heading">
      <div className="app-shell hero-grid">
        <div className="hero-copy">
          {!compact && <p className="hero-eyebrow"><span />A wider world of work</p>}
          <h1 id="search-heading">{compact ? "Find your next role." : <>Your next role.<br /><span>A wider world.</span></>}</h1>
          <p>{compact ? "One focused search. Opportunities from multiple sources." : "Search worldwide, remote, and African opportunities in one focused place."}</p>
        </div>
        {!compact && <figure className="hero-visual">
          <img src="/images/workspace.jpg" alt="A modern shared workspace with glass offices and open space" width="1200" height="801" loading="eager" />
          <figcaption><Globe2 size={15} />Opportunities beyond one job board.</figcaption>
        </figure>}

        <div className="hero-search-area">
          <form className="search-bar" onSubmit={(event) => { event.preventDefault(); if (!isSearching) onSearch(); }}>
            <div className="search-field search-keyword">
              <Search size={20} strokeWidth={1.5} />
              <div><label htmlFor="search-keyword">What are you looking for?</label>
                <input id="search-keyword" placeholder="Job title, keyword, or company" aria-label="Job title, keyword, or company"
                  value={filters.keyword} maxLength={200} onChange={(event) => onChange("keyword", event.target.value)} />
              </div>
            </div>
            <div className="search-field">
              <MapPin size={20} strokeWidth={1.5} />
              <div><label htmlFor="search-location">City or region</label>
                <input id="search-location" placeholder="Any location" value={filters.location} maxLength={200}
                  onChange={(event) => onChange("location", event.target.value)} />
              </div>
            </div>
            <div className="search-field search-country">
              <Globe2 size={20} strokeWidth={1.5} />
              <div><label htmlFor="search-country">Country</label>
                <AppSelect id="search-country" label="Country" value={filters.country_code} onChange={(value) => onChange("country_code", value)}
                  options={COUNTRY_CODES.map(({ code, label }) => ({ value: code, label }))} />
              </div>
            </div>
            <button type="submit" className="ui-button ui-button-primary search-submit" disabled={isSearching}>
              <Search size={18} strokeWidth={1.8} />{isSearching ? "Searching…" : "Search"}
            </button>
          </form>
          <div className="search-tools">
            <p>Find the role here. Apply at the original source.</p>
            <div>
              <button type="button" className="ui-button ui-button-quiet" onClick={onOpenFilters} data-filter-trigger>
                <SlidersHorizontal size={16} />Filters{count > 0 && <span className="filter-count">{count}</span>}
              </button>
              <span className="tool-divider" />
              <button type="button" className="ui-button ui-button-quiet reset-button" onClick={onReset} disabled={!canReset}
                title="Clear all search fields and return to the start">
                <RotateCcw size={15} />Reset filters
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
