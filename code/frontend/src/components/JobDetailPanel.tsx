import type { Job } from "@/lib/job-types";
import { ArrowUpRight, Banknote, BriefcaseBusiness, ChevronDown, Globe2, MapPin, MousePointer2, X } from "lucide-react";
import { contractLabel, formatSalary, postedAgo } from "@/lib/job-display";
import { JobSources } from "@/components/JobSources";

export default function JobDetailPanel({ job, onClose }: { job: Job | null; onClose?: () => void }) {
  if (!job) return <div className="detail-placeholder"><MousePointer2 size={28} strokeWidth={1.3} /><h2>A closer look, when you’re ready.</h2><p>Select a role to read the full description, review eligibility, and take the next step.</p></div>;
  const salary = formatSalary(job);
  return (
    <article className="job-detail" key={job.id} aria-label="Job details">
      <header className="job-detail-header">
        <div className="detail-company"><span className="company-avatar company-avatar-large" aria-hidden="true">{job.company.trim().slice(0, 1).toUpperCase() || "J"}</span>
          <div><p>{job.company || "Company not listed"}</p><time dateTime={job.created} title={job.created}>Posted {postedAgo(job.created)}</time></div>
          {onClose && <button type="button" className="icon-button" aria-label="Close job details" title="Close job details" onClick={onClose}><X size={18} /></button>}
        </div>
        <h2>{job.title}</h2>
        <div className="detail-facts"><span><MapPin size={15} />{job.location}</span><span><BriefcaseBusiness size={15} />{contractLabel(job.contract_type)}</span>
          {job.remote && <span><Globe2 size={15} />Remote role</span>}
          {salary && <span className="detail-salary"><Banknote size={15} />{salary}</span>}
        </div>
        <div className="job-tags"><span>{job.category}</span></div>
        <div className="detail-apply">
          {job.sources.map((source) => <a key={`${source.provider}:${source.url}`} className="ui-button ui-button-primary" href={source.applyUrl} target="_blank" rel="noopener noreferrer">
            Apply via {source.name}<ArrowUpRight size={17} />
          </a>)}
        </div>
        <p className="apply-note">You’ll continue on the original source website.</p>
      </header>
      <div className="job-detail-body">
        <details className="eligibility-panel">
          <summary><span><Globe2 size={16} />Location & eligibility</span><ChevronDown size={16} /></summary>
          <p>Eligibility: {job.eligibility}</p>
          {job.expires && <p>Listing expiry: <time dateTime={job.expires}>{new Date(job.expires).toLocaleString()}</time></p>}
        </details>
        <section className="job-description" aria-labelledby={`description-${job.id}`}>
          <h3 id={`description-${job.id}`}>About this role</h3>
          <div>{job.description || "Read the original listing for the full role description."}</div>
        </section>
        <div className="detail-provenance"><h3>Original sources</h3><JobSources job={job} /><p>Review the original listing for current availability and application requirements.</p></div>
      </div>
    </article>
  );
}
