import type { Job } from "@/lib/job-types";
import { formatDistanceToNow } from "date-fns";

export function formatSalary(job: Job): string | null {
  const { salary_min: min, salary_max: max, salary_currency: currency, salary_period: period } = job;
  if ((min === undefined && max === undefined) || !currency) return null;
  const format = (amount: number) => amount.toLocaleString();
  const range = min !== undefined && max !== undefined
    ? min === max ? `${currency} ${format(min)}` : `${currency} ${format(min)} – ${format(max)}`
    : min !== undefined ? `From ${currency} ${format(min)}` : `Up to ${currency} ${format(max!)}`;
  const periods = { annual: "year", monthly: "month", fortnightly: "fortnight", weekly: "week", hourly: "hour" };
  return `${range}${period ? ` / ${periods[period]}` : " (period unspecified)"}`;
}

export function contractLabel(type: string): string {
  const labels: Record<string, string> = { full_time: "Full-time", part_time: "Part-time", contract: "Contract", permanent: "Permanent", remote: "Remote", internship: "Internship", volunteer: "Volunteer", unspecified: "Type not specified" };
  return labels[type] || type;
}

export function postedAgo(value: string): string {
  return Number.isFinite(Date.parse(value)) ? formatDistanceToNow(new Date(value), { addSuffix: true }) : "Date not provided";
}
