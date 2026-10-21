import type { Job } from "@/lib/job-types";
import { formatDistanceToNow } from "date-fns";

export function formatSalary(job: Job): string | null {
  const { salary_min: min, salary_max: max, salary_currency: currency, salary_period: period } = job;
  if ((min === undefined && max === undefined) || !currency) return null;
  const format = (amount: number) => `${currency} ${amount.toLocaleString()}`;
  const range = min !== undefined && max !== undefined ? `${format(min)} – ${format(max)}`
    : min !== undefined ? `From ${format(min)}` : `Up to ${format(max!)}`;
  return `${range}${period ? ` / ${period}` : " (period unspecified)"}`;
}

export function postedAgo(value: string): string {
  return Number.isFinite(Date.parse(value)) ? formatDistanceToNow(new Date(value), { addSuffix: true }) : "Date not provided";
}
