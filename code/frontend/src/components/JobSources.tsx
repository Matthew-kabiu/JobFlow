import type { Job } from "@/lib/job-types";

export function JobSources({ job }: { job: Job }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>Source:</span>
      {job.sources.map((source) => (
        <a key={`${source.provider}:${source.url}`} href={source.url} target="_blank" rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="underline underline-offset-2 focus-visible:outline focus-visible:outline-2">
          {source.name}
        </a>
      ))}
    </div>
  );
}
