import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export default function LandingContent({ children }: { children: ReactNode }) {
  return (
    <div className="landing-content app-shell">
      <section className="landing-job-filters" aria-label="Job filters">{children}</section>
      <details className="landing-sources" id="job-sources">
        <summary>About our job sources <ChevronDown size={15} /></summary>
        <div>
          <p>JobFlow brings together listings from <strong>Himalayas</strong> and <strong>Jobicy</strong>, with optional <strong>ReliefWeb</strong> humanitarian coverage when an approved app name is configured.</p>
          <p>Searches use bounded source pools, not a complete global catalogue. Remote eligibility varies by country and timezone. Kenya’s entire on-site market is not covered.</p>
          <p>Compare loaded listings, review the full description and eligibility, then apply on the original source website.</p>
        </div>
      </details>
    </div>
  );
}
