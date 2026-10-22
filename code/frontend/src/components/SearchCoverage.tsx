import { CheckCircle2, ChevronDown, CircleHelp, Globe2, MinusCircle } from "lucide-react";
import type { SearchResult } from "@/lib/job-types";

export default function SearchCoverage({ result }: { result: SearchResult }) {
  const responding = result.providers.filter((provider) => provider.status === "ok").length;
  return (
    <details className="coverage-panel" id="source-coverage">
      <summary>
        <span className="coverage-heading"><Globe2 size={16} /><strong>Source coverage</strong>
          <span>{responding} of {result.providers.length} sources responding{result.limited ? " · Limited pool" : ""}</span>
        </span>
        <span className="disclosure-action">Details <ChevronDown size={15} /></span>
      </summary>
      <div className="coverage-body">
        <p>{result.limited ? "Search covers a limited pool from each source." : "Results are within the available provider feeds."} Counts describe loaded matches, not every available vacancy.</p>
        <p>Remote roles may have country and timezone restrictions. Review eligibility before applying.</p>
        <div className="source-status-grid">
          {result.providers.map((provider) => (
            <div className="source-status" key={provider.id}>
              <div>{provider.status === "ok" ? <CheckCircle2 size={16} /> : provider.status === "disabled" ? <MinusCircle size={16} /> : <CircleHelp size={16} />}<strong>{provider.name}</strong></div>
              <p>{provider.status === "ok" ? `Loaded${provider.limited ? " · Fetch limit reached" : ""}` : provider.message ?? "Temporarily unavailable"}</p>
              {provider.fetchedAt && <time dateTime={provider.fetchedAt}>Refreshed {new Date(provider.fetchedAt).toLocaleString()}</time>}
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
