import { z } from "zod";

const text = z.string().trim().max(200);
const salary = z.string().regex(/^\d{0,10}$/).default("");

export const searchSchema = z.object({
  keyword: text.default(""),
  location: text.default(""),
  country_code: z.string().regex(/^(all|[a-z]{2})$/).refine((code) => {
    if (code === "all") return true;
    if (!/^[a-z]{2}$/.test(code)) return false;
    const name = new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase());
    return Boolean(name && name !== code.toUpperCase() && code !== "zz");
  }).default("all"),
  category: text.default("all"),
  jobType: z.enum(["all", "full_time", "part_time", "contract", "permanent", "remote", "internship", "volunteer"]).default("all"),
  salaryMin: salary,
  salaryMax: salary,
  salaryCurrency: z.string().regex(/^[A-Z]{3}$/).default("USD"),
  salaryPeriod: z.enum(["hourly", "weekly", "fortnightly", "monthly", "annual"]).default("annual"),
  page: z.number().int().min(1).max(1000).default(1),
  results_per_page: z.number().int().min(1).max(50).default(10),
  sort: z.enum(["relevance", "date", "salary_asc", "salary_desc"]).default("relevance"),
  what_exclude: text.default(""),
}).strict().refine((value) => !value.salaryMin || !value.salaryMax || Number(value.salaryMin) <= Number(value.salaryMax));
