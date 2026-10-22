import type { Job } from "@/lib/job-types";
import { ArrowUpRight, Bookmark, MapPin } from "lucide-react";
import { contractLabel, formatSalary, postedAgo } from "@/lib/job-display";
import { JobSources } from "@/components/JobSources";

interface Props { job: Job; onSelect: (job: Job) => void; onSave: (jobId: string) => void; isSelected?: boolean }

export default function JobCard({ job, onSelect, onSave, isSelected }: Props) {
  const salary = formatSalary(job);
  return (
    <article id={`job-${job.id}`} className={`job-card ${isSelected ? "job-card-selected" : ""}`} tabIndex={0}
      aria-label={`View ${job.title} at ${job.company}`} onClick={() => onSelect(job)}
      onKeyDown={(event) => { if (event.target === event.currentTarget && ["Enter", " "].includes(event.key)) { event.preventDefault(); onSelect(job); } }}>
      <div className="job-card-top">
        <span className="company-avatar" aria-hidden="true">{job.company.trim().slice(0, 1).toUpperCase() || "J"}</span>
        <div className="job-card-company"><span>{job.company || "Company not listed"}</span><time dateTime={job.created} title={job.created}>{postedAgo(job.created)}</time></div>
        <button type="button" className="icon-button" aria-label={`Save ${job.title}`} title="Save job (not available yet)"
          onClick={(event) => { event.stopPropagation(); onSave(job.id); }}><Bookmark size={17} strokeWidth={1.5} /></button>
      </div>
      <h3 title={job.title}>{job.title}</h3>
      <div className="job-card-location"><MapPin size={14} /><span>{job.location}</span>{job.remote && <span className="remote-label">Remote</span>}</div>
      <p className="job-excerpt">{job.description}</p>
      <div className="job-tags"><span>{contractLabel(job.contract_type)}</span><span>{job.category}</span></div>
      <div className="job-card-bottom"><span className="job-salary">{salary || "Salary not listed"}</span>
        <a className="icon-button" href={job.redirect_url} target="_blank" rel="noopener noreferrer" aria-label={`View original listing for ${job.title}`} title="View original listing"
          onClick={(event) => event.stopPropagation()}><ArrowUpRight size={17} /></a>
      </div>
      <JobSources job={job} />
    </article>
  );
}
