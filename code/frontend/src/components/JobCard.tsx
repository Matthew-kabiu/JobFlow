import { Job } from "@/lib/job-types";
import { MapPin, Clock, Banknote, Building2, ExternalLink, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatSalary, postedAgo } from "@/lib/job-display";
import { JobSources } from "@/components/JobSources";

interface JobCardProps {
  job: Job;
  onSelect: (job: Job) => void;
  onSave: (jobId: string) => void;
  isSelected?: boolean;
}

const contractLabel = (type: string) => {
  const map: Record<string, string> = {
    full_time: "Full-time",
    part_time: "Part-time",
    contract: "Contract",
    permanent: "Permanent",
    remote: "Remote",
  };
  return map[type] || type;
};

const JobCard = ({ job, onSelect, onSave, isSelected }: JobCardProps) => {
  const salary = formatSalary(job);
  const timeAgo = postedAgo(job.created);

  return (
    <article
      onClick={() => onSelect(job)}
      tabIndex={0}
      aria-label={`View ${job.title} at ${job.company}`}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onSelect(job);
        }
      }}
            className={`group cursor-pointer rounded-lg border p-4 transition-all duration-150 focus-visible:outline focus-visible:outline-2 ${
        isSelected
          ? "border-accent/50 bg-accent/5 ring-1 ring-accent/20"
          : "border-border bg-card hover:border-foreground/15 hover:bg-secondary/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="truncate text-[15px] font-semibold text-foreground group-hover:text-accent transition-colors">
              {job.title}
            </h3>
          </div>
          <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3 shrink-0" strokeWidth={1.5} />
              {job.company}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.5} />
              {job.location}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" strokeWidth={1.5} />
              {timeAgo}
            </span>
          </div>
          <p className="mb-3 line-clamp-2 text-[13px] text-muted-foreground leading-relaxed">
            {job.description}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              {contractLabel(job.contract_type)}
            </span>
            <span className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              {job.category}
            </span>
            {salary && (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-foreground">
                <Banknote className="h-3 w-3" strokeWidth={1.5} />
                {salary}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onSave(job.id);
            }}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label="Save job"
            title="Save job (not available yet)"
          >
            <Bookmark className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <a href={job.redirect_url} target="_blank" rel="noopener noreferrer" aria-label="View original listing">
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
            </a>
          </Button>
        </div>
      </div>
      <JobSources job={job} />
    </article>
  );
};

export default JobCard;
