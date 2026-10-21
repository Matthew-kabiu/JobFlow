import { Job } from "@/lib/job-types";
import { MapPin, Clock, Banknote, Building2, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatSalary, postedAgo } from "@/lib/job-display";
import { JobSources } from "@/components/JobSources";

interface JobDetailPanelProps {
  job: Job | null;
  onClose: () => void;
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

const JobDetailPanel = ({ job, onClose }: JobDetailPanelProps) => {
  if (!job) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-xs text-muted-foreground">
          Select a job to see details
        </p>
      </div>
    );
  }

  const salary = formatSalary(job);
  const timeAgo = postedAgo(job.created);

  return (
    <div className="min-w-0 rounded-lg border border-border bg-card">
      <div className="border-b border-border p-4">
        <div className="mb-3 flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground leading-snug">{job.title}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{job.company}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close job details"
            title="Close job details"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground md:hidden"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" strokeWidth={1.5} />
            {job.location}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" strokeWidth={1.5} />
            {timeAgo}
          </span>
          {salary && (
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <Banknote className="h-3 w-3" strokeWidth={1.5} />
              {salary}
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {contractLabel(job.contract_type)}
          </span>
          <span className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {job.category}
          </span>
        </div>
      </div>

      <div className="p-4">
        <p className="mb-3 break-words text-xs text-muted-foreground">Eligibility: {job.eligibility}</p>
        <JobSources job={job} />
        <p className="min-w-0 break-words whitespace-pre-line text-sm leading-relaxed text-foreground">
          {job.description}
        </p>

        <div className="mt-5">
          {job.sources.map((source) => (
            <Button key={`${source.provider}:${source.url}`} asChild
              className="mb-2 w-full bg-foreground text-background hover:bg-foreground/90 font-medium">
              <a href={source.applyUrl} target="_blank" rel="noopener noreferrer">
                Apply via {source.name}<ExternalLink className="ml-2 h-3.5 w-3.5" strokeWidth={1.5} />
              </a>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JobDetailPanel;
