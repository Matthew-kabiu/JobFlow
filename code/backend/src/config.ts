import { z } from "zod";

const publicUrl = z.union([z.literal(""), z.string().url().max(2048).refine((value) => {
  const url = new URL(value);
  return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
})]).default("");

const schema = z.object({
  BACKEND_PORT: z.coerce.number().int().min(1).max(65535),
  BACKEND_HOST: z.string().min(1),
  HIMALAYAS_API_KEY: z.string().optional(),
  RELIEFWEB_APPNAME: z.string().optional(),
  PUBLIC_REPO_URL: publicUrl,
  PUBLIC_COMPANY_NAME: z.string().max(120).default("JobFlow"),
  PUBLIC_COMPANY_URL: publicUrl,
});

export function readConfig(environment = process.env) {
  const parsed = schema.safeParse(environment);
  if (!parsed.success) {
    // Names only: never print environment values or provider credentials.
    throw new Error(`Invalid configuration: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
  }
  return parsed.data;
}
