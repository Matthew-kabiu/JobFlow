import { createHash } from "node:crypto";
import type { Job, JobSource, SalaryPeriod } from "../../shared/contracts.js";

export function plainText(value: string): string {
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/(?:p|div|li|h[1-6])>|<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&hellip;/g, "…").trim().slice(0, 8000);
}

export function safeUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

export function category(value: string): string {
  const categories: [RegExp, string][] = [
    [/software|developer|devops|data.science|cybersecurity|\bit\b/i, "IT Jobs"],
    [/engineering/i, "Engineering Jobs"],
    [/health|nurs|medical/i, "Healthcare & Nursing Jobs"],
    [/account|financ/i, "Accounting & Finance Jobs"],
    [/sales|business.development/i, "Sales Jobs"],
    [/marketing|seo/i, "Marketing Jobs"],
    [/human.resources|\bhr\b|recruit/i, "HR & Recruitment Jobs"],
    [/logistics|warehouse|supply.chain/i, "Logistics & Warehouse Jobs"],
    [/teach|education/i, "Teaching Jobs"],
    [/design|creative|editorial|content/i, "Creative & Design Jobs"],
    [/legal/i, "Legal Jobs"],
    [/support|customer/i, "Customer Service Jobs"],
    [/humanitarian|coordination|monitoring|programme/i, "Humanitarian Jobs"],
  ];
  return categories.find(([pattern]) => pattern.test(value))?.[1] ?? "Other Jobs";
}

export function jobType(value: string): string {
  const key = value.toLowerCase().replace(/[ -]/g, "_");
  if (["contractor", "freelance", "consultancy"].includes(key)) return "contract";
  if (["full_time", "part_time", "contract", "permanent", "internship", "volunteer"].includes(key)) return key;
  return "unspecified";
}

export function period(value?: string): SalaryPeriod | undefined {
  if (value === "yearly" || value === "year") return "annual";
  return ["hourly", "weekly", "fortnightly", "monthly", "annual"].includes(value ?? "") ? value as SalaryPeriod : undefined;
}

export function makeJob(job: Omit<Job, "id" | "sources"> & { externalId: string; source: JobSource }): Job | undefined {
  const sourceUrl = safeUrl(job.source.url);
  const applyUrl = safeUrl(job.source.applyUrl);
  if (!sourceUrl || !applyUrl || !job.title.trim() || !Number.isFinite(Date.parse(job.created))) return undefined;
  const { externalId, source, ...data } = job;
  return {
    ...data,
    title: plainText(data.title).slice(0, 300),
    company: plainText(data.company).slice(0, 200),
    description: plainText(data.description),
    redirect_url: applyUrl,
    id: `${source.provider}:${createHash("sha256").update(externalId).digest("hex").slice(0, 24)}`,
    sources: [{ ...source, url: sourceUrl, applyUrl }],
  };
}

/** Conservative dedup: same canonical application URL, title, company AND eligibility. */
export function deduplicate(jobs: Job[]): Job[] {
  const unique = new Map<string, Job>();
  const seenIds = new Set<string>();
  for (const job of jobs) {
    if (seenIds.has(job.id)) continue;
    seenIds.add(job.id);
    const url = new URL(job.redirect_url);
    for (const name of [...url.searchParams.keys()]) if (name.startsWith("utm_")) url.searchParams.delete(name);
    const key = [url.href, job.title.toLowerCase(), job.company.toLowerCase(), job.eligibility.toLowerCase()].join("|");
    const existing = unique.get(key);
    if (!existing) unique.set(key, { ...job, sources: [...job.sources] });
    else for (const source of job.sources) {
      if (!existing.sources.some((entry) => entry.provider === source.provider && entry.url === source.url)) existing.sources.push(source);
    }
  }
  return [...unique.values()];
}
