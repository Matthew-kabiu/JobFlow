import { z } from "zod";

const schema = z.object({
  BACKEND_PORT: z.coerce.number().int().min(1).max(65535),
  BACKEND_HOST: z.string().min(1),
  HIMALAYAS_API_KEY: z.string().optional(),
  RELIEFWEB_APPNAME: z.string().optional(),
});

export function readConfig(environment = process.env) {
  const parsed = schema.safeParse(environment);
  if (!parsed.success) {
    // Names only: never print environment values or provider credentials.
    throw new Error(`Invalid configuration: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
  }
  return parsed.data;
}
