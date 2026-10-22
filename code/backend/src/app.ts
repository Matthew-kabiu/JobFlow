import Fastify from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { searchSchema } from "./search-schema.js";
import { SearchService } from "./search.js";
import { ROUTES } from "./routes.js";
import type { Provider } from "./providers.js";
import type { CurrencyCatalogue, PublicConfig } from "../../shared/contracts.js";
import { VERSION } from "./version.js";
import { builtInCurrencies } from "./currencies.js";

export async function buildApp(providers: Provider[], options: { logger?: boolean; rateMax?: number; publicConfig?: Omit<PublicConfig, "version">; currencyCatalogue?: () => Promise<CurrencyCatalogue> } = {}) {
  const app = Fastify({
    logger: options.logger ? { serializers: { req: (request: { method: string }) => ({ method: request.method }) } } : false,
    // The API is private behind exactly one Vite/Nginx proxy, never host-published.
    bodyLimit: 16_384, trustProxy: (_address, hop) => hop === 0, requestTimeout: 35_000,
  });
  await app.register(helmet);
  await app.register(rateLimit, {
    global: true, max: options.rateMax ?? 30, timeWindow: "1 minute",
  });
  const service = new SearchService(providers);
  app.setErrorHandler((error, request, reply) => {
    const code = error && typeof error === "object" && "statusCode" in error ? error.statusCode : undefined;
    const status = typeof code === "number" && code >= 400 && code < 500 ? code : 500;
    if (status === 500) request.log.error({ requestId: request.id }, "Request failed");
    reply.code(status).send({ success: false, error: status === 429 ? "RATE_LIMITED" : status < 500 ? "INVALID_REQUEST" : "INTERNAL_ERROR" });
  });
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ success: false, error: "NOT_FOUND" }));
  app.get(ROUTES.health, { config: { rateLimit: false } }, async () => ({ success: true, data: { status: "ok", version: VERSION } }));
  app.get(ROUTES.config, async (_request, reply) => {
    reply.header("Cache-Control", "no-store");
    const values = options.publicConfig;
    // Explicit allowlist: provider keys and other server settings never leave here.
    return { success: true, data: {
      repoUrl: values?.repoUrl ?? "", companyName: values?.companyName ?? "JobFlow",
      companyUrl: values?.companyUrl ?? "", version: VERSION,
    } satisfies PublicConfig };
  });
  app.get(ROUTES.providers, async () => ({ success: true, data: providers.map(({ id, name, enabled }) => ({ id, name, enabled })) }));
  app.get(ROUTES.currencies, async (_request, reply) => {
    reply.header("Cache-Control", "no-store");
    return { success: true, data: options.currencyCatalogue ? await options.currencyCatalogue() : builtInCurrencies() };
  });
  app.post(ROUTES.search, async (request, reply) => {
    const parsed = searchSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ success: false, error: "INVALID_SEARCH" });
    reply.header("Cache-Control", "no-store");
    try {
      return { success: true, data: await service.search(parsed.data) };
    } catch {
      return reply.code(503).send({ success: false, error: "PROVIDERS_UNAVAILABLE" });
    }
  });
  return app;
}
