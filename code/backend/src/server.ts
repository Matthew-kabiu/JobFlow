import { buildApp } from "./app.js";
import { readConfig } from "./config.js";
import { createJsonFetcher } from "./http.js";
import { createProviders } from "./providers.js";
import { createCurrencyCatalogue } from "./currencies.js";

try {
  const config = readConfig();
  const http = createJsonFetcher();
  const app = await buildApp(createProviders(http, {
    himalayasKey: config.HIMALAYAS_API_KEY,
    reliefwebAppname: config.RELIEFWEB_APPNAME,
  }), { logger: true, currencyCatalogue: createCurrencyCatalogue(http), publicConfig: {
    repoUrl: config.PUBLIC_REPO_URL,
    companyName: config.PUBLIC_COMPANY_NAME,
    companyUrl: config.PUBLIC_COMPANY_URL,
  } });
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => { void app.close().catch(() => { process.exitCode = 1; }); });
  }
  await app.listen({ port: config.BACKEND_PORT, host: config.BACKEND_HOST });
} catch {
  console.error("Backend startup failed. Check configuration and port availability.");
  process.exitCode = 1;
}
